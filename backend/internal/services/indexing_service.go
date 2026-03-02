package services

import (
	"context"
	"fmt"
	"log"
	"strings"

	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/ollama"
)

// maxChunkChars limits each chunk to stay within nomic-embed-text's context window (~8192 tokens).
const maxChunkChars = 4000

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


func (s *IndexingService) IndexAll(ctx context.Context) error {
	entries, err := s.wiki.ListMarkdown()
	if err != nil {
		return fmt.Errorf("list markdown: %w", err)
	}
	for _, e := range entries {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		if err := s.indexSingle(e.Path); err != nil {
			log.Printf("[indexing] %s: %v", e.Path, err)
		}
	}
	return nil
}

func (s *IndexingService) indexSingle(path string) error {
	content, err := s.wiki.GetContent(path)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}

	var docID int64
	err = database.DB.Raw(`
INSERT INTO documents (path, title, source, created_at, updated_at)
VALUES (?, ?, 'wiki', now(), now())
ON CONFLICT (path) DO UPDATE
SET title = EXCLUDED.title, updated_at = now()
RETURNING id
`, content.Path, content.Title).Scan(&docID).Error
	if err != nil {
		return fmt.Errorf("upsert document: %w", err)
	}

	if err := database.DB.Exec("DELETE FROM document_chunks WHERE document_id = ?", docID).Error; err != nil {
		return fmt.Errorf("delete old chunks: %w", err)
	}

	for i, chunkText := range chunkContent(content.Content) {
		if strings.TrimSpace(chunkText) == "" {
			continue
		}
		emb, err := s.llm.Embedding(chunkText)
		if err != nil {
			return fmt.Errorf("embedding chunk %d: %w", i, err)
		}
		if len(emb) == 0 {
			log.Printf("[indexing] skip %s chunk %d: empty embedding", path, i)
			continue
		}
		if err := database.DB.Exec(`
INSERT INTO document_chunks (document_id, chunk_index, content, embedding, created_at)
VALUES (?, ?, ?, ?::vector, now())
`, docID, i, chunkText, utils.Float32SliceToPgVector(emb)).Error; err != nil {
			return fmt.Errorf("insert chunk %d: %w", i, err)
		}
	}
	return nil
}


func chunkContent(text string) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	var out []string
	runes := []rune(text)
	for len(runes) > 0 {
		n := min(maxChunkChars, len(runes))
		chunk := runes[:n]
		if n < len(runes) {
			for i := len(chunk) - 1; i >= 0; i-- {
				if chunk[i] == '\n' {
					chunk = chunk[:i+1]
					break
				}
			}
		}
		out = append(out, string(chunk))
		runes = runes[len(chunk):]
	}
	return out
}
