package services

import (
	"fmt"
	"log"
	"path/filepath"
	"strings"

	domain "github.com/new-carmen/backend/internal/domain"
	"github.com/new-carmen/backend/pkg/chromadb"
	"github.com/new-carmen/backend/pkg/github"
)

type IndexingService struct {
	githubClient  *github.Client
	chromaClient  *chromadb.Client
	aiService     *AIService
	docService    *DocumentService
}

func NewIndexingService() *IndexingService {
	return &IndexingService{
		githubClient: github.NewClient(),
		chromaClient: chromadb.NewClient(),
		aiService:    NewAIService(),
		docService:   NewDocumentService(),
	}
}

// LoadContentFromGitHub loads markdown files from GitHub repo
func (s *IndexingService) LoadContentFromGitHub() ([]*github.FileContent, error) {
	// List all markdown files
	filePaths, err := s.githubClient.ListMarkdownFiles()
	if err != nil {
		return nil, fmt.Errorf("failed to list markdown files: %w", err)
	}

	var files []*github.FileContent
	for _, path := range filePaths {
		content, err := s.githubClient.GetFileContent(path)
		if err != nil {
			log.Printf("Failed to load file %s: %v", path, err)
			continue
		}
		files = append(files, content)
	}

	return files, nil
}

// IndexDocument creates embedding and stores in ChromaDB
func (s *IndexingService) IndexDocument(documentID uint64, content string, metadata map[string]interface{}) error {
	// Create embedding (placeholder - needs actual implementation)
	// embedding, err := s.aiService.GenerateEmbeddingForDocument(content)
	// if err != nil {
	// 	return fmt.Errorf("failed to create embedding: %w", err)
	// }

	// For now, we'll use the content directly as the document
	// In production, you'd convert to embedding first
	id := fmt.Sprintf("doc_%d", documentID)
	
	err := s.chromaClient.Add(
		[]string{id},
		[]string{content},
		[]map[string]interface{}{metadata},
	)

	if err != nil {
		return fmt.Errorf("failed to add to ChromaDB: %w", err)
	}

	return nil
}

// IncrementalIndexing detects new/changed files and indexes them
func (s *IndexingService) IncrementalIndexing() error {
	// This would track file hashes or modification times
	// and only index new or changed files
	// Implementation depends on your tracking mechanism
	
	files, err := s.LoadContentFromGitHub()
	if err != nil {
		return err
	}

	for _, file := range files {
		metadata := map[string]interface{}{
			"path": file.Path,
			"type": file.Type,
		}

		// Index each file
		// In a real implementation, you'd check if already indexed
		if err := s.IndexDocument(0, file.Content, metadata); err != nil {
			log.Printf("Failed to index file %s: %v", file.Path, err)
		}
	}

	return nil
}

// ProcessGitHubPush ประมวลผล GitHub push event แบบ incremental
// - ดูเฉพาะไฟล์ .md ที่ถูก added / modified
// - โหลด content ผ่าน GitHub API
// - ส่งเข้า IndexDocument (ChromaDB)
func (s *IndexingService) ProcessGitHubPush(payload *domain.GitHubPushPayload) error {
	if payload == nil {
		return fmt.Errorf("nil payload")
	}

	// รวม path ที่ถูกเพิ่ม/แก้ไข
	changed := map[string]struct{}{}
	for _, c := range payload.Commits {
		for _, p := range c.Added {
			changed[p] = struct{}{}
		}
		for _, p := range c.Modified {
			changed[p] = struct{}{}
		}
	}

	if len(changed) == 0 {
		log.Println("[indexing] GitHub push: no added/modified files, nothing to index")
		return nil
	}

	log.Printf("[indexing] GitHub push: %d changed files", len(changed))

	for path := range changed {
		// สนใจเฉพาะ Markdown
		if ext := strings.ToLower(filepath.Ext(path)); ext != ".md" {
			continue
		}

		file, err := s.githubClient.GetFileContent(path)
		if err != nil {
			log.Printf("[indexing] failed to load %s: %v", path, err)
			continue
		}

		metadata := map[string]interface{}{
			"path": file.Path,
			"type": "markdown",
		}

		if err := s.IndexDocument(0, file.Content, metadata); err != nil {
			log.Printf("[indexing] failed to index %s: %v", path, err)
		} else {
			log.Printf("[indexing] indexed %s", path)
		}
	}

	return nil
}
