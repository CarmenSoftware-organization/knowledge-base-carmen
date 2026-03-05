package services

import (
	"github.com/new-carmen/backend/internal/models"
)

type QuestionRouterService struct {
}

func NewQuestionRouterService() *QuestionRouterService {
	return &QuestionRouterService{}
}

func (s *QuestionRouterService) RouteQuestion(question string) (*models.RouteResult, error) {
	// Placeholder for actual routing logic (OpenClaw / Make webhook)
	return &models.RouteResult{
		Candidates: []models.RouteCandidate{},
	}, nil
}
