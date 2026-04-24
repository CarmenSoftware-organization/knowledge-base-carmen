package services

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/security"
)

type WikiSyncService struct {
	repoPath   string
	repoURL    string
	branch     string
	wiki       *WikiService
	logService *ActivityLogService
}

func NewWikiSyncService() *WikiSyncService {
	cfg := config.AppConfig
	repoPath := filepath.Clean(cfg.Git.RepoPath)
	if repoPath == "" || repoPath == "." {
		repoPath = config.DefaultRepoPath()
	}
	repoURL := cfg.Git.RepoURL
	if repoURL == "" && cfg.GitHub.Owner != "" && cfg.GitHub.Repo != "" {
		base := strings.TrimRight(cfg.GitHub.RepoBaseURL, "/")
		if base == "" {
			base = config.DefaultGitHubRepoBaseURL()
		}
		repoURL = fmt.Sprintf("%s/%s/%s.git", base, cfg.GitHub.Owner, cfg.GitHub.Repo)
	}
	branch := cfg.Git.SyncBranch
	if branch == "" {
		branch = config.DefaultGitSyncBranch()
	}
	return &WikiSyncService{
		repoPath:   repoPath,
		repoURL:    repoURL,
		branch:     branch,
		wiki:       NewWikiService(),
		logService: NewActivityLogService(),
	}
}

// Sync runs git pull if the repo exists, or git clone if it does not.
func (s *WikiSyncService) Sync() error {
	if _, err := os.Stat(filepath.Join(s.repoPath, ".git")); os.IsNotExist(err) {
		if err := s.clone(); err != nil {
			return err
		}
	} else {
		if err := s.pull(); err != nil {
			return err
		}
	}

	if report, err := s.BuildAuditReport(); err != nil {
		log.Printf("[wiki-sync] audit failed: %v", err)
	} else {
		log.Printf("[wiki-sync] audit summary: bu=%d source_md=%d indexed_docs=%d missing=%d extra=%d",
			report.Summary.TotalBUs,
			report.Summary.TotalSourceMarkdownFiles,
			report.Summary.TotalIndexedDocuments,
			report.Summary.TotalMissingInIndex,
			report.Summary.TotalExtraInIndex,
		)
	}
	return nil
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
	s.logService.Log("", "system", "ซิงค์ Wiki (จาก GitHub)", "system", map[string]interface{}{"status": "cloned", "repo": s.repoURL}, "")
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
	s.logService.Log("", "system", "ซิงค์ Wiki (จาก GitHub)", "system", map[string]interface{}{"status": "pulled", "output": out}, "")
	return nil
}

type BUSyncAudit struct {
	BU                  string   `json:"bu"`
	SourceRoot          string   `json:"source_root"`
	IndexTableExists    bool     `json:"index_table_exists"`
	SourceMarkdownFiles int      `json:"source_markdown_files"`
	IndexedDocuments    int      `json:"indexed_documents"`
	MissingInIndex      []string `json:"missing_in_index"`
	ExtraInIndex        []string `json:"extra_in_index"`
}

type SyncAuditSummary struct {
	TotalBUs                 int `json:"total_bus"`
	TotalSourceMarkdownFiles int `json:"total_source_markdown_files"`
	TotalIndexedDocuments    int `json:"total_indexed_documents"`
	TotalMissingInIndex      int `json:"total_missing_in_index"`
	TotalExtraInIndex        int `json:"total_extra_in_index"`
}

type SyncAuditReport struct {
	GeneratedAt time.Time        `json:"generated_at"`
	RepoPath    string           `json:"repo_path"`
	Branch      string           `json:"branch"`
	Summary     SyncAuditSummary `json:"summary"`
	Items       []BUSyncAudit    `json:"items"`
}

// BuildAuditReport compares markdown files in contents with indexed DB documents for each BU.
func (s *WikiSyncService) BuildAuditReport() (*SyncAuditReport, error) {
	bus, err := s.discoverBUs()
	if err != nil {
		return nil, err
	}

	report := &SyncAuditReport{
		GeneratedAt: time.Now().UTC(),
		RepoPath:    s.repoPath,
		Branch:      s.branch,
		Items:       make([]BUSyncAudit, 0, len(bus)),
	}

	for _, bu := range bus {
		sourceRoot := s.wiki.getRepoPath(bu)
		sourcePaths, err := listMarkdownRelativePaths(sourceRoot)
		if err != nil {
			return nil, fmt.Errorf("scan source markdown for bu %q: %w", bu, err)
		}
		indexedPaths, tableExists, err := listIndexedDocumentPaths(bu)
		if err != nil {
			return nil, fmt.Errorf("query indexed documents for bu %q: %w", bu, err)
		}

		missing, extra := diffStringSets(sourcePaths, indexedPaths)
		item := BUSyncAudit{
			BU:                  bu,
			SourceRoot:          sourceRoot,
			IndexTableExists:    tableExists,
			SourceMarkdownFiles: len(sourcePaths),
			IndexedDocuments:    len(indexedPaths),
			MissingInIndex:      missing,
			ExtraInIndex:        extra,
		}
		report.Items = append(report.Items, item)

		report.Summary.TotalBUs++
		report.Summary.TotalSourceMarkdownFiles += len(sourcePaths)
		report.Summary.TotalIndexedDocuments += len(indexedPaths)
		report.Summary.TotalMissingInIndex += len(missing)
		report.Summary.TotalExtraInIndex += len(extra)

		s.logService.Log(bu, "system", "ตรวจสอบการซิงค์วิกิ", "system", map[string]interface{}{
			"source_markdown_files": len(sourcePaths),
			"indexed_documents":     len(indexedPaths),
			"missing_in_index":      len(missing),
			"extra_in_index":        len(extra),
		}, "")
		log.Printf("[wiki-sync][audit] bu=%s source=%d indexed=%d missing=%d extra=%d",
			bu, len(sourcePaths), len(indexedPaths), len(missing), len(extra))
	}

	return report, nil
}

func (s *WikiSyncService) discoverBUs() ([]string, error) {
	candidates := make(map[string]struct{})
	repo := filepath.Clean(s.repoPath)

	addFromParent := func(parent string) {
		entries, err := os.ReadDir(parent)
		if err != nil {
			return
		}
		for _, ent := range entries {
			if !ent.IsDir() {
				continue
			}
			name := strings.TrimSpace(ent.Name())
			if name == "" || !security.ValidateSchema(name) {
				continue
			}
			candidates[name] = struct{}{}
		}
	}

	addFromParent(filepath.Join(repo, "contents"))

	out := make([]string, 0, len(candidates))
	for bu := range candidates {
		out = append(out, bu)
	}
	sort.Strings(out)
	return out, nil
}

func listMarkdownRelativePaths(root string) ([]string, error) {
	root = filepath.Clean(root)
	st, err := os.Stat(root)
	if err != nil {
		return nil, err
	}
	if !st.IsDir() {
		return nil, fmt.Errorf("not a directory: %s", root)
	}

	var out []string
	err = filepath.Walk(root, func(path string, info os.FileInfo, walkErr error) error {
		if walkErr != nil {
			return walkErr
		}
		if info.IsDir() || strings.ToLower(filepath.Ext(info.Name())) != ".md" {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		out = append(out, filepath.ToSlash(rel))
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Strings(out)
	return out, nil
}

func listIndexedDocumentPaths(bu string) ([]string, bool, error) {
	if !security.ValidateSchema(bu) {
		return nil, false, fmt.Errorf("invalid bu schema: %s", bu)
	}

	var exists bool
	existsSQL := fmt.Sprintf("SELECT to_regclass('%s.documents') IS NOT NULL", bu)
	if err := database.DB.Raw(existsSQL).Scan(&exists).Error; err != nil {
		return nil, false, err
	}
	if !exists {
		return []string{}, false, nil
	}

	var out []string
	sql := fmt.Sprintf("SELECT path FROM %s.documents WHERE source = 'wiki' ORDER BY path", bu)
	if err := database.DB.Raw(sql).Scan(&out).Error; err != nil {
		return nil, true, err
	}
	return out, true, nil
}

func diffStringSets(source []string, indexed []string) (missing []string, extra []string) {
	sourceSet := make(map[string]struct{}, len(source))
	indexedSet := make(map[string]struct{}, len(indexed))
	for _, s := range source {
		sourceSet[s] = struct{}{}
	}
	for _, s := range indexed {
		indexedSet[s] = struct{}{}
	}
	for _, s := range source {
		if _, ok := indexedSet[s]; !ok {
			missing = append(missing, s)
		}
	}
	for _, s := range indexed {
		if _, ok := sourceSet[s]; !ok {
			extra = append(extra, s)
		}
	}
	sort.Strings(missing)
	sort.Strings(extra)
	return missing, extra
}
