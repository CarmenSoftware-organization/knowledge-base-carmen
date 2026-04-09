package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"strings"

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
func (s *ChatHistoryService) FindSimilar(buID uint, questionEmbedding []float32, threshold float64) (*CachedAnswer, bool) {
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
func (s *ChatHistoryService) Save(buID uint, userID, question, answer string, sources interface{}, embedding []float32) error {
	_, err := s.SaveWithID(buID, userID, question, answer, sources, embedding)
	return err
}

// SaveWithID stores Q&A and returns inserted public.chat_history.id.
func (s *ChatHistoryService) SaveWithID(buID uint, userID, question, answer string, sources interface{}, embedding []float32) (int64, error) {
	if len(embedding) == 0 {
		return 0, fmt.Errorf("embedding required to save chat history")
	}
	embedding = utils.TruncateEmbedding(embedding)
	embStr := utils.Float32SliceToPgVector(embedding)

	secret := ""
	if config.AppConfig != nil {
		secret = config.AppConfig.Server.PrivacySecret
	}
	hashedID := HashUserID(userID, secret)

	sql := `
		INSERT INTO public.chat_history (bu_id, user_id, question, answer, sources, question_embedding, created_at)
		VALUES (?, ?, ?, ?, ?::jsonb, ?::vector, now())
		RETURNING id
	`
	var id int64
	if err := database.DB.Raw(sql, buID, hashedID, question, answer, sourcesToJSON(sources), embStr).Scan(&id).Error; err != nil {
		return 0, err
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

// GetBUIDFromSlug returns business_units.id for the given slug, or 0 if not found
func (s *ChatHistoryService) GetBUIDFromSlug(slug string) (uint, error) {
	var id uint
	err := database.DB.Raw("SELECT id FROM public.business_units WHERE slug = ? LIMIT 1", slug).Scan(&id).Error
	if err != nil {
		return 0, err
	}
	return id, nil
}

// ListEntry for API response
type ListEntry struct {
	ID         int64              `json:"id"`
	Question   string             `json:"question"`
	Answer     string             `json:"answer"`
	Sources    []models.ChatSource `json:"sources"`
	UserID     string             `json:"user_id"`
	CreatedAt  string             `json:"created_at"`
}

// List returns chat history for a BU (for verification/debug)
func (s *ChatHistoryService) List(buID uint, limit, offset int) ([]ListEntry, int64, error) {
	var total int64
	database.DB.Raw("SELECT COUNT(*) FROM public.chat_history WHERE bu_id = ?", buID).Scan(&total)

	var rows []struct {
		ID        int64
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
