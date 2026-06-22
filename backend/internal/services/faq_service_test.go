package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/new-carmen/backend/internal/database"
)

// TestFAQService_StructScan exercises the uuid.UUID GORM struct-scan paths in
// FAQService: ListModules and GetEntryByID.  It seeds a complete FAQ chain,
// asserts that returned IDs are non-nil and match what was inserted, and
// verifies the entry title round-trips correctly.
func TestFAQService_StructScan(t *testing.T) {
	mustConnectServices(t)

	const buSlug = "faq_test_bu"

	// Seed business_units row.
	database.DB.Exec(
		`INSERT INTO public.business_units (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO NOTHING`,
		buSlug, buSlug,
	)
	t.Cleanup(func() {
		database.DB.Exec(`DELETE FROM public.business_units WHERE slug = ?`, buSlug)
	})

	buID, err := database.BUIDForSlug(buSlug)
	if err != nil || buID == uuid.Nil {
		t.Fatalf("seeded BU not found for slug %q: %v", buSlug, err)
	}

	// Insert faq_modules (rely on DB gen_random_uuid() default, capture with RETURNING).
	var moduleID uuid.UUID
	if err := database.DB.Raw(
		`INSERT INTO public.faq_modules (bu_id, name, slug) VALUES (?, 'Test Module', 'test-module') RETURNING id`,
		buID,
	).Row().Scan(&moduleID); err != nil {
		t.Fatalf("insert faq_modules: %v", err)
	}
	if moduleID == uuid.Nil {
		t.Fatal("faq_modules insert returned nil id")
	}

	// Insert faq_submodules.
	var submoduleID uuid.UUID
	if err := database.DB.Raw(
		`INSERT INTO public.faq_submodules (module_id, name, slug) VALUES (?, 'Test Submodule', 'test-sub') RETURNING id`,
		moduleID,
	).Row().Scan(&submoduleID); err != nil {
		t.Fatalf("insert faq_submodules: %v", err)
	}
	if submoduleID == uuid.Nil {
		t.Fatal("faq_submodules insert returned nil id")
	}

	// Insert faq_categories.
	var categoryID uuid.UUID
	if err := database.DB.Raw(
		`INSERT INTO public.faq_categories (submodule_id, name, slug) VALUES (?, 'Test Category', 'test-cat') RETURNING id`,
		submoduleID,
	).Row().Scan(&categoryID); err != nil {
		t.Fatalf("insert faq_categories: %v", err)
	}
	if categoryID == uuid.Nil {
		t.Fatal("faq_categories insert returned nil id")
	}

	// Insert faq_entries.
	const entryTitle = "FAQ Entry Title Round-trip"
	var entryID uuid.UUID
	if err := database.DB.Raw(
		`INSERT INTO public.faq_entries (category_id, title, is_active) VALUES (?, ?, TRUE) RETURNING id`,
		categoryID, entryTitle,
	).Row().Scan(&entryID); err != nil {
		t.Fatalf("insert faq_entries: %v", err)
	}
	if entryID == uuid.Nil {
		t.Fatal("faq_entries insert returned nil id")
	}

	svc := NewFAQService()

	// --- Test ListModules: proves uuid.UUID struct-scan for FAQModule.ID ---
	mods, err := svc.ListModules(buSlug)
	if err != nil {
		t.Fatalf("ListModules: %v", err)
	}
	if len(mods) == 0 {
		t.Fatal("ListModules returned no modules; expected at least one")
	}
	found := false
	for _, m := range mods {
		if m.ID == moduleID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("ListModules: seeded module id %s not found in results", moduleID)
	}
	if mods[0].ID == uuid.Nil {
		t.Fatal("ListModules: first module ID is nil UUID")
	}

	// --- Test GetEntryByID: proves uuid.UUID struct-scan for FAQEntry.ID ---
	detail, err := svc.GetEntryByID(buSlug, entryID.String())
	if err != nil {
		t.Fatalf("GetEntryByID: %v", err)
	}
	if detail == nil {
		t.Fatal("GetEntryByID returned nil detail")
	}
	if detail.ID == uuid.Nil {
		t.Fatal("GetEntryByID: entry ID is nil UUID")
	}
	if detail.ID != entryID {
		t.Fatalf("GetEntryByID: id mismatch: got %s, want %s", detail.ID, entryID)
	}
	if detail.Title != entryTitle {
		t.Fatalf("GetEntryByID: title round-trip failed: got %q, want %q", detail.Title, entryTitle)
	}
	if detail.Category.ID == uuid.Nil {
		t.Fatal("GetEntryByID: category ID is nil UUID")
	}
	if detail.Category.ID != categoryID {
		t.Fatalf("GetEntryByID: category id mismatch: got %s, want %s", detail.Category.ID, categoryID)
	}
	if detail.Module.ID == uuid.Nil {
		t.Fatal("GetEntryByID: module ID is nil UUID")
	}
	if detail.Module.ID != moduleID {
		t.Fatalf("GetEntryByID: module id mismatch: got %s, want %s", detail.Module.ID, moduleID)
	}
}
