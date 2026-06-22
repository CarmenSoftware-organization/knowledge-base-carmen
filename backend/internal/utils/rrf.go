package utils

// FuseRRF merges several ranked lists using Reciprocal Rank Fusion.
// Each inner slice holds keys in descending relevance (index 0 = rank 1).
// The fused score for a key is the sum over all lists of 1/(k + rank),
// with ranks 1-indexed. k smooths the contribution of low ranks (default 60).
func FuseRRF(rankedLists [][]string, k int) map[string]float64 {
	scores := make(map[string]float64)
	for _, list := range rankedLists {
		for i, key := range list {
			rank := i + 1
			scores[key] += 1.0 / float64(k+rank)
		}
	}
	return scores
}
