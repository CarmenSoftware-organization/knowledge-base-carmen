package services

import (
	"crypto/sha256"
	"encoding/hex"
	"sort"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

type ScoredRow struct {
	Path    string
	Title   string
	Content string
	Dist    float64 `gorm:"column:dist"`
}

type RetrievedChunk struct {
	Path    string
	Title   string
	Content string
	RRF     float64
	Boosted bool
	Dist    float64
}

func contentKey(content string) string {
	sum := sha256.Sum256([]byte(content))
	return hex.EncodeToString(sum[:])
}

// FuseAndRank fuses the vector and keyword rank lists with RRF, applies the
// path boost, and returns the top cfg.TopK chunks (deduped by content hash).
func FuseAndRank(vec, kw []ScoredRow, cfg chatconfig.RetrievalTuning, question string, rules []chatconfig.PathRule) []RetrievedChunk {
	rowByKey := map[string]ScoredRow{}
	vecKeySet := map[string]bool{}
	vecKeys := make([]string, 0, len(vec))
	for _, r := range vec {
		k := contentKey(r.Content)
		if _, ok := rowByKey[k]; !ok {
			rowByKey[k] = r
		}
		vecKeys = append(vecKeys, k)
		vecKeySet[k] = true
	}
	kwKeys := make([]string, 0, len(kw))
	for _, r := range kw {
		k := contentKey(r.Content)
		if _, ok := rowByKey[k]; !ok {
			rowByKey[k] = r
		}
		kwKeys = append(kwKeys, k)
	}

	fused := utils.FuseRRF([][]string{vecKeys, kwKeys}, cfg.RRFK)

	// Suppress path boosting entirely when the question is generic (≥5 matched rules),
	// mirroring Python retrieval.py get_path_boost_patterns.
	boostSuppressed := MatchedRuleCount(question, rules) >= 5

	type scored struct {
		key       string
		effective float64
		boosted   bool
		dist      float64
	}
	ranked := make([]scored, 0, len(fused))
	for k, base := range fused {
		row := rowByKey[k]
		boosted := !boostSuppressed && MatchesPathRules(row.Path, question, rules)
		eff := base
		if boosted {
			eff += cfg.PathBoostRRF
		}
		// Carry vector distance; keyword-only rows get the Python sentinel 1.0.
		dist := 1.0
		if vecKeySet[k] {
			dist = row.Dist
		}
		ranked = append(ranked, scored{key: k, effective: eff, boosted: boosted, dist: dist})
	}
	sort.Slice(ranked, func(i, j int) bool {
		if ranked[i].effective != ranked[j].effective {
			return ranked[i].effective > ranked[j].effective
		}
		return ranked[i].key < ranked[j].key // deterministic tie-break
	})

	limit := cfg.TopK
	if limit > len(ranked) {
		limit = len(ranked)
	}
	out := make([]RetrievedChunk, 0, limit)
	for _, s := range ranked[:limit] {
		row := rowByKey[s.key]
		out = append(out, RetrievedChunk{
			Path:    row.Path,
			Title:   row.Title,
			Content: row.Content,
			RRF:     s.effective,
			Boosted: s.boosted,
			Dist:    s.dist,
		})
	}
	return out
}
