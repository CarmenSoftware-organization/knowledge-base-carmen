// บทความ public ใช้ storage — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	"github.com/new-carmen/backend/internal/models"
	"github.com/new-carmen/backend/internal/storage"
)

func formatID(id uint64) string { return strconv.FormatUint(id, 10) }

type PublicArticleService struct {
	docRepo     *storage.DocumentRepository
	feedbackRepo *storage.ArticleFeedbackRepository
}

func NewPublicArticleService() *PublicArticleService {
	return &PublicArticleService{
		docRepo:     storage.NewDocumentRepository(),
		feedbackRepo: storage.NewArticleFeedbackRepository(),
	}
}

func (s *PublicArticleService) GetArticleByID(id uint64) (*models.ArticlePublicResponse, error) {
	doc, err := s.docRepo.GetPublicByID(id)
	if err != nil {
		return nil, err
	}
	ver, err := s.docRepo.GetLatestVersion(doc.ID)
	if err != nil || ver == nil {
		return &models.ArticlePublicResponse{
			ID:          formatID(doc.ID),
			Title:       doc.Title,
			Content:     "",
			Tags:        parseTags(doc.Tags),
			LastUpdated: doc.UpdatedAt.Format("2006-01-02"),
		}, nil
	}
	content := ver.ContentHTML
	if content == "" {
		content = ver.Content
	}
	return &models.ArticlePublicResponse{
		ID:          formatID(doc.ID),
		Title:       doc.Title,
		Content:     content,
		Tags:        parseTags(doc.Tags),
		LastUpdated: doc.UpdatedAt.Format("2006-01-02"),
	}, nil
}

func parseTags(tags string) []string {
	if tags == "" {
		return nil
	}
	// รองรับ JSON array หรือ comma-separated
	if strings.HasPrefix(strings.TrimSpace(tags), "[") {
		var arr []string
		_ = json.Unmarshal([]byte(tags), &arr)
		return arr
	}
	parts := strings.Split(tags, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

// ExtractTOC จาก content HTML (หา h1, h2, h3)
var tocRegex = regexp.MustCompile(`<h([1-6])[^>]*>([^<]+)</h[1-6]>`)

func (s *PublicArticleService) GetTOC(articleID uint64) ([]models.TOCEntry, error) {
	doc, err := s.docRepo.GetPublicByID(articleID)
	if err != nil {
		return nil, err
	}
	ver, _ := s.docRepo.GetLatestVersion(doc.ID)
	if ver == nil {
		return nil, nil
	}
	content := ver.ContentHTML
	if content == "" {
		content = ver.Content
	}
	matches := tocRegex.FindAllStringSubmatch(content, -1)
	items := make([]models.TOCEntry, 0, len(matches))
	for i, m := range matches {
		if len(m) < 3 {
			continue
		}
		level := 1
		if len(m[1]) > 0 && m[1][0] >= '1' && m[1][0] <= '6' {
			level = int(m[1][0] - '0')
		}
		items = append(items, models.TOCEntry{
			ID:    "toc-" + strconv.Itoa(i+1),
			Title: strings.TrimSpace(m[2]),
			Level: level,
		})
	}
	return items, nil
}

func (s *PublicArticleService) GetRelated(articleID uint64, limit int) ([]models.RelatedArticlePublic, error) {
	doc, err := s.docRepo.GetPublicByID(articleID)
	if err != nil {
		return nil, err
	}
	if limit <= 0 {
		limit = 5
	}
	related, err := s.docRepo.ListPublicRelated(doc.ID, doc.CategoryID, limit)
	if err != nil {
		return nil, err
	}
	out := make([]models.RelatedArticlePublic, 0, len(related))
	for _, d := range related {
		out = append(out, models.RelatedArticlePublic{
			ID:    formatID(d.ID),
			Title: d.Title,
			Path:  "/articles/" + formatID(d.ID),
		})
	}
	return out, nil
}

func (s *PublicArticleService) SubmitFeedback(articleID uint64, helpful bool) error {
	_, err := s.docRepo.GetPublicByID(articleID)
	if err != nil {
		return err
	}
	return s.feedbackRepo.Create(&models.ArticleFeedback{
		DocumentID: articleID,
		Helpful:    helpful,
	})
}

func (s *PublicArticleService) ListPopular(limit, offset int) ([]models.Document, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.docRepo.ListPublic(limit, offset)
}

func (s *PublicArticleService) ListRecommended(limit, offset int) ([]models.Document, int64, error) {
	// เหมือน popular สำหรับตอนนี้ (ลำดับตาม updated_at)
	return s.docRepo.ListPublic(limit, offset)
}
