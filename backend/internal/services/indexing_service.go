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

// maxChunkChars — nomic-embed-text จำกัด context (~8192 tokens) แบ่งทีละชิ้นไม่เกินค่านี้
const maxChunkChars = 4000

// IndexingService ดึง markdown จาก wiki-service แล้วเขียนเข้า Postgres (documents + document_chunks)
type IndexingService struct {
	wiki *WikiService
	llm  *ollama.Client
}

func NewIndexingService() *IndexingService {
	return &IndexingService{
		wiki: NewWikiService(),
		// ใช้ client สำหรับ embeddings โดยเฉพาะ
		llm:  ollama.NewEmbedClient(),
	}
}

// IndexAll รีbuild index ทั้งหมดจากไฟล์ใน wiki-content (แบ่ง chunk ไม่เกิน maxChunkChars ต่อชิ้น)
func (s *IndexingService) IndexAll(ctx context.Context) error {
	entries, err := s.wiki.ListMarkdown()
	if err != nil {
		return fmt.Errorf("list markdown failed: %w", err)
	}
	for _, e := range entries {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := s.indexSingle(e.Path); err != nil {
			log.Printf("[indexing] index %s error: %v", e.Path, err)
		}
	}
	return nil
}

// indexSingle index เอกสารหนึ่งไฟล์
func (s *IndexingService) indexSingle(path string) error {
	content, err := s.wiki.GetContent(path)
	if err != nil {
		return fmt.Errorf("get content failed: %w", err)
	}

	// 1) upsert documents row
	var docID int64
	err = database.DB.
		Raw(`
INSERT INTO documents (path, title, source, created_at, updated_at)
VALUES (?, ?, 'wiki', now(), now())
ON CONFLICT (path) DO UPDATE
SET title = EXCLUDED.title,
    updated_at = now()
RETURNING id
`, content.Path, content.Title).
		Scan(&docID).Error
	if err != nil {
		return fmt.Errorf("upsert document failed: %w", err)
	}

	// 2) แบ่งเป็น chunk ไม่เกิน maxChunkChars เพื่อไม่ให้เกิน context length ของ embed model
	chunks := chunkContent(content.Content)

	// 3) ลบ chunk เดิมของ doc นี้ทิ้ง
	if err := database.DB.Exec("DELETE FROM document_chunks WHERE document_id = ?", docID).Error; err != nil {
		return fmt.Errorf("delete old chunks failed: %w", err)
	}

	for i, chunkText := range chunks {
		if strings.TrimSpace(chunkText) == "" {
			continue
		}
		emb, err := s.llm.Embedding(chunkText)
		if err != nil {
			return fmt.Errorf("embedding failed: %w", err)
		}
		if len(emb) == 0 {
			log.Printf("[indexing] skip %s chunk %d: empty embedding", path, i)
			continue
		}
		embStr := utils.Float32SliceToPgVector(emb)
		if err := database.DB.Exec(`
INSERT INTO document_chunks (document_id, chunk_index, content, embedding, created_at)
VALUES (?, ?, ?, ?::vector, now())
`, docID, i, chunkText, embStr).Error; err != nil {
			return fmt.Errorf("insert chunk failed: %w", err)
		}
	}

	return nil
}

// chunkContent แบ่งข้อความเป็นชิ้นไม่เกิน maxChunkChars พยายามตัดที่ newline
func chunkContent(text string) []string {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil
	}
	var out []string
	runes := []rune(text)
	for len(runes) > 0 {
		n := maxChunkChars
		if n > len(runes) {
			n = len(runes)
		}
		chunk := runes[:n]
		// พยายามตัดที่ newline
		if n < len(runes) {
			lastNewline := -1
			for i := len(chunk) - 1; i >= 0; i-- {
				if chunk[i] == '\n' {
					lastNewline = i
					break
				}
			}
			if lastNewline >= 0 {
				chunk = chunk[:lastNewline+1]
			}
		}
		out = append(out, string(chunk))
		runes = runes[len(chunk):]
	}
	return out
}

