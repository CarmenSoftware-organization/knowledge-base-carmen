package services

import (
	"sort"

	"github.com/new-carmen/backend/internal/chatconfig"
	"github.com/new-carmen/backend/internal/utils"
)

type IntentIndex struct {
	matrix [][]float32
	labels []string
	tuning chatconfig.IntentTuning
	canned map[string]map[string]string
}

type IntentMatch struct {
	Intent string
	Score  float64
	Source string
}

func dot(a, b []float32) float64 {
	n := len(a)
	if len(b) < n {
		n = len(b)
	}
	var s float64
	for i := 0; i < n; i++ {
		s += float64(a[i]) * float64(b[i])
	}
	return s
}

func (idx *IntentIndex) categoryThreshold(intent string) float64 {
	if t, ok := idx.tuning.CategoryThresholds[intent]; ok {
		return t
	}
	return idx.tuning.DefaultThreshold
}

// Match runs the vector tier. Returns (match,true) on a hard or soft decision,
// or (_,false) to fall through to the LLM. queryEmb need not be pre-normalized.
func (idx *IntentIndex) Match(queryEmb []float32, haveHistory bool) (IntentMatch, bool) {
	if len(idx.matrix) == 0 {
		return IntentMatch{}, false
	}
	q := utils.NormalizeEmbedding(queryEmb)

	type scored struct {
		label string
		score float64
	}
	all := make([]scored, len(idx.matrix))
	for i, row := range idx.matrix {
		all[i] = scored{idx.labels[i], dot(row, q)}
	}
	sort.SliceStable(all, func(i, j int) bool { return all[i].score > all[j].score })

	topN := 5
	if topN > len(all) {
		topN = len(all)
	}
	top := all[:topN]
	best := top[0]

	// Confusion with active history is a real follow-up — defer to LLM.
	if best.label == "confusion" && haveHistory {
		return IntentMatch{}, false
	}
	if best.score >= idx.categoryThreshold(best.label) {
		return IntentMatch{Intent: best.label, Score: best.score, Source: "vector_hard"}, true
	}
	if best.score >= idx.tuning.SoftZoneMin {
		votes := map[string]int{}
		for _, s := range top {
			if s.score >= idx.tuning.SoftZoneMin {
				votes[s.label]++
			}
		}
		if len(votes) > 0 {
			topCat, topCnt := "", 0
			// deterministic: highest count, tie-break by label
			labels := make([]string, 0, len(votes))
			for l := range votes {
				labels = append(labels, l)
			}
			sort.Strings(labels)
			for _, l := range labels {
				if votes[l] > topCnt {
					topCnt, topCat = votes[l], l
				}
			}
			if topCat != "confusion" && topCnt >= idx.tuning.SoftZoneVotes {
				return IntentMatch{Intent: topCat, Score: best.score, Source: "vector_soft"}, true
			}
		}
	}
	return IntentMatch{}, false
}

func (idx *IntentIndex) Canned(intent, lang string) string {
	if m, ok := idx.canned[intent]; ok {
		return m[lang]
	}
	return ""
}

// best returns the top label/score for the LLM hint (no decisioning).
func (idx *IntentIndex) best(queryEmb []float32) (string, float64) {
	if len(idx.matrix) == 0 {
		return "", 0
	}
	q := utils.NormalizeEmbedding(queryEmb)
	bestLabel, bestScore := "", -1.0
	for i, row := range idx.matrix {
		if sc := dot(row, q); sc > bestScore {
			bestScore, bestLabel = sc, idx.labels[i]
		}
	}
	return bestLabel, bestScore
}

// BuildIntentIndex embeds all intents.yaml examples (batched) into a normalized
// matrix. embedBatch is injected (openrouter.EmbeddingBatch) so callers without
// LLM access can pass a stub. Returns nil index + error on embed failure.
func BuildIntentIndex(intents map[string]chatconfig.Intent, tuning chatconfig.IntentTuning, embedBatch func([]string) ([][]float32, error)) (*IntentIndex, error) {
	var texts []string
	var labels []string
	canned := map[string]map[string]string{}
	// deterministic category order
	cats := make([]string, 0, len(intents))
	for c := range intents {
		cats = append(cats, c)
	}
	sort.Strings(cats)
	for _, c := range cats {
		canned[c] = intents[c].Responses
		for _, ex := range intents[c].Examples {
			texts = append(texts, ex)
			labels = append(labels, c)
		}
	}
	idx := &IntentIndex{labels: labels, tuning: tuning, canned: canned}
	if len(texts) == 0 {
		return idx, nil
	}
	vecs, err := embedBatch(texts)
	if err != nil {
		return nil, err
	}
	idx.matrix = make([][]float32, len(vecs))
	for i, v := range vecs {
		idx.matrix[i] = utils.NormalizeEmbedding(utils.TruncateEmbedding(v))
	}
	return idx, nil
}
