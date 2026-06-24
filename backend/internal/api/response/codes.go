package response

import "github.com/gofiber/fiber/v2"

// Domain error codes — stable strings clients may branch on.
const (
	CodeInvalidBU                = "INVALID_BU"
	CodeBUNotFound               = "BU_NOT_FOUND"
	CodeInvalidSlug              = "INVALID_SLUG"
	CodeCannotDeprovisionDefault = "CANNOT_DEPROVISION_DEFAULT"
	CodeInvalidBody              = "INVALID_BODY"
	CodeMissingParam             = "MISSING_PARAM"
	CodeInvalidID                = "INVALID_ID"
	CodeInvalidMessageID         = "INVALID_MESSAGE_ID"
	CodeInvalidScore             = "INVALID_SCORE"
	CodeNotFound                 = "NOT_FOUND"
	CodeFeedbackTargetNotFound   = "FEEDBACK_TARGET_NOT_FOUND"
	CodeReindexRunning           = "REINDEX_RUNNING"
	CodeEmbeddingFailed          = "EMBEDDING_FAILED"
	CodeInternal                 = "INTERNAL"
	CodeBadRequest               = "BAD_REQUEST"
	CodeUnauthorized             = "UNAUTHORIZED"
	CodeForbidden                = "FORBIDDEN"
	CodeConflict                 = "CONFLICT"
)

// codeForStatus maps an HTTP status to a default code for errors that did not go
// through response.Fail (used by ErrorHandler).
func codeForStatus(status int) string {
	switch status {
	case fiber.StatusBadRequest:
		return CodeBadRequest
	case fiber.StatusUnauthorized:
		return CodeUnauthorized
	case fiber.StatusForbidden:
		return CodeForbidden
	case fiber.StatusNotFound:
		return CodeNotFound
	case fiber.StatusConflict:
		return CodeConflict
	default:
		return CodeInternal
	}
}
