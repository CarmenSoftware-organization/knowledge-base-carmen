// ค้นหา + chat ใช้ storage — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"fmt"
	"strings"

	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/storage"
	"github.com/new-carmen/backend/pkg/chromadb"
	"github.com/new-carmen/backend/pkg/ollama"
)

type SearchService struct {
	docRepo  *storage.DocumentRepository
	ollama   *ollama.Client
	chromadb *chromadb.Client
}

func NewSearchService() *SearchService {
	return &SearchService{
		docRepo:  storage.NewDocumentRepository(),
		ollama:   ollama.NewClient(),
		chromadb: chromadb.NewClient(),
	}
}

func (s *SearchService) AnalyzeQuestionClarity(question string) (*models.ClarificationResponse, error) {
	// Analyze question using Ollama
	analysis, err := s.ollama.AnalyzeQuestionClarity(question)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze question: %w", err)
	}

	if !analysis.IsAmbiguous {
		return &models.ClarificationResponse{
			NeedsClarification: false,
		}, nil
	}

	// Search for related concepts in ChromaDB
	queryResp, err := s.chromadb.Query(question, 5)
	if err != nil {
		// If ChromaDB fails, still return clarification needed
		candidates := analysis.Candidates
		if len(candidates) == 0 {
			candidates = []string{"Please provide more details"}
		}

		clarifyingQuestion, _ := s.ollama.GenerateClarifyingQuestion(question, candidates)

		return &models.ClarificationResponse{
			NeedsClarification: true,
			ClarifyingQuestion: clarifyingQuestion,
			Options:            candidates,
		}, nil
	}

	// Extract candidates from ChromaDB results
	var candidates []string
	if len(queryResp.Documents) > 0 && len(queryResp.Documents[0]) > 0 {
		for i, doc := range queryResp.Documents[0] {
			if i < 5 {
				// Extract title or first sentence as candidate
				lines := strings.Split(doc, "\n")
				if len(lines) > 0 {
					candidate := strings.TrimSpace(lines[0])
					if len(candidate) > 100 {
						candidate = candidate[:100] + "..."
					}
					candidates = append(candidates, candidate)
				}
			}
		}
	}

	if len(candidates) == 0 {
		candidates = analysis.Candidates
		if len(candidates) == 0 {
			candidates = []string{"Please provide more details"}
		}
	}

	// Generate clarifying question
	clarifyingQuestion, err := s.ollama.GenerateClarifyingQuestion(question, candidates)
	if err != nil {
		clarifyingQuestion = "Could you please clarify what you're looking for?"
	}

	return &models.ClarificationResponse{
		NeedsClarification: true,
		ClarifyingQuestion: clarifyingQuestion,
		Options:            candidates,
	}, nil
}

func (s *SearchService) Search(query string, limit, offset int) (*models.SearchResponse, error) {
	// Hybrid search: Keyword + Semantic
	// 1. Keyword search in PostgreSQL
	keywordResults, total, err := s.docRepo.Search(query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("keyword search failed: %w", err)
	}

	// 2. Semantic search in ChromaDB
	chromaResults, err := s.chromadb.Query(query, limit)
	if err != nil {
		// If ChromaDB fails, return keyword results only
		results := s.formatSearchResults(keywordResults, total, query)
		return &models.SearchResponse{
			Results: results,
			Total:   int(total),
			Query:   query,
		}, nil
	}

	// 3. Combine and rank results
	results := s.combineAndRankResults(keywordResults, chromaResults, query)

	return &models.SearchResponse{
		Results: results,
		Total:   int(total),
		Query:   query,
	}, nil
}

func (s *SearchService) SearchWithContext(query string, limit int) (string, error) {
	// Retrieve context from ChromaDB
	queryResp, err := s.chromadb.Query(query, limit)
	if err != nil {
		return "", fmt.Errorf("failed to retrieve context: %w", err)
	}

	// Build context string
	var contextBuilder strings.Builder
	if len(queryResp.Documents) > 0 {
		for i, doc := range queryResp.Documents[0] {
			if i < limit {
				contextBuilder.WriteString(fmt.Sprintf("\n--- Context %d ---\n", i+1))
				contextBuilder.WriteString(doc)
				contextBuilder.WriteString("\n")
			}
		}
	}

	context := contextBuilder.String()

	// Generate answer using Ollama
	answer, err := s.ollama.GenerateAnswer(context, query)
	if err != nil {
		return "", fmt.Errorf("failed to generate answer: %w", err)
	}

	return answer, nil
}

func (s *SearchService) formatSearchResults(documents []models.Document, total int64, query string) []models.SearchResult {
	results := make([]models.SearchResult, 0, len(documents))

	for _, doc := range documents {
		// Get latest version for snippet
		latestVersion, _ := s.docRepo.GetLatestVersion(doc.ID)
		snippet := ""
		if latestVersion != nil {
			// Extract snippet (first 200 chars)
			content := latestVersion.Content
			if len(content) > 200 {
				snippet = content[:200] + "..."
			} else {
				snippet = content
			}
		}

		version := 0
		if latestVersion != nil {
			version = latestVersion.Version
		}

		results = append(results, models.SearchResult{
			DocumentID: doc.ID,
			Title:      doc.Title,
			Snippet:    snippet,
			Relevance:  0.5, // Default relevance for keyword search
			Version:    version,
			CreatedAt:  doc.CreatedAt.Format("2006-01-02 15:04:05"),
		})
	}

	return results
}

func (s *SearchService) combineAndRankResults(
	keywordResults []models.Document,
	chromaResults *chromadb.QueryResponse,
	query string,
) []models.SearchResult {
	// Create a map of document IDs from keyword results
	keywordMap := make(map[uint64]models.Document)
	for _, doc := range keywordResults {
		keywordMap[doc.ID] = doc
	}

	results := make([]models.SearchResult, 0)

	// Process ChromaDB results (higher relevance)
	if len(chromaResults.Documents) > 0 && len(chromaResults.Distances) > 0 {
		for i, docText := range chromaResults.Documents[0] {
			if i >= len(chromaResults.Distances[0]) {
				break
			}

			distance := chromaResults.Distances[0][i]
			relevance := 1.0 - distance // Convert distance to relevance

			// Try to match with keyword results or create new result
			// Extract title from document text
			lines := strings.Split(docText, "\n")
			title := "Document"
			if len(lines) > 0 {
				title = strings.TrimSpace(lines[0])
			}

			// Create snippet
			snippet := docText
			if len(snippet) > 200 {
				snippet = snippet[:200] + "..."
			}

			results = append(results, models.SearchResult{
				DocumentID: 0, // Will be matched later if possible
				Title:      title,
				Snippet:    snippet,
				Relevance:  relevance,
				Version:    0,
				CreatedAt:  "",
			})
		}
	}

	// Add keyword results that weren't in ChromaDB results
	for _, doc := range keywordResults {
		found := false
		for i := range results {
			if results[i].DocumentID == doc.ID {
				found = true
				break
			}
		}
		if !found {
			latestVersion, _ := s.docRepo.GetLatestVersion(doc.ID)
			snippet := ""
			if latestVersion != nil {
				content := latestVersion.Content
				if len(content) > 200 {
					snippet = content[:200] + "..."
				} else {
					snippet = content
				}
			}

			version := 0
			if latestVersion != nil {
				version = latestVersion.Version
			}

			results = append(results, models.SearchResult{
				DocumentID: doc.ID,
				Title:      doc.Title,
				Snippet:    snippet,
				Relevance:  0.3, // Lower relevance for keyword-only results
				Version:    version,
				CreatedAt:  doc.CreatedAt.Format("2006-01-02 15:04:05"),
			})
		}
	}

	return results
}

// --- Public API (SRS format) ---

// SearchPublic ค้นหาเฉพาะ public documents คืนค่าเป็น SearchPublicResponse
func (s *SearchService) SearchPublic(query string, limit, offset int) (*models.SearchPublicResponse, error) {
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	docs, _, err := s.docRepo.SearchPublic(query, limit, offset)
	if err != nil {
		return nil, err
	}
	results := make([]models.SearchResultPublic, 0, len(docs))
	for i, doc := range docs {
		latest, _ := s.docRepo.GetLatestVersion(doc.ID)
		snippet := ""
		if latest != nil {
			snippet = latest.Content
			if len(snippet) > 200 {
				snippet = snippet[:200] + "..."
			}
		}
		category := ""
		if doc.Category != nil {
			category = doc.Category.Name
		}
		score := 0.9 - float64(i)*0.05
		if score < 0.3 {
			score = 0.3
		}
		results = append(results, models.SearchResultPublic{
			ID:       fmt.Sprintf("%d", doc.ID),
			Title:    doc.Title,
			Snippet:  snippet,
			Category: category,
			Path:     "/articles/" + fmt.Sprintf("%d", doc.ID),
			Score:    score,
		})
	}
	return &models.SearchPublicResponse{Results: results}, nil
}

// GetPopularSearches คืนรายการคำค้นยอดนิยม (ตอนนี้ใช้ค่าตายตัว)
func (s *SearchService) GetPopularSearches() []string {
	return []string{
		"Getting Started",
		"การติดตั้ง",
		"API",
		"Environment",
	}
}

// GetSuggest คืนคำแนะนำจาก title ของเอกสาร public
func (s *SearchService) GetSuggest(q string, limit int) ([]string, error) {
	if limit <= 0 {
		limit = 10
	}
	titles, err := s.docRepo.ListPublicTitles(limit * 3)
	if err != nil {
		return nil, err
	}
	q = strings.ToLower(strings.TrimSpace(q))
	var out []string
	for _, t := range titles {
		if len(out) >= limit {
			break
		}
		if q == "" || strings.Contains(strings.ToLower(t.Title), q) {
			out = append(out, t.Title)
		}
	}
	return out, nil
}

// ChatAsk สำหรับ POST /api/chat/ask - ตอบคำถามจาก Knowledge Base + คืน sources
func (s *SearchService) ChatAsk(question string) (answer string, sources []models.ChatSource, err error) {
	// ดึง context จาก search (ChromaDB + keyword)
	answer, err = s.SearchWithContext(question, 5)
	if err != nil {
		return "", nil, err
	}
	// หา documents ที่เกี่ยวข้องเป็น sources
	docs, _, _ := s.docRepo.SearchPublic(question, 5, 0)
	sources = make([]models.ChatSource, 0, len(docs))
	for _, d := range docs {
		sources = append(sources, models.ChatSource{
			ArticleID: fmt.Sprintf("%d", d.ID),
			Title:     d.Title,
		})
	}
	return answer, sources, nil
}
