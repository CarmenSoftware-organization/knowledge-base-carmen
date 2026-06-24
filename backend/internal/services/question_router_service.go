package services

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
)

type QuestionRouterService struct {
}

func NewQuestionRouterService() *QuestionRouterService {
	return &QuestionRouterService{}
}

func (s *QuestionRouterService) RouteQuestion(question string) (*models.RouteResult, error) {
	// Placeholder: no external router wired; returns no candidates.
	return &models.RouteResult{
		Candidates: []models.RouteCandidate{},
	}, nil
}
