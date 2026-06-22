package utils

import (
	"math"
	"testing"
)

func TestThaiRatio(t *testing.T) {
	cases := []struct {
		name string
		in   string
		want float64
	}{
		{"pure thai", "สวัสดีครับ", 1.0},
		{"pure english", "hello world", 0.0},
		{"empty", "", 0.0},
		{"whitespace only", "   \n\t", 0.0},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := ThaiRatio(c.in)
			if math.Abs(got-c.want) > 1e-9 {
				t.Errorf("ThaiRatio(%q) = %v, want %v", c.in, got, c.want)
			}
		})
	}
}

func TestIsThai_Boundary(t *testing.T) {
	// 2 Thai runes out of 10 non-whitespace runes = 0.20 >= 0.15 → Thai
	if !IsThai("กขabcdefgh") {
		t.Error("expected 0.20 ratio to be Thai")
	}
	// 1 Thai rune out of 10 = 0.10 < 0.15 → not Thai
	if IsThai("กabcdefghi") {
		t.Error("expected 0.10 ratio to be non-Thai")
	}
}
