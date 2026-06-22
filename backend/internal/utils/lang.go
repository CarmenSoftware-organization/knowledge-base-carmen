package utils

import "unicode"

// ThaiRatio returns the fraction of non-whitespace runes that fall in the Thai
// Unicode block (U+0E00–U+0E7F). Returns 0 when there are no non-whitespace runes.
func ThaiRatio(s string) float64 {
	var total, thai int
	for _, r := range s {
		if unicode.IsSpace(r) {
			continue
		}
		total++
		if r >= 0x0E00 && r <= 0x0E7F {
			thai++
		}
	}
	if total == 0 {
		return 0
	}
	return float64(thai) / float64(total)
}

// IsThai reports whether the text is predominantly Thai (≥15% Thai runes).
// Used to skip PostgreSQL 'simple' FTS, which cannot tokenize Thai.
func IsThai(s string) bool {
	return ThaiRatio(s) >= 0.15
}
