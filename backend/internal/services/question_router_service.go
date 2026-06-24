package services

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
)

type QuestionRouterService struct {
}

// NewQuestionRouterService constructs an empty QuestionRouterService.
func NewQuestionRouterService() *QuestionRouterService {
	return &QuestionRouterService{}
}

// RouteQuestion is a placeholder router that always returns an empty candidate list.
func (s *QuestionRouterService) RouteQuestion(question string) (*models.RouteResult, error) {
	// Placeholder: no external router wired; returns no candidates.
	return &models.RouteResult{
		Candidates: []models.RouteCandidate{},
	}, nil
}
