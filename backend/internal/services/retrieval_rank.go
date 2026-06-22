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
	Dist    float64
}

type RetrievedChunk struct {
	Path    string
	Title   string
	Content string
	RRF     float64
	Boosted bool
}

func contentKey(content string) string {
	sum := sha256.Sum256([]byte(content))
	return hex.EncodeToString(sum[:])
}

// FuseAndRank fuses the vector and keyword rank lists with RRF, applies the
// path boost, and returns the top cfg.TopK chunks (deduped by content hash).
func FuseAndRank(vec, kw []ScoredRow, cfg chatconfig.RetrievalTuning, question string, rules []chatconfig.PathRule) []RetrievedChunk {
	rowByKey := map[string]ScoredRow{}
	vecKeys := make([]string, 0, len(vec))
	for _, r := range vec {
		k := contentKey(r.Content)
		if _, ok := rowByKey[k]; !ok {
			rowByKey[k] = r
		}
		vecKeys = append(vecKeys, k)
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

	type scored struct {
		key       string
		effective float64
		boosted   bool
	}
	ranked := make([]scored, 0, len(fused))
	for k, base := range fused {
		row := rowByKey[k]
		boosted := MatchesPathRules(row.Path, question, rules)
		eff := base
		if boosted {
			eff += cfg.PathBoostRRF
		}
		ranked = append(ranked, scored{key: k, effective: eff, boosted: boosted})
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
		})
	}
	return out
}
