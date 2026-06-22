package services

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/utils"
)

// RetrievalService holds tuning constants and path-boost rules loaded from
// YAML at startup. It provides hybrid cosine+FTS retrieval over a BU schema.
type RetrievalService struct {
	tuning chatconfig.RetrievalTuning
	rules  []chatconfig.PathRule
}

func defaultRetrievalTuning() chatconfig.RetrievalTuning {
	return chatconfig.RetrievalTuning{TopK: 4, MaxDistance: 0.45, FetchK: 20, RRFK: 60, PathBoostRRF: 0.02}
}

// ConfigDir returns the chat config directory (tuning/intents/path_rules/prompts).
// It respects the CHAT_CONFIG_DIR env override (so tests running from
// internal/services/ can point to "../../config"); otherwise chatconfig.DefaultDir()
// ("config") resolves from the backend root. Single source of truth for every
// chat service + the API handler (no duplicated resolution logic).
func ConfigDir() string {
	if d := strings.TrimSpace(os.Getenv("CHAT_CONFIG_DIR")); d != "" {
		return d
	}
	return chatconfig.DefaultDir()
}

// NewRetrievalService loads tuning + path rules from the config directory.
// On any load error it falls back to hard-coded defaults and logs a warning
// so that the service never crashes the server on startup.
func NewRetrievalService() *RetrievalService {
	dir := ConfigDir()
	tuning := defaultRetrievalTuning()
	if t, err := chatconfig.LoadTuning(dir); err != nil {
		log.Printf("[retrieval] tuning load failed, using defaults: %v", err)
	} else {
		tuning = t.Retrieval
	}
	rules, err := chatconfig.LoadPathRules(dir)
	if err != nil {
		log.Printf("[retrieval] path rules load failed, continuing without boost: %v", err)
		rules = nil
	}
	return &RetrievalService{tuning: tuning, rules: rules}
}

// Retrieve runs a hybrid vector+keyword search for question in the given BU
// schema and returns the top-K chunks after RRF fusion and path boosting.
// Thai queries skip FTS (no useful FTS index for Thai). Keyword errors are
// non-fatal: logged and the result falls back to vector-only.
func (s *RetrievalService) Retrieve(bu, question string, emb []float32) ([]RetrievedChunk, error) {
	embStr := utils.Float32SliceToPgVector(utils.TruncateEmbedding(emb))
	vec, err := s.fetchVector(bu, embStr)
	if err != nil {
		return nil, err
	}
	var kw []ScoredRow
	if !utils.IsThai(question) {
		// Parity with Python: keyword search is best-effort. On failure, log and
		// fall back to vector-only rather than failing the whole retrieval.
		if rows, kErr := s.fetchKeyword(bu, question); kErr != nil {
			log.Printf("[retrieval] keyword search failed, using vector-only: %v", kErr)
		} else {
			kw = rows
		}
	}
	return FuseAndRank(vec, kw, s.tuning, question, s.rules), nil
}

// fetchVector performs a pgvector cosine-distance search.
// SQL parity with carmen-chatbot/backend/llm/retrieval.py:
//   - strict < on cosine distance (not <=)
//   - excludes index.md files
//   - LIMITs to fetch_k
func (s *RetrievalService) fetchVector(bu, embStr string) ([]ScoredRow, error) {
	query := fmt.Sprintf(`
SELECT d.path, d.title, dc.content, (dc.embedding <=> CAST(? AS vector)) AS dist
FROM %s.document_chunks dc
JOIN %s.documents d ON dc.document_id = d.id
WHERE (dc.embedding <=> CAST(? AS vector)) < ?
  AND d.path NOT LIKE '%%index.md'
ORDER BY dist
LIMIT ?
`, bu, bu)
	var rows []ScoredRow
	if err := database.DB.Raw(query, embStr, embStr, s.tuning.MaxDistance, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}

// fetchKeyword performs a full-text search using PostgreSQL's simple dictionary.
// SQL parity with carmen-chatbot/backend/llm/retrieval.py:
//   - NO index.md exclusion (intentionally different from vector query)
//   - ts_rank_cd for ranking
//   - LIMITs to fetch_k
func (s *RetrievalService) fetchKeyword(bu, question string) ([]ScoredRow, error) {
	query := fmt.Sprintf(`
SELECT d.path, d.title, dc.content
FROM %s.document_chunks dc
JOIN %s.documents d ON dc.document_id = d.id
WHERE to_tsvector('simple', dc.content) @@ plainto_tsquery('simple', ?)
ORDER BY ts_rank_cd(to_tsvector('simple', dc.content), plainto_tsquery('simple', ?)) DESC
LIMIT ?
`, bu, bu)
	var rows []ScoredRow
	if err := database.DB.Raw(query, question, question, s.tuning.FetchK).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
