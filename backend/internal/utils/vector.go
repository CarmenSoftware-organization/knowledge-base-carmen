package utils

import (
	"strconv"
	"strings"
)

// Float32SliceToPgVector แปลง []float32 เป็นสตริงรูปแบบ [1,2,3] สำหรับใช้กับ pgvector (::vector)
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

