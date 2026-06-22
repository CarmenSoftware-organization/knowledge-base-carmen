package database

import (
	"fmt"

	"github.com/new-carmen/backend/internal/security"
)

// BUIDForSlug returns public.business_units.id for the given slug.
// Returns (0, nil) when the slug does not exist. Returns an error only on an
// invalid slug format or a database failure. Centralizes slug→id resolution so
// document/chunk queries can filter by a parameterized bu_id (no schema-name
// interpolation).
func BUIDForSlug(slug string) (int, error) {
	if !security.ValidateSchema(slug) {
		return 0, fmt.Errorf("invalid bu slug: %q", slug)
	}
	var id int
	if err := DB.Raw("SELECT id FROM public.business_units WHERE slug = ? LIMIT 1", slug).Scan(&id).Error; err != nil {
		return 0, err
	}
	return id, nil
}
