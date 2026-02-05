// Ollama + ChromaDB ใช้โดย indexing, search — ยังไม่ใช้ (เปิดเมื่อมี DB)
package services

import (
	"github.com/new-carmen/backend/pkg/chromadb"
	"github.com/new-carmen/backend/pkg/ollama"
)

type AIService struct {
	ollama   *ollama.Client
	chromadb *chromadb.Client
}

func NewAIService() *AIService {
	return &AIService{
		ollama:   ollama.NewClient(),
		chromadb: chromadb.NewClient(),
	}
}

func (s *AIService) CreateEmbedding(text string) ([]float32, error) {
	
	return nil, nil 
}

func (s *AIService) GenerateEmbeddingForDocument(content string) ([]float32, error) {
	return s.CreateEmbedding(content)
}
