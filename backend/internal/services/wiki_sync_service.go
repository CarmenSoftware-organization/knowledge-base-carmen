// logic ที่คุยกับ Git (ผ่านคำสั่ง git) ถ้ายังไม่มี repo → clone
// ถ้ามีแล้ว → git pull
// ใช้โดย:
// wiki_handler (POST /api/wiki/sync)
// github_webhook_handler (ตอนโดน webhook

package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/new-carmen/backend/internal/config"
)

// WikiSyncService รัน git pull (หรือ clone ถ้ายังไม่มี) ให้โฟลเดอร์ wiki-content อัปเดต
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
	return &WikiSyncService{
		repoPath: repoPath,
		repoURL:  repoURL,
		branch:   branch,
	}
}

// Sync ทำ git pull origin <branch> ใน repoPath ถ้ายังไม่มีโฟลเดอร์หรือไม่ใช่ git repo จะลอง clone ก่อน
func (s *WikiSyncService) Sync() error {
	if _, err := os.Stat(filepath.Join(s.repoPath, ".git")); os.IsNotExist(err) {
		return s.clone()
	}
	return s.pull()
}

func (s *WikiSyncService) clone() error {
	if s.repoURL == "" {
		return fmt.Errorf("GIT_REPO_URL or GitHub Owner/Repo not set")
	}
	// clone ลงโฟลเดอร์ repoPath (git จะสร้างโฟลเดอร์ให้) — อย่าใช้ cd repoPath แล้ว clone "."
	// ถ้า repoPath มีอยู่แล้วและไม่ว่าง git จะ error; ควรใช้ path ว่าง เช่น ./wiki-content
	cmd := exec.Command("git", "clone", "--depth", "1", "-b", s.branch, s.repoURL, s.repoPath)
	out, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[wiki-sync] clone failed: %s", out)
		return fmt.Errorf("git clone: %w", err)
	}
	log.Printf("[wiki-sync] cloned %s (branch %s) to %s", s.repoURL, s.branch, s.repoPath)
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
	log.Printf("[wiki-sync] pulled %s", string(out))
	return nil
}
