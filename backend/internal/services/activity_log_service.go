package services

import (
	"time"

	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
	"gorm.io/gorm"
)

type ActivityLogService struct{}

func NewActivityLogService() *ActivityLogService {
	return &ActivityLogService{}
}

// Log records a new activity in the system
func (s *ActivityLogService) Log(buSlug string, userID string, action string, category string, details interface{}, userAgent string) error {
	var buID *uint
	if buSlug != "" {
		var bu models.BusinessUnit
		if err := database.DB.Where("slug = ?", buSlug).First(&bu).Error; err == nil {
			id := bu.ID
			buID = &id
		}
	}

	logEntry := models.ActivityLog{
		BUID:      buID,
		UserID:    userID,
		Action:    action,
		Category:  category,
		Details:   details,
		UserAgent: userAgent,
		Timestamp: time.Now(),
	}

	return database.DB.Create(&logEntry).Error
}

// Admin actions (same as frontend) - for source filter
var adminActions = []string{
	"ซิงค์ Wiki (จาก GitHub)",
	"เริ่มดึงข้อมูล ( Re-indexing )",
	"ดึงข้อมูลไม่สำเร็จ",
	"ดึงข้อมูลถูกขัดจังหวะ",
	"เสร็จสิ้นดึงข้อมูล",
	"สร้างไฟล์วิกิใหม่",
	"อัปเดตไฟล์วิกิ",
	"ลบไฟล์วิกิ",
}

func (s *ActivityLogService) GetLogs(buSlug string, limit int, offset int) ([]models.ActivityLog, error) {
	logs, _, err := s.GetLogsWithFilter(buSlug, "all", limit, offset)
	return logs, err
}

// GetLogsWithFilter returns logs with optional source filter (all|user|admin) and total count
func (s *ActivityLogService) GetLogsWithFilter(buSlug string, source string, limit int, offset int) ([]models.ActivityLog, int64, error) {
	var logs []models.ActivityLog

	buildQuery := func() *gorm.DB {
		q := database.DB.Model(&models.ActivityLog{})
		if buSlug != "" {
			q = q.Joins("JOIN public.business_units bu ON bu.id = activity_logs.bu_id").Where("bu.slug = ?", buSlug)
		}
		switch source {
		case "admin":
			q = q.Where("activity_logs.user_id = ? OR activity_logs.action IN ?", "system", adminActions)
		case "user":
			q = q.Where("activity_logs.user_id != ? AND activity_logs.action NOT IN ?", "system", adminActions)
		}
		return q
	}

	// Count total
	var total int64
	if err := buildQuery().Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Fetch page
	query := buildQuery().Preload("BusinessUnit").Order("activity_logs.timestamp DESC").Select("activity_logs.*")
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}
	err := query.Find(&logs).Error
	return logs, total, err
}

// SummaryEntry represents a summary of activities for a specific period
type SummaryEntry struct {
	Period   string `json:"period"`
	Action   string `json:"action"`
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// GetMonthlySummary returns a summary of activities grouped by month
func (s *ActivityLogService) GetMonthlySummary(buSlug string, year int) ([]SummaryEntry, error) {
	var results []SummaryEntry
	
	query := database.DB.Table("public.activity_logs").
		Select("TO_CHAR(timestamp, 'YYYY-MM') as period, action, category, count(*) as count").
		Group("period, action, category").
		Order("period DESC")

	if buSlug != "" {
		query = query.Joins("JOIN public.business_units bu ON bu.id = activity_logs.bu_id").Where("bu.slug = ?", buSlug)
	}
	
	if year > 0 {
		query = query.Where("EXTRACT(YEAR FROM timestamp) = ?", year)
	}

	err := query.Scan(&results).Error
	return results, err
}

// GetYearlySummary returns a summary of activities grouped by year
func (s *ActivityLogService) GetYearlySummary(buSlug string) ([]SummaryEntry, error) {
	var results []SummaryEntry
	
	query := database.DB.Table("public.activity_logs").
		Select("EXTRACT(YEAR FROM timestamp)::text as period, action, category, count(*) as count").
		Group("period, action, category").
		Order("period DESC")

	if buSlug != "" {
		query = query.Joins("JOIN public.business_units bu ON bu.id = activity_logs.bu_id").Where("bu.slug = ?", buSlug)
	}

	err := query.Scan(&results).Error
	return results, err
}
