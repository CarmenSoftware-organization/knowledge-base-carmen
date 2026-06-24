package services

import (
	"bufio"
	"bytes"
	"errors"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/nlp"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/security"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/utils"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/github"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
	"github.com/google/uuid"
	"golang.org/x/text/unicode/norm"
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

type SidebarCategory struct {
	Slug     string         `json:"slug"`
	Title    string         `json:"title"`
	Weight   int            `json:"weight,omitempty"`
	Articles []CategoryItem `json:"articles"`
}

// ─── Service ─────────────────────────────────────────────────────────────────

type WikiService struct {
	githubClient *github.Client
	embedLLM     *openrouter.Client
}

// NewWikiService constructs a WikiService with GitHub and embedding clients.
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
	repoBase := cfg.RepoPath
	if repoBase == "" || repoBase == "." {
		repoBase = config.DefaultRepoPath()
	}
	base := filepath.Clean(repoBase)
	directPath := filepath.Join(base, bu)
	if st, err := os.Stat(directPath); err == nil && st.IsDir() {
		return directPath
	}

	// Compatibility path for monorepo layout where BU content lives under "contents/<bu>".
	contentsPath := filepath.Join(base, "contents", bu)
	if st, err := os.Stat(contentsPath); err == nil && st.IsDir() {
		return contentsPath
	}

	// Compatibility path for nested training center layout: "contents/training_center/<bu>".
	trainingCenterPath := filepath.Join(base, "contents", "training_center", bu)
	if st, err := os.Stat(trainingCenterPath); err == nil && st.IsDir() {
		return trainingCenterPath
	}

	// Fall back to direct path so the caller gets an explicit, useful path-not-found error.
	return directPath
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

// parseWeight reads the sidebar "weight" from frontmatter meta or the raw body, defaulting to 999.
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

// stripWeightLines removes any "weight:" lines from the body content.
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

// slugToTitle derives a human title from a filename by dropping the extension and replacing dashes/underscores with spaces.
func slugToTitle(name string) string {
	title := strings.TrimSuffix(name, filepath.Ext(name))
	title = strings.ReplaceAll(title, "-", " ")
	return strings.ReplaceAll(title, "_", " ")
}

// metaToTags splits the comma-separated frontmatter "tags" value into a trimmed slice.
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

// metaBool reports whether the frontmatter value at key is "true" or "1".
func metaBool(meta map[string]string, key string) bool {
	v := strings.ToLower(strings.TrimSpace(meta[key]))
	return v == "true" || v == "1"
}

// applyMeta populates a WikiContent's fields from parsed frontmatter meta and body.
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

// ListMarkdown returns all markdown entries for a BU read from local content.
func (s *WikiService) ListMarkdown(bu string) ([]WikiEntry, error) {
	return s.listFromLocal(bu)
}

// ListCategories returns the top-level categories for a BU, ordered by weight then title.
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

// ListByCategory returns the articles under a category slug for a BU, sorted by weight then path.
func (s *WikiService) ListByCategory(bu, slug string) (string, []CategoryItem, error) {
	entries, err := s.ListMarkdown(bu)
	if err != nil {
		return "", nil, err
	}

	var list []CategoryItem
	for _, e := range entries {
		if strings.Contains(e.Path, "/_images/") {
			continue
		}
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

// ListSidebarTree returns the full sidebar tree in a single filesystem walk.
// Excludes "changelog" category (used separately in header nav).
func (s *WikiService) ListSidebarTree(bu string) ([]SidebarCategory, error) {
	entries, err := s.ListMarkdown(bu)
	if err != nil {
		return nil, err
	}

	type catMeta struct {
		weight   int
		title    string
		articles []CategoryItem
	}
	order := []string{}
	seen := make(map[string]*catMeta)

	for _, e := range entries {
		if strings.Contains(e.Path, "/_images/") {
			continue
		}
		parts := strings.Split(e.Path, "/")
		if len(parts) < 2 {
			continue
		}
		slug := parts[0]
		if slug == "changelog" {
			continue
		}

		info, exists := seen[slug]
		if !exists {
			info = &catMeta{weight: e.Weight, title: slug, articles: []CategoryItem{}}
			seen[slug] = info
			order = append(order, slug)
		}

		isIndex := strings.HasSuffix(e.Path, "/index.md")
		if isIndex || e.Weight < info.weight {
			info.weight = e.Weight
			info.title = e.Title
		}

		tags := e.Tags
		if tags == nil {
			tags = []string{}
		}
		info.articles = append(info.articles, CategoryItem{
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

	out := make([]SidebarCategory, 0, len(seen))
	for _, slug := range order {
		info := seen[slug]
		sort.Slice(info.articles, func(i, j int) bool {
			if info.articles[i].Weight != info.articles[j].Weight {
				return info.articles[i].Weight < info.articles[j].Weight
			}
			return info.articles[i].Path < info.articles[j].Path
		})
		out = append(out, SidebarCategory{
			Slug:     slug,
			Title:    info.title,
			Weight:   info.weight,
			Articles: info.articles,
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Weight != out[j].Weight {
			return out[i].Weight < out[j].Weight
		}
		return strings.ToLower(out[i].Title) < strings.ToLower(out[j].Title)
	})

	return out, nil
}

// GetContent reads article content for a BU from local first, falling back to GitHub.
func (s *WikiService) GetContent(bu, relPath string) (*WikiContent, error) {
	if content, err := s.getContentFromLocal(bu, relPath); err == nil {
		return content, nil
	}

	gitPath := relPath
	if bu != "" {
		gitPath = bu + "/" + relPath
	}
	return s.getContentFromGitHub(gitPath)
}

// removeDots strips a period that immediately follows a Unicode letter.
func removeDots(s string) string {
	re := regexp.MustCompile(`(\p{L})\.`)
	return re.ReplaceAllString(s, "$1")
}

// SearchInContent performs a semantic search for a BU's documents (filtered by bu_id).
func (s *WikiService) SearchInContent(bu, query string) ([]SearchResult, error) {
	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return nil, err
	}
	if buID == uuid.Nil {
		return nil, fmt.Errorf("unknown bu: %q", bu)
	}

	emb, err := s.embedLLM.Embedding(query)
	if err != nil {
		return nil, fmt.Errorf("create embedding: %w", err)
	}
	emb = utils.TruncateEmbedding(emb)
	embStr := utils.Float32SliceToPgVector(emb)

	cfg := config.AppConfig.WikiSearch
	sql := `
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
            FROM public.document_chunks dc
            JOIN public.documents d ON dc.doc_id = d.id
            WHERE (dc.embedding <=> ?::vector) < ? AND dc.bu_id = ?
        )
        SELECT path, title, snippet,
               (vector_dist - text_boost) AS final_score
        FROM vector_results
        ORDER BY final_score ASC
        LIMIT ?
    `

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
		buID,
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

	buID, err := database.BUIDForSlug(bu)
	if err != nil {
		return nil, err
	}
	if buID == uuid.Nil {
		return nil, fmt.Errorf("unknown bu: %q", bu)
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
		FROM public.document_chunks dc
		JOIN public.documents d ON dc.doc_id = d.id
		WHERE %s AND dc.bu_id = ?
		ORDER BY d.path, CASE WHEN d.title ILIKE ? THEN 0 ELSE 1 END
		LIMIT ?
	`, whereClause)

	// Add buID (for AND dc.bu_id = ?), primary term for ORDER BY (use first term), and limit
	args = append(args, buID, "%"+terms[0]+"%", searchLimit)

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

// smartTrim truncates s to max runes, snapping back to the last word boundary and appending an ellipsis.
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

// listFromLocal walks a BU's content directory, parsing frontmatter into sorted WikiEntry values.
func (s *WikiService) listFromLocal(bu string) ([]WikiEntry, error) {
	root := s.getRepoPath(bu)
	if !filepath.IsAbs(root) {
		absRoot, err := filepath.Abs(root)
		if err == nil {
			root = absRoot
		}
	}
	root = filepath.Clean(root)

	st, err := os.Stat(root)
	if err != nil {
		return nil, fmt.Errorf("wiki content path for bu %q: %w (%s)", bu, err, root)
	}
	if !st.IsDir() {
		return nil, fmt.Errorf("wiki content path for bu %q is not a directory: %s", bu, root)
	}

	var entries []WikiEntry

	err = filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
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

// wikiPathInsideRoot validates rel is inside root; returns absolute path and repo-relative slash path.
func wikiPathInsideRoot(root, rel string) (abs string, relSlash string, err error) {
	relClean := filepath.Clean(filepath.FromSlash(rel))
	if relClean == "." || relClean == ".." || strings.HasPrefix(relClean, ".."+string(os.PathSeparator)) {
		return "", "", os.ErrNotExist
	}
	abs = filepath.Clean(filepath.Join(root, relClean))
	relSlash, err = filepath.Rel(root, abs)
	if err != nil || strings.HasPrefix(relSlash, "..") {
		return "", "", os.ErrNotExist
	}
	return abs, filepath.ToSlash(relSlash), nil
}

// resolveExistingFileUnderWikiRoot opens rel under root; if missing, matches basename in parent using Unicode NFC (macOS NFD filenames).
func resolveExistingFileUnderWikiRoot(root, rel string, mdOnly bool) (abs string, relSlash string, err error) {
	abs0, relSlash0, err := wikiPathInsideRoot(root, rel)
	if err != nil {
		return "", "", err
	}
	if st, err := os.Stat(abs0); err == nil {
		if st.IsDir() {
			return "", "", os.ErrNotExist
		}
		return abs0, relSlash0, nil
	} else if !errors.Is(err, os.ErrNotExist) {
		return "", "", err
	}

	parentSlash := path.Dir(relSlash0)
	base := path.Base(relSlash0)
	if parentSlash == "." || base == "." {
		return "", "", os.ErrNotExist
	}
	parentAbs := filepath.Join(root, filepath.FromSlash(parentSlash))
	entries, err := os.ReadDir(parentAbs)
	if err != nil {
		return "", "", os.ErrNotExist
	}
	want := norm.NFC.String(base)
	for _, ent := range entries {
		if ent.IsDir() {
			continue
		}
		name := ent.Name()
		if mdOnly && !strings.HasSuffix(strings.ToLower(name), ".md") {
			continue
		}
		if norm.NFC.String(name) != want {
			continue
		}
		fixedAbs := filepath.Join(parentAbs, name)
		fixedSlash := path.Join(parentSlash, name)
		return fixedAbs, fixedSlash, nil
	}
	return "", "", os.ErrNotExist
}

// GetLocalAssetPath resolves the absolute filesystem path of a BU asset under the wiki root.
func (s *WikiService) GetLocalAssetPath(bu, relPath string) (string, error) {
	root := filepath.Clean(s.getRepoPath(bu))
	abs, _, err := resolveExistingFileUnderWikiRoot(root, relPath, false)
	return abs, err
}

// getContentFromLocal reads and parses a markdown file for a BU from the local wiki root.
func (s *WikiService) getContentFromLocal(bu, relPath string) (*WikiContent, error) {
	root := filepath.Clean(s.getRepoPath(bu))
	abs, matchedRelSlash, err := resolveExistingFileUnderWikiRoot(root, relPath, true)
	if err != nil {
		return nil, err
	}
	data, err := os.ReadFile(abs)
	if err != nil {
		return nil, err
	}
	baseName := path.Base(matchedRelSlash)
	out := &WikiContent{Path: matchedRelSlash, Title: slugToTitle(baseName)}
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
		applyMeta(out, meta, body)
	} else {
		// Files without frontmatter (e.g. external changelog imports) still need content.
		out.Content = stripWeightLines(body)
	}
	return out, nil
}

// getContentFromGitHub fetches and parses a markdown file from GitHub as a fallback source.
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
