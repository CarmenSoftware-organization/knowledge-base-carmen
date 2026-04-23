package utils

import (
	"math"
	"os"
	"strconv"
	"strings"
	"sync"
)

const defaultEmbeddingDim = 2000

var (
	embeddingDimOnce sync.Once
	embeddingDim     int
)

func getEmbeddingDim() int {
	embeddingDimOnce.Do(func() {
		embeddingDim = defaultEmbeddingDim
		raw := strings.TrimSpace(os.Getenv("VECTOR_DIMENSION"))
		if raw == "" {
			return
		}
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			embeddingDim = n
		}
	})
	return embeddingDim
}

// TruncateEmbedding normalizes embedding to exactly EmbeddingDim for PostgreSQL VECTOR.
// - If model returns > EmbeddingDim: truncate to first N dims.
// - If model returns < EmbeddingDim: pad with zeros.
// - Otherwise: return as-is.
func TruncateEmbedding(vec []float32) []float32 {
	dim := getEmbeddingDim()
	if len(vec) == 0 {
		return make([]float32, dim)
	}
	if len(vec) == dim {
		return vec
	}
	if len(vec) > dim {
		return vec[:dim]
	}
	// Pad with zeros when model returns fewer dimensions
	out := make([]float32, dim)
	copy(out, vec)
	return out
}

// NormalizeEmbedding ensures the vector has a magnitude of 1.0.
func NormalizeEmbedding(vec []float32) []float32 {
	var sum float64
	for _, v := range vec {
		sum += float64(v * v)
	}
	mag := float32(math.Sqrt(sum))
	if mag < 1e-9 {
		return vec
	}
	out := make([]float32, len(vec))
	for i, v := range vec {
		out[i] = v / mag
	}
	return out
}

func Float32SliceToPgVector(vec []float32) string {
	if len(vec) == 0 {
		return "[]"
	}
	var b strings.Builder
	b.WriteByte('[')
	for i, v := range vec {
		if i > 0 {
			b.WriteByte(',')
		}
		b.WriteString(strconv.FormatFloat(float64(v), 'f', -1, 32))
	}
	b.WriteByte(']')
	return b.String()
}
