package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

// indexing_service.go constants have been moved to AppConfig.Git (WIKI_CHUNK_SIZE/WIKI_CHUNK_OVERLAP)

type IndexingService struct {
	wiki *WikiService
	llm  *ollama.Client
}

func NewIndexingService() *IndexingService {
	return &IndexingService{
		wiki: NewWikiService(),
		llm:  ollama.NewEmbedClient(),
	}
}

func (s *IndexingService) IndexAll(ctx context.Context, bu string) error {
	entries, err := s.wiki.ListMarkdown(bu)
	if err != nil {
		return fmt.Errorf("list markdown: %w", err)
	}
	for _, e := range entries {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		if err := s.indexSingle(bu, e.Path); err != nil {
			log.Printf("[indexing] %s (%s): %v", e.Path, bu, err)
		}
	}
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
