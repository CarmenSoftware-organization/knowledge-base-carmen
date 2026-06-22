package database

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/new-carmen/backend/internal/security"
)

// BUIDForSlug returns public.business_units.id (UUID) for the given slug.
// Returns uuid.Nil when the slug does not exist; an error only on invalid slug
// format or a database failure.
func BUIDForSlug(slug string) (uuid.UUID, error) {
	if !security.ValidateSchema(slug) {
		return uuid.Nil, fmt.Errorf("invalid bu slug: %q", slug)
	}
	// Use Row().Scan so the destination's sql.Scanner (uuid.UUID) is honored;
	// GORM's Raw().Scan into a bare [16]byte mis-handles the pgx string value.
	var id uuid.UUID
	if err := DB.Raw("SELECT id FROM public.business_units WHERE slug = ? LIMIT 1", slug).Row().Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return uuid.Nil, nil
		}
		return uuid.Nil, err
	}
	return id, nil
}
