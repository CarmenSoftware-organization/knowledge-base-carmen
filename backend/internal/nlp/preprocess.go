package nlp

import (
	"regexp"
	"strings"
)

// Thai stop words ที่ไม่ช่วยในการค้นหา 
var stopWords = map[string]bool{
	"วิธี": true, "การ": true, "ทำ": true, "ใช้": true, "ได้": true,
	"คือ": true, "และ": true, "หรือ": true, "ใน": true, "ของ": true,
	"กับ": true, "ที่": true, "เป็น": true, "มี": true, "จะ": true,
	"how": true, "to": true, "the": true, "a": true, "an": true,
}


func Preprocess(query string) string {
	s := strings.TrimSpace(strings.ToLower(query))
	if s == "" {
		return ""
	}
	
	re := regexp.MustCompile(`(\p{L})\.`)
	s = re.ReplaceAllString(s, "$1")
	
	s = strings.TrimSuffix(s, ".")
	
	words := strings.Fields(s)
	var kept []string
	for _, w := range words {
		if len(w) < 2 {
			continue
		}
		if stopWords[w] {
			continue
		}
		kept = append(kept, w)
	}
	return strings.Join(kept, " ")
}
