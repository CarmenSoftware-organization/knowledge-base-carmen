package services

import (
	"encoding/json"
	"regexp"
	"strconv"
	"strings"

	domain "github.com/new-carmen/backend/internal/domain"
	"github.com/new-carmen/backend/internal/repositories"
)

func formatID(id uint64) string { return strconv.FormatUint(id, 10) }

type PublicArticleService struct {
	docRepo     *repositories.DocumentRepository
	feedbackRepo *repositories.ArticleFeedbackRepository
}

func NewPublicArticleService() *PublicArticleService {
	return &PublicArticleService{
		docRepo:     repositories.NewDocumentRepository(),
		feedbackRepo: repositories.NewArticleFeedbackRepository(),
	}
}

func (s *PublicArticleService) GetArticleByID(id uint64) (*domain.ArticlePublicResponse, error) {
	doc, err := s.docRepo.GetPublicByID(id)
	if err != nil {
		return nil, err
	}
	ver, err := s.docRepo.GetLatestVersion(doc.ID)
	if err != nil || ver == nil {
		return &domain.ArticlePublicResponse{
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
	return &domain.ArticlePublicResponse{
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

func (s *PublicArticleService) GetTOC(articleID uint64) ([]domain.TOCEntry, error) {
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
	items := make([]domain.TOCEntry, 0, len(matches))
	for i, m := range matches {
		if len(m) < 3 {
			continue
		}
		level := 1
		if len(m[1]) > 0 && m[1][0] >= '1' && m[1][0] <= '6' {
			level = int(m[1][0] - '0')
		}
		items = append(items, domain.TOCEntry{
			ID:    "toc-" + strconv.Itoa(i+1),
			Title: strings.TrimSpace(m[2]),
			Level: level,
		})
	}
	return items, nil
}

func (s *PublicArticleService) GetRelated(articleID uint64, limit int) ([]domain.RelatedArticlePublic, error) {
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
	out := make([]domain.RelatedArticlePublic, 0, len(related))
	for _, d := range related {
		out = append(out, domain.RelatedArticlePublic{
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
	return s.feedbackRepo.Create(&domain.ArticleFeedback{
		DocumentID: articleID,
		Helpful:    helpful,
	})
}

func (s *PublicArticleService) ListPopular(limit, offset int) ([]domain.Document, int64, error) {
	if limit <= 0 {
		limit = 10
	}
	return s.docRepo.ListPublic(limit, offset)
}

func (s *PublicArticleService) ListRecommended(limit, offset int) ([]domain.Document, int64, error) {
	// เหมือน popular สำหรับตอนนี้ (ลำดับตาม updated_at)
	return s.docRepo.ListPublic(limit, offset)
}
