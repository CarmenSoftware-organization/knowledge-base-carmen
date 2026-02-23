package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/new-carmen/backend/internal/config"
)

// WikiSyncService manages git clone/pull for the local wiki-content repository.
type WikiSyncService struct {
	repoPath string
	repoURL  string
	branch   string
}

func NewWikiSyncService() *WikiSyncService {
	cfg := config.AppConfig
	repoPath := filepath.Clean(cfg.Git.RepoPath)
	if repoPath == "" || repoPath == "." {
		repoPath = "./wiki-content"
	}
	repoURL := cfg.Git.RepoURL
	if repoURL == "" && cfg.GitHub.Owner != "" && cfg.GitHub.Repo != "" {
		repoURL = fmt.Sprintf("https://github.com/%s/%s.git", cfg.GitHub.Owner, cfg.GitHub.Repo)
	}
	branch := cfg.GitHub.Branch
	if branch == "" {
		branch = "wiki-content"
	}
	return &WikiSyncService{repoPath: repoPath, repoURL: repoURL, branch: branch}
}

// Sync runs git pull if the repo exists, or git clone if it does not.
func (s *WikiSyncService) Sync() error {
	if _, err := os.Stat(filepath.Join(s.repoPath, ".git")); os.IsNotExist(err) {
		return s.clone()
	}
	return s.pull()
}

func (s *WikiSyncService) clone() error {
	if s.repoURL == "" {
		return fmt.Errorf("GIT_REPO_URL or GitHub Owner/Repo not configured")
	}
	cmd := exec.Command("git", "clone", "--depth", "1", "-b", s.branch, s.repoURL, s.repoPath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[wiki-sync] clone failed: %s", out)
		return fmt.Errorf("git clone: %w", err)
	}
	log.Printf("[wiki-sync] cloned %s (branch: %s) → %s", s.repoURL, s.branch, s.repoPath)
	return nil
}

func (s *WikiSyncService) pull() error {
	cmd := exec.Command("git", "pull", "origin", s.branch)
	cmd.Dir = s.repoPath
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[wiki-sync] pull failed: %s", out)
		return fmt.Errorf("git pull: %w", err)
	}
	log.Printf("[wiki-sync] pulled: %s", out)
	return nil
}
