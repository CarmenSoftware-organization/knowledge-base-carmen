// logic อ่านไฟล์ markdown จากโฟลเดอร์ backend/wiki-conten
// มีฟังก์ชัน:
// list รายการไฟล์
// อ่านเนื้อหาไฟล์ตาม path
// แปลงข้อมูลให้อยู่ในรูปที่ API ส่งให้ frontend

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

// WikiEntry รายการไฟล์สำหรับ frontend (รองรับ frontmatter จาก .md)
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

// CategoryEntry หมวดสำหรับ GET /api/wiki/categories (frontend ใช้ slug map กับชื่อ/icon/สีเอง)
type CategoryEntry struct {
	Slug   string `json:"slug"`
	Title  string `json:"title"`
	Weight int    `json:"weight,omitempty"`
}

// CategoryItem บทความในหมวด สำหรับ GET /api/wiki/category/:slug
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

// WikiContent เนื้อหาไฟล์ (รองรับ frontmatter)
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

type WikiService struct {
	repoPath     string
	githubClient *github.Client
}

type SearchResult struct {
	WikiEntry
	Snippet string `json:"snippet"`
}

func NewWikiService() *WikiService {
	contentPath := config.GetWikiContentPath()
	return &WikiService{
		repoPath:     contentPath,
		githubClient: github.NewClient(),
	}
}

// parseFrontmatter แยก YAML frontmatter (ระหว่าง --- กับ ---) ออกจาก body คืน meta map และเนื้อหา markdown ล้วน
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
		val := strings.TrimSpace(line[colon+1:])
		val = strings.Trim(val, `"'`)
		meta[key] = val
	}
	return meta, body
}

func metaToTags(meta map[string]string) []string {
	s, ok := meta["tags"]
	if !ok || s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	var out []string
	for _, p := range parts {
		if t := strings.TrimSpace(p); t != "" {
			out = append(out, t)
		}
	}
	return out
}

func metaBool(meta map[string]string, key string) bool {
	v := strings.TrimSpace(strings.ToLower(meta[key]))
	return v == "true" || v == "1"
}

// ListMarkdown คืนรายการ .md จาก local ก่อน ถ้าไม่มีหรือ error จะลองจาก GitHub
func (s *WikiService) ListMarkdown() ([]WikiEntry, error) {
	entries, err := s.listFromLocal()
	if err != nil {
		fmt.Println("❌ listFromLocal error:", err)
		return []WikiEntry{}, nil // 🔥 อย่าส่ง error
	}

	if len(entries) > 0 {
		return entries, nil
	}

	// 🔥 ถ้าไม่มีไฟล์เลย ไม่ต้องเรียก GitHub
	return []WikiEntry{}, nil
}

// ListCategories คืนรายการ slug หมวด (segment แรกของ path) เรียง A–Z
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
		if len(parts) >= 2 {
			slug := parts[0]
			info, exists := seen[slug]
			if !exists {
				info = &catInfo{weight: e.Weight, title: slug}
				seen[slug] = info
			}

			// ถ้าเจอไฟล์ index.md หรือไฟล์ที่มี weight น้อยกว่า ให้ใช้เป็นข้อมูลหลักของหมวด
			isIndex := strings.HasSuffix(e.Path, "/index.md")
			if isIndex || e.Weight < info.weight {
				info.weight = e.Weight
				info.title = e.Title
			}
		}
	}

	var out []CategoryEntry
	for slug, info := range seen {
		out = append(out, CategoryEntry{
			Slug:   slug,
			Title:  info.title,
			Weight: info.weight,
		})
	}

	// เรียงหมวดหมู่ตาม Weight ที่แอดมินตั้งไว้
	sort.Slice(out, func(i, j int) bool {
		if out[i].Weight == out[j].Weight {
			return strings.ToLower(out[i].Title) < strings.ToLower(out[j].Title)
		}
		return out[i].Weight < out[j].Weight
	})

	return out, nil
}

// ListByCategory คืนบทความในหมวด slug (path ขึ้นต้นด้วย slug/ หรือ path == slug)
func (s *WikiService) ListByCategory(slug string) (string, []CategoryItem, error) {
	entries, err := s.ListMarkdown()
	if err != nil {
		return "", nil, err
	}

	var list []CategoryItem

	for _, e := range entries {
		parts := strings.Split(e.Path, "/")

		if len(parts) >= 2 && parts[0] == slug {
			itemSlug := strings.TrimSuffix(
				filepath.Base(e.Path),
				filepath.Ext(e.Path),
			)

			list = append(list, CategoryItem{
				Slug:        itemSlug,
				Title:       e.Title,
				Description: e.Description,
				Published:   e.Published,
				Date:        e.Date,
				Path:        e.Path,
				Tags:        []string{}, // Initialize empty to avoid null in JSON
				Editor:      e.Editor,
				DateCreated: e.DateCreated,
				PublishedAt: e.PublishedAt,
				Weight:      e.Weight,
			})
			if e.Tags != nil {
				list[len(list)-1].Tags = e.Tags
			}
		}
	}

	// เรียงไฟล์ภายในหมวดหมู่ตาม Weight
	sort.Slice(list, func(i, j int) bool {
		if list[i].Weight == list[j].Weight {
			return list[i].Path < list[j].Path
		}
		return list[i].Weight < list[j].Weight
	})

	return slug, list, nil
}

const maxFrontmatterRead = 16384

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

		entry := WikiEntry{Path: rel, Title: title}
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

			// อ่านค่า Weight: ลองอ่านจาก meta ก่อน ถ้าไม่มีให้ลองหาในไฟล์ทั้งหมด (รองรับกรณีอยู่นอก ---)
			weight := 999
			if wStr := meta["weight"]; wStr != "" {
				if w, err := strconv.Atoi(wStr); err == nil {
					weight = w
				}
			} else {
				// ถ้าใน meta ไม่มี ให้ลองสแกนหาบรรทัดที่เริ่มด้วย weight: ในไฟล์
				scanner := bufio.NewScanner(bytes.NewReader(data))
				for scanner.Scan() {
					line := strings.TrimSpace(scanner.Text())
					if strings.HasPrefix(line, "weight:") {
						val := strings.TrimSpace(strings.TrimPrefix(line, "weight:"))
						if w, err := strconv.Atoi(val); err == nil {
							weight = w
							break
						}
					}
				}
			}
			entry.Weight = weight

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

	// เรียงลำดับตาม Weight เป็นหลัก ถ้าเท่ากันเรียงตาม Path
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Weight == entries[j].Weight {
			return entries[i].Path < entries[j].Path
		}
		return entries[i].Weight < entries[j].Weight
	})
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

	out := &WikiContent{Path: relPath, Title: title, Content: string(data)}
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
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
		// ลบบรรทัด weight: ออกจาก body เพื่อไม่ให้โชว์บนหน้าเว็บ
		var cleanLines []string
		scanner := bufio.NewScanner(bytes.NewReader(body))
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(strings.TrimSpace(line), "weight:") {
				cleanLines = append(cleanLines, line)
			}
		}
		out.Content = strings.Join(cleanLines, "\n")
	}
	return out, nil
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
	data := []byte(fc.Content)
	out := &WikiContent{Path: fc.Path, Title: title, Content: fc.Content}
	meta, body := parseFrontmatter(data)
	if len(meta) > 0 {
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
		// ลบบรรทัด weight: ออกจาก body เพื่อไม่ให้โชว์บนหน้าเว็บ
		var cleanLines []string
		scanner := bufio.NewScanner(bytes.NewReader(body))
		for scanner.Scan() {
			line := scanner.Text()
			if !strings.HasPrefix(strings.TrimSpace(line), "weight:") {
				cleanLines = append(cleanLines, line)
			}
		}
		out.Content = strings.Join(cleanLines, "\n")
	}
	return out, nil
}

func (s *WikiService) SearchInContent(query string) ([]SearchResult, error) {
	query = strings.ToLower(query)
	entries, err := s.listFromLocal()
	if err != nil {
		return nil, err
	}

	var results []SearchResult
	root := filepath.Clean(s.repoPath)

	for _, entry := range entries {
		fullPath := filepath.Join(root, filepath.FromSlash(entry.Path))
		data, err := os.ReadFile(fullPath)
		if err != nil {
			continue
		}

		content := string(data)
		contentLower := strings.ToLower(content)

		if strings.Contains(contentLower, query) {
			// สร้าง Snippet สั้นๆ รอบๆ คำที่เจอ
			idx := strings.Index(contentLower, query)
			start := idx - 40
			if start < 0 {
				start = 0
			}
			end := idx + len(query) + 60
			if end > len(content) {
				end = len(content)
			}

			snippet := content[start:end]

			results = append(results, SearchResult{
				WikiEntry: entry,
				Snippet:   "..." + strings.ReplaceAll(snippet, "\n", " ") + "...",
			})
		}

		if len(results) >= 20 {
			break
		}
	}

	return results, nil
}
