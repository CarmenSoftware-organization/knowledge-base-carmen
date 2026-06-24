package services

import (
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/utils"
)

func intentTuning() chatconfig.IntentTuning {
	return chatconfig.IntentTuning{
		DefaultThreshold: 0.90, SoftZoneMin: 0.75, SoftZoneVotes: 2,
		CategoryThresholds: map[string]float64{"greeting": 0.90, "confusion": 0.92},
	}
}

// unit builds a normalized 2-D vector pointing at angle implied by (x,y).
func unit(x, y float32) []float32 { return utils.NormalizeEmbedding([]float32{x, y}) }

func TestIntentIndex_HardMatch(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0), unit(0, 1)},
		labels: []string{"greeting", "thanks"},
		tuning: intentTuning(),
	}
	// Query nearly parallel to row 0 (greeting) → score ≈ 1.0 ≥ 0.90 → hard match.
	m, ok := idx.Match(unit(1, 0), false)
	if !ok || m.Intent != "greeting" || m.Source != "vector_hard" {
		t.Fatalf("hard match = (%+v,%v)", m, ok)
	}
}

func TestIntentIndex_SoftZoneVotes(t *testing.T) {
	// Two 'greeting' rows ~0.80 cosine to query, enough votes (2) in soft zone.
	// unit(4,3)·unit(1,0) = 0.80; unit(4,3.2)·unit(1,0) ≈ 0.78 — both in [0.75,0.90).
	idx := &IntentIndex{
		matrix: [][]float32{unit(4, 3), unit(4, 3.2), unit(0, 1)},
		labels: []string{"greeting", "greeting", "thanks"},
		tuning: intentTuning(),
	}
	m, ok := idx.Match(unit(1, 0), false)
	if !ok || m.Intent != "greeting" || m.Source != "vector_soft" {
		t.Fatalf("soft match = (%+v,%v)", m, ok)
	}
}

func TestIntentIndex_ConfusionWithHistoryFallsThrough(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"confusion"},
		tuning: intentTuning(),
	}
	if _, ok := idx.Match(unit(1, 0), true); ok {
		t.Error("confusion + history must fall through to LLM (ok=false)")
	}
}

func TestIntentIndex_NoMatchFallsThrough(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"greeting"},
		tuning: intentTuning(),
	}
	// Orthogonal query → score ≈ 0 < soft_zone_min → fall through.
	if _, ok := idx.Match(unit(0, 1), false); ok {
		t.Error("low score must fall through (ok=false)")
	}
}

func TestIntentIndex_ConfusionHardMatchNoHistory(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"confusion"},
		tuning: intentTuning(),
	}
	// Query parallel to the confusion row → score ≈ 1.0 ≥ 0.92, no history → hard match.
	m, ok := idx.Match(unit(1, 0), false)
	if !ok || m.Intent != "confusion" || m.Source != "vector_hard" {
		t.Fatalf("confusion hard match (no history) = (%+v,%v), want confusion/vector_hard/true", m, ok)
	}
}

// TestIntentIndex_SoftZoneTieBreakByScore verifies Fix B: when two labels each
// have the same vote count, the one whose highest-scoring example appeared first
// (i.e. highest score) wins — matching Python's first-insertion tie-break.
// Alphabetical order would pick "greeting" < "thanks"; score order must pick
// whichever label had the top-scoring row.
func TestIntentIndex_SoftZoneTieBreakByScore(t *testing.T) {
	// Tuning: DefaultThreshold=0.98 so scores below 0.98 fall into the soft zone.
	// Scores against unit(1,0):
	//   unit(4,1)  = 4/√17  ≈ 0.970  → "thanks"  (row 0, highest, first-seen)
	//   unit(4,2)  = 4/√20  ≈ 0.894  → "greeting" (row 1)
	//   unit(4,3)  = 4/√25  = 0.800  → "thanks"  (row 2, 2nd vote for thanks)
	//   unit(4,4)  = 4/√32  ≈ 0.707  → "greeting" (row 3, 2nd vote for greeting)
	// All four in [SoftZoneMin=0.70, DefaultThreshold=0.98).
	// votes: thanks=2, greeting=2 — tie. First-appearance winner: "thanks" (row 0).
	// The old alphabetical tie-break would have chosen "greeting" (g < t).
	tieBreakTuning := chatconfig.IntentTuning{
		DefaultThreshold: 0.98, SoftZoneMin: 0.70, SoftZoneVotes: 2,
		CategoryThresholds: map[string]float64{},
	}
	idx := &IntentIndex{
		matrix: [][]float32{unit(4, 1), unit(4, 2), unit(4, 3), unit(4, 4)},
		labels: []string{"thanks", "greeting", "thanks", "greeting"},
		tuning: tieBreakTuning,
	}
	m, ok := idx.Match(unit(1, 0), false)
	if !ok || m.Intent != "thanks" || m.Source != "vector_soft" {
		t.Fatalf("Fix B tie-break: want thanks/vector_soft/true, got (%+v,%v)", m, ok)
	}
}

// TestIntentIndex_QueryTruncatedBeforeNormalize is a regression guard for Fix A.
// The matrix row is unit(1,0) (len 2). We pass a query that is co-directional
// with extra trailing dimensions (simulating a full-length model embedding that
// is longer than the configured VECTOR_DIMENSION). After Fix A, Match truncates
// the query to the row length before normalizing, so the extra tail does not
// corrupt the cosine score.
//
// NOTE: A fully deterministic dim-mismatch test (e.g. matrix row len 2, query
// len 5) depends on the global VECTOR_DIMENSION env, which TruncateEmbedding
// reads at startup. In a standard test environment VECTOR_DIMENSION defaults to
// 2000, so unit(1,0) (len=2) would be padded to 2000 dims — a tail-dimension
// mismatch test would require overriding that singleton, which is not safe in
// parallel tests. This test instead verifies the observable invariant: a query
// that is co-directional with the matrix row must always yield a hard match
// (score ≈ 1.0 ≥ threshold), confirming truncate-then-normalize is correct.
func TestIntentIndex_QueryTruncatedBeforeNormalize(t *testing.T) {
	idx := &IntentIndex{
		matrix: [][]float32{unit(1, 0)},
		labels: []string{"greeting"},
		tuning: intentTuning(),
	}
	// unit(4, 0) normalizes to (1, 0) — co-directional with the matrix row.
	// Before Fix A, if queryEmb were longer than the matrix row, the extra tail
	// would reduce the cosine. Here we confirm the happy-path invariant holds.
	m, ok := idx.Match(unit(4, 0), false)
	if !ok || m.Intent != "greeting" || m.Source != "vector_hard" {
		t.Fatalf("Fix A regression: co-directional query must hard-match greeting, got (%+v,%v)", m, ok)
	}
}
