package services

import (
	"regexp"
	"strings"
)

// directMatch pairs an intent label with its compiled fast-track pattern.
type directMatch struct {
	intent  string
	pattern *regexp.Regexp
}

// Order matches intent_router.py DIRECT_MATCHES. Patterns are compiled
// case-insensitively and anchored; tested against the trimmed+lowercased message.
var directMatches = []directMatch{
	{"greeting", regexp.MustCompile(`(?i)^(สวัสดี|hello|hi|hey|good\s?(morning|afternoon|evening)|yo|sup|ทักทาย|ทัก|เฮลโล|หวัดดี|ดี)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`)},
	{"thanks", regexp.MustCompile(`(?i)^(ขอบคุณ|thank\s?you|thanks|thx|ขอบใจ|เยี่ยม|ดีมาก|ขอบพระคุณ|แต๊ง|กราบ|awesome|perfect)(ครับ|ค่ะ|คร้า|คับ|นะ|จ๊ะ|จ๋า|!)?$`)},
	{"capabilities", regexp.MustCompile(`(?i)^(ทำอะไรได้บ้าง|ช่วยอะไรได้บ้าง|ช่วยยังไง|มึความสามารถอะไร|what can you do|how can you help|features|capabilities)$`)},
	{"confusion", regexp.MustCompile(`(?i)^(อะไรนะ|งง|ไม่เข้าใจ|พูดไรนะ|ไม่รู้เรื่อง|ห๊ะ|ฮะ|what\??|confused|huh\??|eh\??)$`)},
}

// RegexIntent runs the fast-track regex tier. confusion is skipped when history
// is present (an ongoing conversation makes a terse message a real follow-up).
func RegexIntent(message string, haveHistory bool) (string, bool) {
	msg := strings.ToLower(strings.TrimSpace(message))
	for _, dm := range directMatches {
		if dm.intent == "confusion" && haveHistory {
			continue
		}
		if dm.pattern.MatchString(msg) {
			return dm.intent, true
		}
	}
	return "", false
}
