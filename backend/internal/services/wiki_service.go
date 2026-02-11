// logic อ่านไฟล์ markdown จากโฟลเดอร์ backend/wiki-conten
// มีฟังก์ชัน:
// list รายการไฟล์
// อ่านเนื้อหาไฟล์ตาม path
// แปลงข้อมูลให้อยู่ในรูปที่ API ส่งให้ frontend

package services

import (
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/pkg/github"
)

// WikiEntry รายการไฟล์สำหรับ frontend
type WikiEntry struct {
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Tags        []string `json:"tags,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
}

// CategoryEntry หมวดสำหรับ GET /api/wiki/categories (frontend ใช้ slug map กับชื่อ/icon/สีเอง)
type CategoryEntry struct {
	Slug string `json:"slug"`
}

// CategoryItem บทความในหมวด สำหรับ GET /api/wiki/category/:slug
type CategoryItem struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Path        string   `json:"path"`
	Tags        []string `json:"tags,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
}

// WikiContent เนื้อหาไฟล์
type WikiContent struct {
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Tags        []string `json:"tags,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
}

type WikiService struct {
	repoPath   string
	githubClient *github.Client
}

func NewWikiService() *WikiService {
	cfg := config.AppConfig
	return &WikiService{
		repoPath:     cfg.Git.RepoPath,
		githubClient: github.NewClient(),
	}
}

// ListMarkdown คืนรายการ .md จาก local ก่อน ถ้าไม่มีหรือ error จะลองจาก GitHub
func (s *WikiService) ListMarkdown() ([]WikiEntry, error) {
	entries, err := s.listFromLocal()
	if err == nil && len(entries) > 0 {
		return entries, nil
	}
	return s.listFromGitHub()
}

// ListCategories คืนรายการ slug หมวด (segment แรกของ path) เรียง A–Z
func (s *WikiService) ListCategories() ([]CategoryEntry, error) {
	entries, err := s.ListMarkdown()
	if err != nil {
		return nil, err
	}
	seen := make(map[string]struct{})
	for _, e := range entries {
		slug := firstPathSegment(e.Path)
		if slug != "" {
			seen[slug] = struct{}{}
		}
	}
	out := make([]CategoryEntry, 0, len(seen))
	for slug := range seen {
		out = append(out, CategoryEntry{Slug: slug})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Slug < out[j].Slug })
	return out, nil
}

// ListByCategory คืนบทความในหมวด slug (path ขึ้นต้นด้วย slug/ หรือ path == slug)
func (s *WikiService) ListByCategory(slug string) (category string, items []CategoryItem, err error) {
	entries, err := s.ListMarkdown()
	if err != nil {
		return "", nil, err
	}
	prefix := slug + "/"
	var list []CategoryItem
	for _, e := range entries {
		if e.Path == slug || strings.HasPrefix(e.Path, prefix) {
			itemSlug := strings.TrimSuffix(filepath.Base(e.Path), filepath.Ext(e.Path))
			list = append(list, CategoryItem{Slug: itemSlug, Title: e.Title, Path: e.Path})
		}
	}
	sort.Slice(list, func(i, j int) bool { return list[i].Path < list[j].Path })
	return slug, list, nil
}

func firstPathSegment(path string) string {
	path = filepath.ToSlash(path)
	i := strings.Index(path, "/")
	if i < 0 {
		return strings.TrimSuffix(path, filepath.Ext(path))
	}
	return path[:i]
}

func (s *WikiService) listFromLocal() ([]WikiEntry, error) {
	root := filepath.Clean(s.repoPath)
	if root == "" || root == "." {
		root = "./wiki-content"
	}
	var entries []WikiEntry
	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if os.IsNotExist(err) {
				return filepath.SkipDir
			}
			return err
		}
		if info.IsDir() {
			return nil
		}
		if strings.ToLower(filepath.Ext(info.Name())) != ".md" {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)
		title := strings.TrimSuffix(info.Name(), filepath.Ext(info.Name()))
		title = strings.ReplaceAll(title, "-", " ")
		title = strings.ReplaceAll(title, "_", " ")
		entries = append(entries, WikiEntry{Path: rel, Title: title})
		return nil
	})
	if err != nil {
		return nil, err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Path < entries[j].Path })
	return entries, nil
}

func (s *WikiService) listFromGitHub() ([]WikiEntry, error) {
	paths, err := s.githubClient.ListMarkdownFiles()
	if err != nil {
		return nil, err
	}
	entries := make([]WikiEntry, 0, len(paths))
	for _, p := range paths {
		base := filepath.Base(p)
		title := strings.TrimSuffix(base, filepath.Ext(base))
		title = strings.ReplaceAll(title, "-", " ")
		title = strings.ReplaceAll(title, "_", " ")
		entries = append(entries, WikiEntry{Path: p, Title: title})
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Path < entries[j].Path })
	return entries, nil
}

// GetContent อ่านเนื้อหาตาม path (สัมพันธ์) จาก local ก่อน ไม่ได้ค่อยลอง GitHub
func (s *WikiService) GetContent(relPath string) (*WikiContent, error) {
	content, err := s.getContentFromLocal(relPath)
	if err == nil {
		return content, nil
	}
	return s.getContentFromGitHub(relPath)
}

func (s *WikiService) getContentFromLocal(relPath string) (*WikiContent, error) {
	relPath = filepath.Clean(relPath)
	if relPath == ".." || strings.HasPrefix(relPath, ".."+string(os.PathSeparator)) {
		return nil, os.ErrNotExist
	}
	root := filepath.Clean(s.repoPath)
	if root == "" {
		root = "./wiki-content"
	}
	full := filepath.Join(root, filepath.FromSlash(relPath))
	cleanFull := filepath.Clean(full)
	cleanRoot := filepath.Clean(root)
	relCheck, errRel := filepath.Rel(cleanRoot, cleanFull)
	if errRel != nil || strings.HasPrefix(relCheck, "..") {
		return nil, os.ErrNotExist
	}
	data, err := os.ReadFile(cleanFull)
	if err != nil {
		return nil, err
	}
	base := filepath.Base(relPath)
	title := strings.TrimSuffix(base, filepath.Ext(base))
	title = strings.ReplaceAll(title, "-", " ")
	title = strings.ReplaceAll(title, "_", " ")
	return &WikiContent{
		Path:    relPath,
		Title:   title,
		Content: string(data),
	}, nil
}

func (s *WikiService) getContentFromGitHub(relPath string) (*WikiContent, error) {
	fc, err := s.githubClient.GetFileContent(relPath)
	if err != nil {
		return nil, err
	}
	base := filepath.Base(relPath)
	title := strings.TrimSuffix(base, filepath.Ext(base))
	title = strings.ReplaceAll(title, "-", " ")
	title = strings.ReplaceAll(title, "_", " ")
	return &WikiContent{
		Path:    fc.Path,
		Title:   title,
		Content: fc.Content,
	}, nil
}
