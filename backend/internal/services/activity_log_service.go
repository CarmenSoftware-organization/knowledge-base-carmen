package services

import (
	"time"

	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/models"
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

func (s *ActivityLogService) GetLogs(buSlug string, limit int, offset int) ([]models.ActivityLog, error) {
	var logs []models.ActivityLog
	query := database.DB.Model(&models.ActivityLog{}).Preload("BusinessUnit").Order("activity_logs.timestamp DESC")

	if buSlug != "" {
		query = query.Joins("JOIN public.business_units bu ON bu.id = activity_logs.bu_id").Where("bu.slug = ?", buSlug)
	}

	err := query.Select("activity_logs.*").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, err
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
