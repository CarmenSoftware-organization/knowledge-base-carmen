package services

import (
	"bufio"
	"bytes"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	"github.com/new-carmen/backend/internal/database"
	"github.com/new-carmen/backend/internal/nlp"
	"github.com/new-carmen/backend/internal/security"
	"github.com/new-carmen/backend/internal/utils"
	"github.com/new-carmen/backend/pkg/github"
	"github.com/new-carmen/backend/pkg/openrouter"
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
	githubClient *github.Client
	embedLLM     *openrouter.Client
}

func NewWikiService() *WikiService {
	return &WikiService{
		githubClient: github.NewClient(),
		embedLLM:     openrouter.NewClient(),
	}
}

// getRepoPath returns the filesystem path for a BU's wiki content.
func (s *WikiService) getRepoPath(bu string) string {
	cfg := config.AppConfig.Git
	if !security.ValidateSchema(bu) {
		bu = cfg.DefaultBU
	}
	if bu == cfg.DefaultBU {
		// WIKI_CONTENT_PATH override ได้ถ้าต้องการ
		if cfg.ContentPath != "" {
			p := config.NormalizePath(cfg.ContentPath)
			if abs, err := filepath.Abs(p); err == nil {
				if info, err := os.Stat(abs); err == nil && info.IsDir() {
					return abs
				}
			}
		}
		dirs := cfg.CarmenContentDirs
		for _, p := range dirs {
			if abs, err := filepath.Abs(p); err == nil {
				if info, err := os.Stat(abs); err == nil && info.IsDir() {
					return abs
				}
			}
		}
		if discovered := config.DiscoverCarmenWikiRoot(); discovered != "" {
			return discovered
		}
		fallback := "."
		if len(dirs) > 0 {
			fallback = dirs[0]
		}
		abs, _ := filepath.Abs(fallback)
		return abs
	}
	repoBase := cfg.RepoPath
	if repoBase == "" || repoBase == "." {
		repoBase = config.DefaultRepoPath()
	}
	return filepath.Join(filepath.Clean(repoBase), bu)
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

func slugToTitle(name string) string {
	title := strings.TrimSuffix(name, filepath.Ext(name))
	title = strings.ReplaceAll(title, "-", " ")
	return strings.ReplaceAll(title, "_", " ")
}

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

func (s *WikiService) ListMarkdown(bu string) ([]WikiEntry, error) {
	entries, err := s.listFromLocal(bu)
	if err != nil {
		fmt.Println("listFromLocal error:", err)
		return []WikiEntry{}, nil
	}
	return entries, nil
}

func (s *WikiService) ListCategories(bu string) ([]CategoryEntry, error) {
	entries, err := s.ListMarkdown(bu)
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

func (s *WikiService) ListByCategory(bu, slug string) (string, []CategoryItem, error) {
	entries, err := s.ListMarkdown(bu)
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

// GetContent reads article content for a BU from local first, falling back to GitHub.
func (s *WikiService) GetContent(bu, relPath string) (*WikiContent, error) {
	if content, err := s.getContentFromLocal(bu, relPath); err == nil {
		return content, nil
	}

	cfg := config.AppConfig.Git
	gitPath := relPath
	if bu == cfg.DefaultBU && cfg.CarmenGitPath != "" {
		gitPath = strings.TrimSuffix(cfg.CarmenGitPath, "/") + "/" + relPath
	} else if bu != "" {
		gitPath = bu + "/" + relPath
	}
	return s.getContentFromGitHub(gitPath)
}

func removeDots(s string) string {
	re := regexp.MustCompile(`(\p{L})\.`)
	return re.ReplaceAllString(s, "$1")
}

// SearchInContent performs a semantic search using pgvector in a BU's schema.
func (s *WikiService) SearchInContent(bu, query string) ([]SearchResult, error) {
	emb, err := s.embedLLM.Embedding(query)
	if err != nil {
		return nil, fmt.Errorf("create embedding: %w", err)
	}
	emb = utils.TruncateEmbedding(emb)
	embStr := utils.Float32SliceToPgVector(emb)

	cfg := config.AppConfig.WikiSearch
	sql := fmt.Sprintf(`
        WITH vector_results AS (
            SELECT
                d.path,
                d.title,
                dc.content AS snippet,
                (dc.embedding <-> ?::vector) AS vector_dist,
                CASE
                    WHEN d.title ILIKE ? THEN 0.5
                    WHEN dc.content ILIKE ? THEN 0.3
                    ELSE 0
                END AS text_boost
            FROM %s.document_chunks dc
            JOIN %s.documents d ON dc.document_id = d.id
            WHERE (dc.embedding <=> ?::vector) < ?
        )
        SELECT path, title, snippet,
               (vector_dist - text_boost) AS final_score
        FROM vector_results
        ORDER BY final_score ASC
        LIMIT ?
    `, bu, bu)

	query = removeDots(query)

	likeQuery := "%" + query + "%"

	var rows []struct {
		Path       string
		Title      string
		Snippet    string
		FinalScore float64
	}
	if err := database.DB.Raw(sql,
		embStr,    // vector compare (SELECT)
		likeQuery, // title boost
		likeQuery, // content boost
		embStr,    // WHERE vector compare
		cfg.VectorDistanceMax,
		cfg.SearchLimit,
	).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("hybrid search: %w", err)
	}

	seen := make(map[string]bool)
	var results []SearchResult
	for _, r := range rows {
		if seen[r.Path] {
			continue
		}
		seen[r.Path] = true
		snippet := strings.ReplaceAll(r.Snippet, "\n", " ")
		snippet = smartTrim(snippet, config.AppConfig.WikiSearch.SnippetMaxLen)
		results = append(results, SearchResult{
			WikiEntry: WikiEntry{Path: r.Path, Title: r.Title},
			Snippet:   snippet,
		})
	}
	return results, nil
}

// SearchByKeyword performs keyword search (ILIKE) with NLP-expanded terms.
// Used alongside semantic search to improve recall for domain terms.
func (s *WikiService) SearchByKeyword(bu, query string) ([]SearchResult, error) {
	if !security.ValidateSchema(bu) {
		return nil, fmt.Errorf("invalid schema/bu: %q", bu)
	}
	terms := nlp.ExpandQuery(query)
	if len(terms) == 0 {
		return nil, nil
	}

	// Build (d.title ILIKE ? OR dc.content ILIKE ?) OR ... for each term
	var conditions []string
	var args []interface{}
	for _, t := range terms {
		pattern := "%" + t + "%"
		conditions = append(conditions, "(d.title ILIKE ? OR dc.content ILIKE ?)")
		args = append(args, pattern, pattern)
	}
	whereClause := "(" + strings.Join(conditions, " OR ") + ")"

	searchLimit := config.AppConfig.WikiSearch.SearchLimit
	sql := fmt.Sprintf(`
		SELECT DISTINCT ON (d.path) d.path, d.title, dc.content AS snippet
		FROM %s.document_chunks dc
		JOIN %s.documents d ON dc.document_id = d.id
		WHERE %s
		ORDER BY d.path, CASE WHEN d.title ILIKE ? THEN 0 ELSE 1 END
		LIMIT ?
	`, bu, bu, whereClause)

	// Add primary term for ORDER BY (use first term) and limit
	args = append(args, "%"+terms[0]+"%", searchLimit)

	var rows []struct {
		Path    string
		Title   string
		Snippet string
	}
	if err := database.DB.Raw(sql, args...).Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("keyword search: %w", err)
	}

	var results []SearchResult
	snippetMaxLen := config.AppConfig.WikiSearch.SnippetMaxLen
	for _, r := range rows {
		snippet := strings.ReplaceAll(r.Snippet, "\n", " ")
		snippet = smartTrim(snippet, snippetMaxLen)
		results = append(results, SearchResult{
			WikiEntry: WikiEntry{Path: r.Path, Title: r.Title},
			Snippet:   snippet,
		})
	}
	return results, nil
}

func smartTrim(s string, max int) string {
	runes := []rune(s)
	if len(runes) <= max {
		return s
	}
	trimmed := string(runes[:max])
	if idx := strings.LastIndex(trimmed, " "); idx > max-30 {
		trimmed = trimmed[:idx]
	}
	return trimmed + "..."
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

const maxFrontmatterRead = 16384

func (s *WikiService) listFromLocal(bu string) ([]WikiEntry, error) {
	root := s.getRepoPath(bu)
	if !filepath.IsAbs(root) {
		absRoot, err := filepath.Abs(root)
		if err == nil {
			root = absRoot
		}
	}
	root = filepath.Clean(root)

	var entries []WikiEntry

	err := filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			if os.IsNotExist(err) {
				return nil
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

func (s *WikiService) GetLocalAssetPath(bu, relPath string) (string, error) {
	relPath = filepath.Clean(filepath.FromSlash(relPath))
	if relPath == "." || relPath == ".." || strings.HasPrefix(relPath, ".."+string(os.PathSeparator)) {
		return "", os.ErrNotExist
	}
	root := s.getRepoPath(bu)
	full := filepath.Clean(filepath.Join(root, relPath))
	relCheck, err := filepath.Rel(filepath.Clean(root), full)
	if err != nil || strings.HasPrefix(relCheck, "..") {
		return "", os.ErrNotExist
	}
	return full, nil
}

func (s *WikiService) getContentFromLocal(bu, relPath string) (*WikiContent, error) {
	relPath = filepath.Clean(relPath)
	if relPath == ".." || strings.HasPrefix(relPath, ".."+string(os.PathSeparator)) {
		return nil, os.ErrNotExist
	}
	root := filepath.Clean(s.getRepoPath(bu))
	full := filepath.Clean(filepath.Join(root, filepath.FromSlash(relPath)))
	relCheck, err := filepath.Rel(root, full)
	if err != nil || strings.HasPrefix(relCheck, "..") {
		return nil, os.ErrNotExist
	}
	data, err := os.ReadFile(full)
	if err != nil {
		return nil, err
	}
	out := &WikiContent{Path: filepath.ToSlash(relPath), Title: slugToTitle(filepath.Base(relPath))}
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
		applyMeta(out, meta, body)
	} else {
		// Files without frontmatter (e.g. external changelog imports) still need content.
		out.Content = stripWeightLines(body)
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
