package security

import (
	"regexp"
)

// SafeSchemaPattern validates schema/BU names to prevent SQL injection.
var SafeSchemaPattern = regexp.MustCompile(`^[a-zA-Z_][a-zA-Z0-9_]*$`)

func ValidateSchema(s string) bool {
	return s != "" && SafeSchemaPattern.MatchString(s)
}
