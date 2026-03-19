package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/security"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

// indexing_service.go constants have been moved to AppConfig.Git (WIKI_CHUNK_SIZE/WIKI_CHUNK_OVERLAP)

type IndexingService struct {
	wiki       *WikiService
	llm        *ollama.Client
	logService *ActivityLogService
}

func NewIndexingService() *IndexingService {
	return &IndexingService{
		wiki:       NewWikiService(),
		llm:        ollama.NewEmbedClient(),
		logService: NewActivityLogService(),
	}
}

func (s *IndexingService) IndexAll(ctx context.Context, bu string) error {
	if !security.ValidateSchema(bu) {
		return fmt.Errorf("invalid schema/bu: %q", bu)
	}
	s.logService.Log(bu, "system", "เริ่มดึงข้อมูล ( Re-indexing )", "system", map[string]interface{}{"status": "started"}, "")
	
	entries, err := s.wiki.ListMarkdown(bu)
	if err != nil {
		s.logService.Log(bu, "system", "ดึงข้อมูลไม่สำเร็จ", "system", map[string]interface{}{"status": "failed", "error": err.Error()}, "")
		return fmt.Errorf("list markdown: %w", err)
	}

	count := 0
	for _, e := range entries {
		select {
		case <-ctx.Done():
			s.logService.Log(bu, "system", "ดึงข้อมูลถูกขัดจังหวะ", "system", map[string]interface{}{"status": "interrupted", "processed": count}, "")
			return ctx.Err()
		default:
		}
		if err := s.indexSingle(bu, e.Path); err != nil {
			log.Printf("[indexing] %s (%s): %v", e.Path, bu, err)
		} else {
			count++
		}
	}
	s.logService.Log(bu, "system", "เสร็จสิ้นดึงข้อมูล", "system", map[string]interface{}{"status": "completed", "files": count}, "")
	return nil
}

func (s *IndexingService) indexSingle(bu, path string) error {
	content, err := s.wiki.GetContent(bu, path)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}

	var docID int64
	sqlDoc := fmt.Sprintf("INSERT INTO %s.documents (path, title, source, created_at, updated_at) VALUES (?, ?, 'wiki', now(), now()) ON CONFLICT (path) DO UPDATE SET title = EXCLUDED.title, updated_at = now() RETURNING id", bu)
	err = database.DB.Raw(sqlDoc, content.Path, content.Title).Scan(&docID).Error
	if err != nil {
		return fmt.Errorf("upsert document: %w", err)
	}

	sqlDel := fmt.Sprintf("DELETE FROM %s.document_chunks WHERE document_id = ?", bu)
	if err := database.DB.Exec(sqlDel, docID).Error; err != nil {
		return fmt.Errorf("delete old chunks: %w", err)
	}

	cfg := config.AppConfig.Git
	for i, chunkText := range chunkContent(content.Content, cfg.ChunkSize, cfg.ChunkOverlap) {
		if strings.TrimSpace(chunkText) == "" {
			continue
		}
		enrichedChunk := fmt.Sprintf("เรื่อง: %s\n\n%s", content.Title, chunkText)
		emb, err := s.llm.Embedding(enrichedChunk)
		if err != nil {
			return fmt.Errorf("embedding chunk %d: %w", i, err)
		}
		if len(emb) == 0 {
			log.Printf("[indexing] skip %s chunk %d: empty embedding", path, i)
			continue
		}
		if len(emb) > config.AppConfig.Ollama.VectorDimension {
			emb = emb[:config.AppConfig.Ollama.VectorDimension]
		}
		emb = utils.TruncateEmbedding(emb) // DB uses VECTOR(1536); qwen3-embedding returns 4096
		sqlChunk := fmt.Sprintf("INSERT INTO %s.document_chunks (document_id, chunk_index, content, embedding, created_at) VALUES (?, ?, ?, ?::vector, now())", bu)
		if err := database.DB.Exec(sqlChunk, docID, i, chunkText, utils.Float32SliceToPgVector(emb)).Error; err != nil {
			return fmt.Errorf("insert chunk %d: %w", i, err)
		}
	}
	return nil
}

func chunkContent(text string, chunkSize, overlap int) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	var out []string
	runes := []rune(text)

	if chunkSize <= 0 {
		chunkSize = 500
	}

	start := 0
	for start < len(runes) {
		end := start + chunkSize
		if end > len(runes) {
			end = len(runes)
		}

		// Try to snap 'end' to the last newline within the chunk to avoid cutting mid-sentence.
		// Look back up to 25% of chunkSize.
		actualEnd := end
		if end < len(runes) {
			lookbackLimit := max(start, end-(chunkSize/4))
			for i := end - 1; i >= lookbackLimit; i-- {
				if runes[i] == '\n' {
					actualEnd = i + 1
					break
				}
			}
		}

		chunk := runes[start:actualEnd]
		if len(strings.TrimSpace(string(chunk))) > 0 {
			out = append(out, string(chunk))
		}

		// Move start for the next chunk, subtracting overlap.
		newStart := actualEnd - overlap
		if newStart <= start {
			newStart = actualEnd
		}
		start = newStart

		if actualEnd >= len(runes) {
			break
		}
	}
	return out
}
