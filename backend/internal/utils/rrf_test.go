package utils

import (
	"math"
	"testing"
)

func approx(a, b float64) bool { return math.Abs(a-b) < 1e-9 }

func TestFuseRRF_SingleList(t *testing.T) {
	// k=60: rank1 → 1/61, rank2 → 1/62
	got := FuseRRF([][]string{{"a", "b"}}, 60)
	if !approx(got["a"], 1.0/61) {
		t.Errorf("a = %v, want %v", got["a"], 1.0/61)
	}
	if !approx(got["b"], 1.0/62) {
		t.Errorf("b = %v, want %v", got["b"], 1.0/62)
	}
}

func TestFuseRRF_TwoListsAccumulate(t *testing.T) {
	// "a" is rank1 in list1 (1/61) and rank2 in list2 (1/62) → sum
	got := FuseRRF([][]string{{"a", "b"}, {"c", "a"}}, 60)
	want := 1.0/61 + 1.0/62
	if !approx(got["a"], want) {
		t.Errorf("a = %v, want %v", got["a"], want)
	}
	if !approx(got["c"], 1.0/61) {
		t.Errorf("c = %v, want %v", got["c"], 1.0/61)
	}
}

func TestFuseRRF_Empty(t *testing.T) {
	got := FuseRRF(nil, 60)
	if len(got) != 0 {
		t.Errorf("expected empty map, got %v", got)
	}
}
