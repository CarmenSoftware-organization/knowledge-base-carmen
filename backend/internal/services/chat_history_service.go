package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/utils"
)

// HashUserID returns a short HMAC-SHA256 token for userID so raw identifiers
// are never stored in the database.  "anonymous" is kept as-is.
func HashUserID(userID, secret string) string {
	lower := strings.ToLower(strings.TrimSpace(userID))
	if lower == "" || lower == "anonymous" {
		return "anonymous"
	}
	key := []byte(secret)
	if len(key) == 0 {
		key = []byte("carmen-privacy-default")
	}
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(userID))
	return "u:" + hex.EncodeToString(mac.Sum(nil))[:16]
}

type ChatHistoryService struct{}

func NewChatHistoryService() *ChatHistoryService {
	return &ChatHistoryService{}
}

// CachedAnswer holds answer and sources from chat history
type CachedAnswer struct {
	Answer  string
	Sources []models.ChatSource
}

// FindSimilar returns cached answer if a similar question exists within threshold
func (s *ChatHistoryService) FindSimilar(buID uuid.UUID, questionEmbedding []float32, threshold float64) (*CachedAnswer, bool) {
	if len(questionEmbedding) == 0 {
		return nil, false
	}
	questionEmbedding = utils.TruncateEmbedding(questionEmbedding)
	embStr := utils.Float32SliceToPgVector(questionEmbedding)

	var row struct {
		Answer  string
		Sources []byte
	}
	sql := `
		SELECT answer, sources::text
		FROM public.chat_history
		WHERE bu_id = ?
		  AND (question_embedding <-> ?::vector) < ?
		ORDER BY (question_embedding <-> ?::vector) ASC
		LIMIT 1
	`
	err := database.DB.Raw(sql, buID, embStr, threshold, embStr).Scan(&row).Error
	if err != nil || row.Answer == "" {
		return nil, false
	}

	var sources []models.ChatSource
	if len(row.Sources) > 0 {
		_ = json.Unmarshal(row.Sources, &sources)
	}
	return &CachedAnswer{
		Answer:  row.Answer,
		Sources: sources,
	}, true
}

// Save stores a new Q&A with embedding for future similarity search.
// userID is hashed before insertion so raw identifiers are never persisted.
func (s *ChatHistoryService) Save(buID uuid.UUID, userID, question, answer string, sources interface{}, embedding []float32) error {
	_, err := s.SaveWithID(buID, userID, question, answer, sources, embedding)
	return err
}

// SaveWithID stores Q&A and returns the inserted public.chat_history.id (UUID v7).
func (s *ChatHistoryService) SaveWithID(buID uuid.UUID, userID, question, answer string, sources interface{}, embedding []float32) (uuid.UUID, error) {
	if len(embedding) == 0 {
		return uuid.Nil, fmt.Errorf("embedding required to save chat history")
	}
	// PII-at-rest: mask the stored question on every save path (/ask, /stream,
	// record-history). The LLM still receives the original text; only the DB copy
	// is masked. MaskPII is idempotent, so a pre-masked caller is unaffected.
	question = utils.MaskPII(question)
	embedding = utils.TruncateEmbedding(embedding)
	embStr := utils.Float32SliceToPgVector(embedding)

	secret := ""
	if config.AppConfig != nil {
		secret = config.AppConfig.Server.PrivacySecret
	}
	hashedID := HashUserID(userID, secret)

	id := uuid.Must(uuid.NewV7())
	const sql = `
		INSERT INTO public.chat_history (id, bu_id, user_id, question, answer, sources, question_embedding, created_at)
		VALUES (?, ?, ?, ?, ?, ?::jsonb, ?::vector, now())`
	if err := database.DB.Exec(sql, id, buID, hashedID, question, answer, sourcesToJSON(sources), embStr).Error; err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

// sourcesToJSON converts sources to JSON string for jsonb column
func sourcesToJSON(sources interface{}) string {
	if sources == nil {
		return "[]"
	}
	b, err := json.Marshal(sources)
	if err != nil {
		return "[]"
	}
	return string(b)
}

// UpdateFeedback sets metrics.feedback for one message owned by (buID, userID).
func (s *ChatHistoryService) UpdateFeedback(buID uuid.UUID, messageID uuid.UUID, userID string, score int) error {
	const q = `UPDATE public.chat_history
SET metrics = jsonb_set(COALESCE(metrics, '{}'), '{feedback}', to_jsonb(?::int))
WHERE id = ? AND bu_id = ? AND user_id = ?`
	res := database.DB.Exec(q, score, messageID, buID, userID)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("no chat_history row for id=%s bu=%s user matched", messageID, buID)
	}
	return nil
}

// GetBUIDFromSlug returns business_units.id for the given slug, or uuid.Nil if not found.
func (s *ChatHistoryService) GetBUIDFromSlug(slug string) (uuid.UUID, error) {
	return database.BUIDForSlug(slug)
}

// ListEntry for API response
type ListEntry struct {
	ID        uuid.UUID           `json:"id"`
	Question  string              `json:"question"`
	Answer    string              `json:"answer"`
	Sources   []models.ChatSource `json:"sources"`
	UserID    string              `json:"user_id"`
	CreatedAt string              `json:"created_at"`
}

// List returns chat history for a BU (for verification/debug)
func (s *ChatHistoryService) List(buID uuid.UUID, limit, offset int) ([]ListEntry, int64, error) {
	var total int64
	database.DB.Raw("SELECT COUNT(*) FROM public.chat_history WHERE bu_id = ?", buID).Scan(&total)

	var rows []struct {
		ID        uuid.UUID
		Question  string
		Answer    string
		Sources   []byte
		UserID    string
		CreatedAt string
	}
	sql := `
		SELECT id, question, answer, sources::text, user_id, created_at::text
		FROM public.chat_history
		WHERE bu_id = ?
		ORDER BY created_at DESC
		LIMIT ? OFFSET ?
	`
	if err := database.DB.Raw(sql, buID, limit, offset).Scan(&rows).Error; err != nil {
		return nil, 0, err
	}

	out := make([]ListEntry, 0, len(rows))
	for _, r := range rows {
		var sources []models.ChatSource
		if len(r.Sources) > 0 {
			_ = json.Unmarshal(r.Sources, &sources)
		}
		out = append(out, ListEntry{
			ID:        r.ID,
			Question:  r.Question,
			Answer:    r.Answer,
			Sources:   sources,
			UserID:    r.UserID,
			CreatedAt: r.CreatedAt,
		})
	}
	return out, total, nil
}
