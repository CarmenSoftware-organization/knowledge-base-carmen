package services

import (
	"strings"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/chatconfig"
)

// MatchesPathRules reports whether a chunk path should receive a path boost for
// this question: some rule has a keyword present in the question AND a pattern
// matching the path. Patterns are SQL LIKE globs ('%' = wildcard); matching is
// case-insensitive. Mirrors the Python path-rule boost in retrieval.py.
func MatchesPathRules(path, question string, rules []chatconfig.PathRule) bool {
	lqPath := strings.ToLower(path)
	lqQuestion := strings.ToLower(question)
	for _, rule := range rules {
		if !anyKeywordInQuestion(rule.Keywords, lqQuestion) {
			continue
		}
		for _, pat := range rule.Patterns {
			if likeMatch(lqPath, strings.ToLower(pat)) {
				return true
			}
		}
	}
	return false
}

// MatchedRuleCount returns how many rules have at least one keyword present in
// the question (one count per rule). Used to suppress path boosting for generic
// queries, mirroring retrieval.py get_path_boost_patterns.
func MatchedRuleCount(question string, rules []chatconfig.PathRule) int {
	lq := strings.ToLower(question)
	n := 0
	for _, rule := range rules {
		if anyKeywordInQuestion(rule.Keywords, lq) {
			n++
		}
	}
	return n
}

// anyKeywordInQuestion reports whether any non-empty keyword appears in the lowercased question.
func anyKeywordInQuestion(keywords []string, lqQuestion string) bool {
	for _, kw := range keywords {
		kw = strings.TrimSpace(strings.ToLower(kw))
		if kw != "" && strings.Contains(lqQuestion, kw) {
			return true
		}
	}
	return false
}

// likeMatch evaluates a lowercased SQL LIKE glob (only '%' wildcards) against a
// lowercased subject. '_' is treated literally (path rules don't use it).
func likeMatch(subject, pattern string) bool {
	hasLead := strings.HasPrefix(pattern, "%")
	hasTrail := strings.HasSuffix(pattern, "%")
	core := strings.Trim(pattern, "%")
	// Inner '%' splits the core into ordered fragments that must appear in order.
	frags := strings.Split(core, "%")
	switch {
	case hasLead && hasTrail:
		return containsInOrder(subject, frags)
	case hasLead:
		// must end with the (single) core
		return len(frags) == 1 && strings.HasSuffix(subject, frags[0])
	case hasTrail:
		return len(frags) == 1 && strings.HasPrefix(subject, frags[0])
	default:
		return subject == core
	}
}

// LikeMatch reports whether subject matches a SQL-LIKE glob pattern ('%' wildcard),
// case-insensitively. Supports %x%, x%, %x, and exact x.
func LikeMatch(subject, pattern string) bool {
	return likeMatch(strings.ToLower(subject), strings.ToLower(pattern))
}

// containsInOrder reports whether all non-empty fragments appear in subject in the given order.
func containsInOrder(subject string, frags []string) bool {
	idx := 0
	for _, f := range frags {
		if f == "" {
			continue
		}
		pos := strings.Index(subject[idx:], f)
		if pos < 0 {
			return false
		}
		idx += pos + len(f)
	}
	return true
}
