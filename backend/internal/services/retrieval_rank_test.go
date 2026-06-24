package services

import (
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
)

func cfg() chatconfig.RetrievalTuning {
	return chatconfig.RetrievalTuning{TopK: 2, MaxDistance: 0.45, FetchK: 20, RRFK: 60, PathBoostRRF: 0.02}
}

func TestFuseAndRank_RRFOrderingAndTopK(t *testing.T) {
	// A is rank1 vector + rank1 keyword → highest fused. B rank2 both. C only vector rank3.
	vec := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "alpha", Dist: 0.10},
		{Path: "p/b.md", Title: "B", Content: "beta", Dist: 0.20},
		{Path: "p/c.md", Title: "C", Content: "gamma", Dist: 0.30},
	}
	kw := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "alpha"},
		{Path: "p/b.md", Title: "B", Content: "beta"},
	}
	got := FuseAndRank(vec, kw, cfg(), "anything", nil)
	if len(got) != 2 { // TopK=2
		t.Fatalf("len = %d, want 2", len(got))
	}
	if got[0].Content != "alpha" || got[1].Content != "beta" {
		t.Errorf("order = [%s,%s], want [alpha,beta]", got[0].Content, got[1].Content)
	}
}

func TestFuseAndRank_DedupByContent(t *testing.T) {
	vec := []ScoredRow{
		{Path: "p/a.md", Title: "A", Content: "same", Dist: 0.10},
		{Path: "p/a2.md", Title: "A2", Content: "same", Dist: 0.40}, // dup content
	}
	got := FuseAndRank(vec, nil, cfg(), "q", nil)
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1 (deduped by content)", len(got))
	}
}

func TestFuseAndRank_PathBoostLifts(t *testing.T) {
	// Without boost, vec-only ranks: x(rank1) > y(rank2). Boost y so it overtakes x.
	vec := []ScoredRow{
		{Path: "p/x.md", Title: "X", Content: "xx", Dist: 0.10},
		{Path: "carmen/ap/ap-y.md", Title: "Y", Content: "yy", Dist: 0.20},
	}
	rules := []chatconfig.PathRule{{Keywords: []string{"ap"}, Patterns: []string{"%ap-%"}}}
	c := cfg()
	c.TopK = 2
	// rrf: x=1/61≈0.016393, y=1/62≈0.016129; boost y by 0.02 → y wins.
	got := FuseAndRank(vec, nil, c, "ap question", rules)
	if got[0].Content != "yy" {
		t.Errorf("boosted y should rank first, got %q", got[0].Content)
	}
	if !got[0].Boosted {
		t.Error("y should be marked Boosted")
	}
}

func TestFuseAndRank_BoostSuppressedWhenManyRules(t *testing.T) {
	// 5 rules all matching the question → boost suppressed even if path matches rule 1.
	rules := []chatconfig.PathRule{
		{Keywords: []string{"k1"}, Patterns: []string{"%p1%"}},
		{Keywords: []string{"k2"}, Patterns: []string{"%p2%"}},
		{Keywords: []string{"k3"}, Patterns: []string{"%p3%"}},
		{Keywords: []string{"k4"}, Patterns: []string{"%p4%"}},
		{Keywords: []string{"k5"}, Patterns: []string{"%p5%"}},
	}
	vec := []ScoredRow{
		{Path: "x/p1/y.md", Title: "T", Content: "content1", Dist: 0.10},
	}
	c := cfg()
	c.TopK = 5
	got := FuseAndRank(vec, nil, c, "k1 k2 k3 k4 k5", rules)
	if len(got) == 0 {
		t.Fatal("expected at least one result")
	}
	if got[0].Boosted {
		t.Error("boost should be suppressed when >=5 rules match the question")
	}
}

func TestFuseAndRank_DistSentinel(t *testing.T) {
	// vec row gets real Dist; keyword-only row gets sentinel 1.0.
	vec := []ScoredRow{
		{Path: "p/vec.md", Title: "V", Content: "vector content", Dist: 0.12},
	}
	kw := []ScoredRow{
		{Path: "p/kw.md", Title: "K", Content: "keyword content"},
	}
	c := cfg()
	c.TopK = 10
	got := FuseAndRank(vec, kw, c, "q", nil)
	if len(got) != 2 {
		t.Fatalf("expected 2 results, got %d", len(got))
	}
	var vecChunk, kwChunk *RetrievedChunk
	for i := range got {
		switch got[i].Content {
		case "vector content":
			vecChunk = &got[i]
		case "keyword content":
			kwChunk = &got[i]
		}
	}
	if vecChunk == nil || kwChunk == nil {
		t.Fatal("could not find both chunks in output")
	}
	const eps = 0.001
	if vecChunk.Dist < 0.12-eps || vecChunk.Dist > 0.12+eps {
		t.Errorf("vector chunk Dist = %v, want ~0.12", vecChunk.Dist)
	}
	if kwChunk.Dist != 1.0 {
		t.Errorf("keyword-only chunk Dist = %v, want 1.0 (sentinel)", kwChunk.Dist)
	}
}
