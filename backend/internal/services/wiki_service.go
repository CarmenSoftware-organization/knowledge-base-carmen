package services

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/pkg/github"
)

// ─── Domain Types ────────────────────────────────────────────────────────────

type WikiEntry struct {
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Published   bool     `json:"published,omitempty"`
	Date        string   `json:"date,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	Editor      string   `json:"editor,omitempty"`
	DateCreated string   `json:"dateCreated,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
	Weight      int      `json:"weight,omitempty"`
}

type CategoryEntry struct {
	Slug   string `json:"slug"`
	Title  string `json:"title"`
	Weight int    `json:"weight,omitempty"`
}

type CategoryItem struct {
	Slug        string   `json:"slug"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Published   bool     `json:"published,omitempty"`
	Date        string   `json:"date,omitempty"`
	Path        string   `json:"path"`
	Tags        []string `json:"tags,omitempty"`
	Editor      string   `json:"editor,omitempty"`
	DateCreated string   `json:"dateCreated,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
	Weight      int      `json:"weight,omitempty"`
}

type WikiContent struct {
	Path        string   `json:"path"`
	Title       string   `json:"title"`
	Description string   `json:"description,omitempty"`
	Published   bool     `json:"published,omitempty"`
	Date        string   `json:"date,omitempty"`
	Content     string   `json:"content"`
	Tags        []string `json:"tags,omitempty"`
	Editor      string   `json:"editor,omitempty"`
	DateCreated string   `json:"dateCreated,omitempty"`
	PublishedAt string   `json:"publishedAt,omitempty"`
}

type SearchResult struct {
	WikiEntry
	Snippet string `json:"snippet"`
}

// ─── Service ─────────────────────────────────────────────────────────────────

type WikiService struct {
	repoPath     string
	githubClient *github.Client
}

func NewWikiService() *WikiService {
	return &WikiService{
		repoPath:     config.GetWikiContentPath(),
		githubClient: github.NewClient(),
	}
}

// ─── Frontmatter Helpers ─────────────────────────────────────────────────────

// parseFrontmatter splits YAML frontmatter (between --- delimiters) from the body.
func parseFrontmatter(data []byte) (meta map[string]string, body []byte) {
	meta = make(map[string]string)
	raw := bytes.TrimSpace(data)
	if !bytes.HasPrefix(raw, []byte("---")) {
		return meta, data
	}
	raw = raw[3:]
	idx := bytes.Index(raw, []byte("\n---"))
	if idx < 0 {
		return meta, data
	}
	front := raw[:idx]
	body = bytes.TrimSpace(raw[idx+4:])
	sc := bufio.NewScanner(bytes.NewReader(front))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		colon := strings.Index(line, ":")
		if colon <= 0 {
			continue
		}
		key := strings.TrimSpace(line[:colon])
		val := strings.Trim(strings.TrimSpace(line[colon+1:]), `"'`)
		meta[key] = val
	}
	return meta, body
}

// parseWeight reads "weight" from meta first, then falls back to scanning the
// raw file bytes for a bare "weight: N" line outside the frontmatter block.
// Returns 999 if no valid weight is found (sorts last by default).
func parseWeight(meta map[string]string, data []byte) int {
	if wStr := meta["weight"]; wStr != "" {
		if w, err := strconv.Atoi(wStr); err == nil {
			return w
		}
	}
	sc := bufio.NewScanner(bytes.NewReader(data))
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if strings.HasPrefix(line, "weight:") {
			val := strings.TrimSpace(strings.TrimPrefix(line, "weight:"))
			if w, err := strconv.Atoi(val); err == nil {
				return w
			}
		}
	}
	return 999
}

// stripWeightLines removes bare "weight: N" lines from body content so they
// are not rendered on the frontend.
func stripWeightLines(body []byte) string {
	var lines []string
	sc := bufio.NewScanner(bytes.NewReader(body))
	for sc.Scan() {
		line := sc.Text()
		if !strings.HasPrefix(strings.TrimSpace(line), "weight:") {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, "\n")
}

// slugToTitle converts a filename slug into a human-readable title.
func slugToTitle(name string) string {
	title := strings.TrimSuffix(name, filepath.Ext(name))
	title = strings.ReplaceAll(title, "-", " ")
	return strings.ReplaceAll(title, "_", " ")
}

// metaToTags parses a comma-separated "tags" field from frontmatter.
func metaToTags(meta map[string]string) []string {
	s := meta["tags"]
	if s == "" {
		return nil
	}
	var out []string
	for _, p := range strings.Split(s, ",") {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func metaBool(meta map[string]string, key string) bool {
	v := strings.ToLower(strings.TrimSpace(meta[key]))
	return v == "true" || v == "1"
}

// applyMeta populates a WikiContent from parsed frontmatter and cleaned body.
func applyMeta(out *WikiContent, meta map[string]string, body []byte) {
	if t := meta["title"]; t != "" {
		out.Title = t
	}
	out.Description = meta["description"]
	out.Published = metaBool(meta, "published")
	out.Date = meta["date"]
	out.DateCreated = meta["dateCreated"]
	out.Editor = meta["editor"]
	out.Tags = metaToTags(meta)
	if out.Date != "" {
		out.PublishedAt = out.Date
	} else if out.DateCreated != "" {
		out.PublishedAt = out.DateCreated
	}
	out.Content = stripWeightLines(body)
}

// ─── Public API ──────────────────────────────────────────────────────────────

// ListMarkdown returns all markdown entries, reading from the local repo.
func (s *WikiService) ListMarkdown() ([]WikiEntry, error) {
	entries, err := s.listFromLocal()
	if err != nil {
		fmt.Println("listFromLocal error:", err)
		return []WikiEntry{}, nil
	}
	return entries, nil
}

// ListCategories returns top-level category slugs sorted by weight then title.
func (s *WikiService) ListCategories() ([]CategoryEntry, error) {
	entries, err := s.ListMarkdown()
	if err != nil {
		return nil, err
	}

	type catInfo struct {
		weight int
		title  string
	}
	seen := make(map[string]*catInfo)

	for _, e := range entries {
		parts := strings.Split(e.Path, "/")
		if len(parts) < 2 {
			continue
		}
		slug := parts[0]
		info, exists := seen[slug]
		if !exists {
			info = &catInfo{weight: e.Weight, title: slug}
			seen[slug] = info
		}
		isIndex := strings.HasSuffix(e.Path, "/index.md")
		if isIndex || e.Weight < info.weight {
			info.weight = e.Weight
			info.title = e.Title
		}
	}

	out := make([]CategoryEntry, 0, len(seen))
	for slug, info := range seen {
		out = append(out, CategoryEntry{Slug: slug, Title: info.title, Weight: info.weight})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Weight != out[j].Weight {
			return out[i].Weight < out[j].Weight
		}
		return strings.ToLower(out[i].Title) < strings.ToLower(out[j].Title)
	})
	return out, nil
}

// ListByCategory returns articles within a category, sorted by weight then path.
func (s *WikiService) ListByCategory(slug string) (string, []CategoryItem, error) {
	entries, err := s.ListMarkdown()
	if err != nil {
		return "", nil, err
	}

	var list []CategoryItem
	for _, e := range entries {
		parts := strings.Split(e.Path, "/")
		if len(parts) < 2 || parts[0] != slug {
			continue
		}
		tags := e.Tags
		if tags == nil {
			tags = []string{}
		}
		list = append(list, CategoryItem{
			Slug:        strings.TrimSuffix(filepath.Base(e.Path), filepath.Ext(e.Path)),
			Title:       e.Title,
			Description: e.Description,
			Published:   e.Published,
			Date:        e.Date,
			Path:        e.Path,
			Tags:        tags,
			Editor:      e.Editor,
			DateCreated: e.DateCreated,
			PublishedAt: e.PublishedAt,
			Weight:      e.Weight,
		})
	}
	sort.Slice(list, func(i, j int) bool {
		if list[i].Weight != list[j].Weight {
			return list[i].Weight < list[j].Weight
		}
		return list[i].Path < list[j].Path
	})
	return slug, list, nil
}

// GetContent reads article content from local first, falling back to GitHub.
func (s *WikiService) GetContent(relPath string) (*WikiContent, error) {
	if content, err := s.getContentFromLocal(relPath); err == nil {
		return content, nil
	}
	return s.getContentFromGitHub(relPath)
}

// SearchInContent performs a simple case-insensitive full-text search.
func (s *WikiService) SearchInContent(query string) ([]SearchResult, error) {
	query = strings.ToLower(query)
	entries, err := s.listFromLocal()
	if err != nil {
		return nil, err
	}

	root := filepath.Clean(s.repoPath)
	var results []SearchResult

	for _, entry := range entries {
		data, err := os.ReadFile(filepath.Join(root, filepath.FromSlash(entry.Path)))
		if err != nil {
			continue
		}
		content := string(data)
		contentLower := strings.ToLower(content)
		idx := strings.Index(contentLower, query)
		if idx < 0 {
			continue
		}
		start := max(0, idx-40)
		end := min(len(content), idx+len(query)+60)
		snippet := "..." + strings.ReplaceAll(content[start:end], "\n", " ") + "..."
		results = append(results, SearchResult{WikiEntry: entry, Snippet: snippet})
		if len(results) >= 20 {
			break
		}
	}
	return results, nil
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

const maxFrontmatterRead = 16384

func (s *WikiService) listFromLocal() ([]WikiEntry, error) {
	root := filepath.Clean(s.repoPath)
	var entries []WikiEntry

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if os.IsNotExist(err) {
				return filepath.SkipDir
			}
			return err
		}
		if info.IsDir() || strings.ToLower(filepath.Ext(info.Name())) != ".md" {
			return nil
		}
		rel, err := filepath.Rel(root, path)
		if err != nil {
			return nil
		}
		rel = filepath.ToSlash(rel)

		entry := WikiEntry{Path: rel, Title: slugToTitle(info.Name()), Weight: 999}

		data, err := os.ReadFile(path)
		if err == nil && len(data) > 0 {
			if len(data) > maxFrontmatterRead {
				data = data[:maxFrontmatterRead]
			}
			meta, _ := parseFrontmatter(data)
			if t := meta["title"]; t != "" {
				entry.Title = t
			}
			entry.Description = meta["description"]
			entry.Published = metaBool(meta, "published")
			entry.Date = meta["date"]
			entry.DateCreated = meta["dateCreated"]
			entry.Editor = meta["editor"]
			entry.Tags = metaToTags(meta)
			entry.Weight = parseWeight(meta, data)
			if entry.Date != "" {
				entry.PublishedAt = entry.Date
			} else if entry.DateCreated != "" {
				entry.PublishedAt = entry.DateCreated
			}
		}
		entries = append(entries, entry)
		return nil
	})
	if err != nil {
		return nil, err
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Weight != entries[j].Weight {
			return entries[i].Weight < entries[j].Weight
		}
		return entries[i].Path < entries[j].Path
	})
	return entries, nil
}

func (s *WikiService) getContentFromLocal(relPath string) (*WikiContent, error) {
	relPath = filepath.Clean(relPath)
	if relPath == ".." || strings.HasPrefix(relPath, ".."+string(os.PathSeparator)) {
		return nil, os.ErrNotExist
	}
	root := filepath.Clean(s.repoPath)
	full := filepath.Clean(filepath.Join(root, filepath.FromSlash(relPath)))
	relCheck, err := filepath.Rel(root, full)
	if err != nil || strings.HasPrefix(relCheck, "..") {
		return nil, os.ErrNotExist
	}
	data, err := os.ReadFile(full)
	if err != nil {
		return nil, err
	}
	out := &WikiContent{Path: relPath, Title: slugToTitle(filepath.Base(relPath))}
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
		applyMeta(out, meta, body)
	}
	return out, nil
}

func (s *WikiService) getContentFromGitHub(relPath string) (*WikiContent, error) {
	fc, err := s.githubClient.GetFileContent(relPath)
	if err != nil {
		return nil, err
	}
	out := &WikiContent{Path: fc.Path, Title: slugToTitle(filepath.Base(relPath))}
	data := []byte(fc.Content)
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
		applyMeta(out, meta, body)
	}
	return out, nil
}

