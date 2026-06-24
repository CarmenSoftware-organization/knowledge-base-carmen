package services

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
)

type FAQModule struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Icon      string    `json:"icon,omitempty"`
	SortOrder int       `json:"sort_order,omitempty"`
}

type FAQSubmodule struct {
	ID          uuid.UUID     `json:"id"`
	Name        string        `json:"name"`
	Slug        string        `json:"slug"`
	Description string        `json:"description,omitempty"`
	SortOrder   int           `json:"sort_order,omitempty"`
	Categories  []FAQCategory `json:"categories,omitempty"`
}

type FAQCategory struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	SortOrder int       `json:"sort_order,omitempty"`
}

type FAQEntry struct {
	ID           uuid.UUID `json:"id"`
	Title        string    `json:"title"`
	SampleCase   string    `json:"sample_case,omitempty"`
	ProblemCause string    `json:"problem_cause,omitempty"`
	Solution     string    `json:"solution,omitempty"`
	Tags         []string  `json:"tags,omitempty"`
}

type FAQCategoryResponse struct {
	Module    FAQModule    `json:"module"`
	Submodule FAQSubmodule `json:"submodule"`
	Category  FAQCategory  `json:"category"`
	Items     []FAQEntry   `json:"items"`
}

type FAQEntryDetail struct {
	FAQEntry
	Module    FAQModule    `json:"module"`
	Submodule FAQSubmodule `json:"submodule"`
	Category  FAQCategory  `json:"category"`
}

type FAQService struct{}

func NewFAQService() *FAQService {
	return &FAQService{}
}

// resolveBU gets bu_id from business_units slug.
func (s *FAQService) resolveBU(buSlug string) (uuid.UUID, error) {
	return database.BUIDForSlug(buSlug)
}

func (s *FAQService) ListModules(buSlug string) ([]FAQModule, error) {
	buID, err := s.resolveBU(buSlug)
	if err != nil {
		return nil, err
	}
	var mods []FAQModule
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(icon, '') AS icon, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_modules
		WHERE bu_id = ?
		ORDER BY sort_order, id
	`, buID).Scan(&mods).Error; err != nil {
		return nil, fmt.Errorf("list modules: %w", err)
	}
	return mods, nil
}

// GetModuleWithChildren returns module with its submodules and categories.
func (s *FAQService) GetModuleWithChildren(buSlug, moduleSlug string) (map[string]interface{}, error) {
	buID, err := s.resolveBU(buSlug)
	if err != nil {
		return nil, err
	}
	var mod FAQModule
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(icon, '') AS icon, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_modules
		WHERE bu_id = ? AND slug = ?
		LIMIT 1
	`, buID, moduleSlug).Scan(&mod).Error; err != nil {
		return nil, fmt.Errorf("get module: %w", err)
	}
	if mod.ID == uuid.Nil {
		return nil, fmt.Errorf("module not found: %s", moduleSlug)
	}

	// Load submodules
	var subs []FAQSubmodule
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(description, '') AS description, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_submodules
		WHERE module_id = ?
		ORDER BY sort_order, id
	`, mod.ID).Scan(&subs).Error; err != nil {
		return nil, fmt.Errorf("list submodules: %w", err)
	}

	// Load categories per submodule
	for i := range subs {
		var cats []FAQCategory
		if err := database.DB.Raw(`
			SELECT id, name, slug, COALESCE(sort_order, 0) AS sort_order
			FROM public.faq_categories
			WHERE submodule_id = ?
			ORDER BY sort_order, id
		`, subs[i].ID).Scan(&cats).Error; err != nil {
			return nil, fmt.Errorf("list categories: %w", err)
		}
		subs[i].Categories = cats
	}

	return map[string]interface{}{
		"module":     mod,
		"submodules": subs,
	}, nil
}

// ListByCategory returns entries for a given module/submodule/category, with optional text filter q.
func (s *FAQService) ListByCategory(buSlug, moduleSlug, subSlug, catSlug, q string) (*FAQCategoryResponse, error) {
	buID, err := s.resolveBU(buSlug)
	if err != nil {
		return nil, err
	}

	var mod FAQModule
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(icon, '') AS icon, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_modules
		WHERE bu_id = ? AND slug = ?
		LIMIT 1
	`, buID, moduleSlug).Scan(&mod).Error; err != nil {
		return nil, fmt.Errorf("get module: %w", err)
	}
	if mod.ID == uuid.Nil {
		return nil, fmt.Errorf("module not found: %s", moduleSlug)
	}

	var sub FAQSubmodule
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(description, '') AS description, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_submodules
		WHERE module_id = ? AND slug = ?
		LIMIT 1
	`, mod.ID, subSlug).Scan(&sub).Error; err != nil {
		return nil, fmt.Errorf("get submodule: %w", err)
	}
	if sub.ID == uuid.Nil {
		return nil, fmt.Errorf("submodule not found: %s", subSlug)
	}

	var cat FAQCategory
	if err := database.DB.Raw(`
		SELECT id, name, slug, COALESCE(sort_order, 0) AS sort_order
		FROM public.faq_categories
		WHERE submodule_id = ? AND slug = ?
		LIMIT 1
	`, sub.ID, catSlug).Scan(&cat).Error; err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}
	if cat.ID == uuid.Nil {
		return nil, fmt.Errorf("category not found: %s", catSlug)
	}

	// Build WHERE filter
	var args []interface{}
	args = append(args, cat.ID)
	where := "category_id = ? AND is_active = TRUE"
	if strings.TrimSpace(q) != "" {
		qLike := "%" + strings.ToLower(strings.TrimSpace(q)) + "%"
		where += " AND (LOWER(title) LIKE ? OR LOWER(sample_case) LIKE ? OR LOWER(solution) LIKE ?)"
		args = append(args, qLike, qLike, qLike)
	}

	query := fmt.Sprintf(`
		SELECT id, title,
		       COALESCE(sample_case, '') AS sample_case,
		       COALESCE(problem_cause, '') AS problem_cause,
		       COALESCE(solution, '') AS solution,
		       COALESCE(tags, '{}') AS tags
		FROM public.faq_entries
		WHERE %s
		ORDER BY id DESC
	`, where)

	var items []FAQEntry
	if err := database.DB.Raw(query, args...).Scan(&items).Error; err != nil {
		return nil, fmt.Errorf("list entries: %w", err)
	}

	return &FAQCategoryResponse{
		Module:    mod,
		Submodule: sub,
		Category:  cat,
		Items:     items,
	}, nil
}

// GetEntryByID returns a single entry detail.
func (s *FAQService) GetEntryByID(buSlug, id string) (*FAQEntryDetail, error) {
	// First fetch basic entry
	var entry FAQEntry
	if err := database.DB.Raw(`
		SELECT id, title,
		       COALESCE(sample_case, '') AS sample_case,
		       COALESCE(problem_cause, '') AS problem_cause,
		       COALESCE(solution, '') AS solution,
		       COALESCE(tags, '{}') AS tags
		FROM public.faq_entries
		WHERE id = ? AND is_active = TRUE
		LIMIT 1
	`, id).Scan(&entry).Error; err != nil {
		return nil, fmt.Errorf("get entry: %w", err)
	}
	if entry.ID == uuid.Nil {
		return nil, fmt.Errorf("faq entry not found: %s", id)
	}

	// Resolve category, submodule, module and BU; ensure BU matches
	var cat FAQCategory
	if err := database.DB.Raw(`
		SELECT c.id, c.name, c.slug, COALESCE(c.sort_order, 0) AS sort_order
		FROM public.faq_categories c
		JOIN public.faq_entries e ON e.category_id = c.id
		WHERE e.id = ?
	`, id).Scan(&cat).Error; err != nil {
		return nil, fmt.Errorf("get category: %w", err)
	}

	// Use a flat struct (no Categories slice) to avoid GORM treating the
	// slice field as a foreign-key relation during Raw().Scan().
	var subRow struct {
		ID          uuid.UUID `gorm:"column:id"`
		Name        string    `gorm:"column:name"`
		Slug        string    `gorm:"column:slug"`
		Description string    `gorm:"column:description"`
		SortOrder   int       `gorm:"column:sort_order"`
	}
	if err := database.DB.Raw(`
		SELECT s.id, s.name, s.slug, COALESCE(s.description, '') AS description, COALESCE(s.sort_order, 0) AS sort_order
		FROM public.faq_submodules s
		JOIN public.faq_categories c ON c.submodule_id = s.id
		JOIN public.faq_entries e ON e.category_id = c.id
		WHERE e.id = ?
	`, id).Scan(&subRow).Error; err != nil {
		return nil, fmt.Errorf("get submodule: %w", err)
	}
	sub := FAQSubmodule{
		ID:          subRow.ID,
		Name:        subRow.Name,
		Slug:        subRow.Slug,
		Description: subRow.Description,
		SortOrder:   subRow.SortOrder,
	}

	var mod FAQModule
	if err := database.DB.Raw(`
		SELECT m.id, m.name, m.slug, COALESCE(m.icon, '') AS icon, COALESCE(m.sort_order, 0) AS sort_order
		FROM public.faq_modules m
		JOIN public.faq_submodules s ON s.module_id = m.id
		JOIN public.faq_categories c ON c.submodule_id = s.id
		JOIN public.faq_entries e ON e.category_id = c.id
		WHERE e.id = ?
	`, id).Scan(&mod).Error; err != nil {
		return nil, fmt.Errorf("get module: %w", err)
	}

	// Ensure BU matches buSlug
	buID, err := s.resolveBU(buSlug)
	if err != nil {
		return nil, err
	}
	// Row().Scan so the uuid destination's sql.Scanner is honored (GORM's
	// Raw().Scan into a bare [16]byte mis-handles the pgx string value).
	var modBU uuid.UUID
	if err := database.DB.Raw(`
		SELECT bu_id FROM public.faq_modules WHERE id = ?
	`, mod.ID).Row().Scan(&modBU); err != nil {
		return nil, fmt.Errorf("get module BU: %w", err)
	}
	if modBU != buID {
		return nil, fmt.Errorf("faq entry does not belong to BU: %s", buSlug)
	}

	return &FAQEntryDetail{
		FAQEntry:  entry,
		Module:    mod,
		Submodule: sub,
		Category:  cat,
	}, nil
}
