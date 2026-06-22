package services

import (
	"testing"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
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
