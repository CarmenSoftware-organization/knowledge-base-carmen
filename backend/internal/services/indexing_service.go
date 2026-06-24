package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/utils"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
	"github.com/google/uuid"
)

// indexing_service.go constants have been moved to AppConfig.Git (WIKI_CHUNK_SIZE/WIKI_CHUNK_OVERLAP)

// Embedder interface for different LLM providers
type Embedder interface {
	Embedding(text string) ([]float32, error)
}

type IndexingService struct {
	wiki       *WikiService
	llm        Embedder
	logService *ActivityLogService
}

const defaultEmbeddingTimeout = 60 * time.Second

// NewIndexingService constructs an IndexingService with wiki, embedding, and activity-log clients.
func NewIndexingService() *IndexingService {
	return &IndexingService{
		wiki:       NewWikiService(),
		llm:        openrouter.NewClient(),
		logService: NewActivityLogService(),
	}
}

// IndexAll re-indexes every markdown file for a BU, honoring ctx cancellation and logging progress.
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

// IndexPath indexes a single markdown path for the given BU.
func (s *IndexingService) IndexPath(ctx context.Context, bu, path string) error {
	if !security.ValidateSchema(bu) {
		return fmt.Errorf("invalid schema/bu: %q", bu)
	}
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	return s.indexSingle(bu, path)
}

// indexSingle upserts one document and replaces its chunks with freshly embedded, normalized vectors.
func (s *IndexingService) indexSingle(bu, path string) error {
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return fmt.Errorf("resolve bu id: %w", err)
	}
	if buID == uuid.Nil {
		return fmt.Errorf("unknown bu: %q", bu)
	}

	content, err := s.wiki.GetContent(bu, path)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}

	targetDim, err := s.getVectorDim()
	if err != nil {
		return fmt.Errorf("detect vector dimension: %w", err)
	}

	docID := uuid.Must(uuid.NewV7())
	const sqlDoc = `INSERT INTO public.documents (id, bu_id, path, title, source, created_at, updated_at)
VALUES (?, ?, ?, ?, 'wiki', now(), now())
ON CONFLICT (bu_id, path) DO UPDATE SET title = EXCLUDED.title, updated_at = now()
RETURNING id`
	// Use Row().Scan so the uuid destination's sql.Scanner is honored (GORM's
	// Raw().Scan into a bare [16]byte mis-handles the pgx string value).
	if err := database.DB.Raw(sqlDoc, docID, buID, content.Path, content.Title).Row().Scan(&docID); err != nil {
		return fmt.Errorf("upsert document: %w", err)
	}
	// docID now holds the existing id on conflict, or the new id on insert.

	if err := database.DB.Exec(`DELETE FROM public.document_chunks WHERE doc_id = ?`, docID).Error; err != nil {
		return fmt.Errorf("delete old chunks: %w", err)
	}

	cfg := config.AppConfig.Git
	for i, chunkText := range chunkContent(content.Content, cfg.ChunkSize, cfg.ChunkOverlap) {
		if strings.TrimSpace(chunkText) == "" {
			continue
		}
		emb, err := embeddingWithTimeout(func() ([]float32, error) {
			return s.llm.Embedding(chunkText)
		}, embeddingTimeout())
		if err != nil {
			return fmt.Errorf("embedding chunk %d: %w", i, err)
		}
		if len(emb) == 0 {
			log.Printf("[indexing] skip %s chunk %d: empty embedding", path, i)
			continue
		}

		// 1. Truncate/pad to the target dimension. 2. Normalize for cosine distance.
		emb = utils.TruncateEmbeddingToDim(emb, targetDim)
		emb = utils.NormalizeEmbedding(emb)

		const sqlChunk = `INSERT INTO public.document_chunks (id, bu_id, doc_id, chunk_index, content, embedding, created_at)
VALUES (?, ?, ?, ?, ?, ?::vector, now())`
		if err := database.DB.Exec(sqlChunk, uuid.Must(uuid.NewV7()), buID, docID, i, chunkText, utils.Float32SliceToPgVector(emb)).Error; err != nil {
			return fmt.Errorf("insert chunk %d: %w", i, err)
		}
	}
	return nil
}

// embeddingWithTimeout runs call in a goroutine and returns an error if it exceeds timeout.
func embeddingWithTimeout(call func() ([]float32, error), timeout time.Duration) ([]float32, error) {
	type result struct {
		emb []float32
		err error
	}
	ch := make(chan result, 1)
	go func() {
		emb, err := call()
		ch <- result{emb: emb, err: err}
	}()
	select {
	case out := <-ch:
		return out.emb, out.err
	case <-time.After(timeout):
		return nil, fmt.Errorf("embedding timeout after %s", timeout)
	}
}

// embeddingTimeout returns the embedding timeout from EMBEDDING_TIMEOUT_SECONDS, or the default.
func embeddingTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("EMBEDDING_TIMEOUT_SECONDS"))
	if raw == "" {
		return defaultEmbeddingTimeout
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n <= 0 {
		return defaultEmbeddingTimeout
	}
	return time.Duration(n) * time.Second
}

// getVectorDim reads the document_chunks.embedding column's vector dimension from the DB, falling back to the configured dim.
func (s *IndexingService) getVectorDim() (int, error) {
	var typeStr string
	const sql = `
SELECT format_type(a.atttypid, a.atttypmod)
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname = 'document_chunks'
  AND a.attname = 'embedding'
  AND a.attnum > 0
  AND NOT a.attisdropped
LIMIT 1
`
	if err := database.DB.Raw(sql).Scan(&typeStr).Error; err != nil {
		return 0, err
	}
	typeStr = strings.TrimSpace(strings.ToLower(typeStr))
	if strings.HasPrefix(typeStr, "vector(") && strings.HasSuffix(typeStr, ")") {
		raw := strings.TrimSuffix(strings.TrimPrefix(typeStr, "vector("), ")")
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			return n, nil
		}
	}
	return utils.CurrentEmbeddingDim(), nil
}

// chunkContent splits text into overlapping rune chunks, snapping chunk ends to newlines where possible.
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
