package database

import (
	"testing"

	"github.com/google/uuid"
)

func TestTruncateBUTables_OnlyTargetBU(t *testing.T) {
	mustConnect(t) // defined in bu_resolve_test.go

	seed := func(slug string) uuid.UUID {
		DB.Exec(`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`, slug, slug)
		id, _ := BUIDForSlug(slug)
		DB.Exec(`INSERT INTO public.documents (bu_id, path, title) VALUES (?, 'p.md', 'P')`, id)
		return id
	}
	a := seed("trunc_a")
	b := seed("trunc_b")
	t.Cleanup(func() { DB.Exec(`DELETE FROM public.business_units WHERE slug IN ('trunc_a','trunc_b')`) })

	if err := TruncateBUTables("trunc_a"); err != nil {
		t.Fatalf("TruncateBUTables: %v", err)
	}

	var ca, cb int
	DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, a).Scan(&ca)
	DB.Raw(`SELECT count(*) FROM public.documents WHERE bu_id = ?`, b).Scan(&cb)
	if ca != 0 {
		t.Fatalf("trunc_a documents should be 0, got %d", ca)
	}
	if cb != 1 {
		t.Fatalf("trunc_b documents must be untouched, got %d", cb)
	}
}
