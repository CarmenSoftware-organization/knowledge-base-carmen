package security

import (
	"regexp"
)

// SafeSchemaPattern validates schema/BU names to prevent SQL injection.
var SafeSchemaPattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

// ValidateSchema reports whether s is a non-empty, safe schema/BU name.
func ValidateSchema(s string) bool {
	return s != "" && SafeSchemaPattern.MatchString(s)
}
