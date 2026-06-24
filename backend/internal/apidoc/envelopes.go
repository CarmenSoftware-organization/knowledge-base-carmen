package apidoc

// This file defines concrete envelope structs for swag (OpenAPI doc generation).
// swag cannot resolve generic instantiations like response.Envelope[T] at parse time,
// so each unique T gets a dedicated concrete struct here.
//
// These types are ONLY used as @Success/@Failure type references in swagger_routes.go
// annotations — they are never instantiated at runtime.
//
// Each envelope's Data field references the REAL payload type from models or services
// so that the generated OpenAPI definitions always stay in sync with the actual structs.

import (
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/models"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
)

// --- Shared inner shapes (mirrored from response package) ---

// swagMeta mirrors response.Meta for pagination.
type swagMeta struct {
	Total  *int `json:"total,omitempty"`
	Limit  *int `json:"limit,omitempty"`
	Offset *int `json:"offset,omitempty"`
}

// SwagErrorBody mirrors response.ErrorBody.
type SwagErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// SwagErrorResponse is the concrete type used in @Failure annotations.
// It mirrors response.ErrorResponse exactly.
type SwagErrorResponse struct {
	Success bool          `json:"success"`
	Error   SwagErrorBody `json:"error"`
}

// --- System ---

// SwagSystemStatusEnvelope wraps models.SystemStatusResponse.
type SwagSystemStatusEnvelope struct {
	Success bool                        `json:"success"`
	Data    models.SystemStatusResponse `json:"data"`
	Meta    *swagMeta                   `json:"meta,omitempty"`
}

// --- Business Units ---

// SwagBusinessUnitsEnvelope wraps []models.BusinessUnit.
type SwagBusinessUnitsEnvelope struct {
	Success bool                  `json:"success"`
	Data    []models.BusinessUnit `json:"data"`
	Meta    *swagMeta             `json:"meta,omitempty"`
}

// SwagProvisionResultEnvelope wraps models.ProvisionResult.
type SwagProvisionResultEnvelope struct {
	Success bool                   `json:"success"`
	Data    models.ProvisionResult `json:"data"`
	Meta    *swagMeta              `json:"meta,omitempty"`
}

// SwagDeprovisionResultEnvelope wraps models.DeprovisionResult.
type SwagDeprovisionResultEnvelope struct {
	Success bool                     `json:"success"`
	Data    models.DeprovisionResult `json:"data"`
	Meta    *swagMeta                `json:"meta,omitempty"`
}

// --- Wiki ---

// SwagWikiEntryListEnvelope wraps []services.WikiEntry.
type SwagWikiEntryListEnvelope struct {
	Success bool               `json:"success"`
	Data    []services.WikiEntry `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

// SwagCategoryEntryListEnvelope wraps []services.CategoryEntry.
type SwagCategoryEntryListEnvelope struct {
	Success bool                   `json:"success"`
	Data    []services.CategoryEntry `json:"data"`
	Meta    *swagMeta              `json:"meta,omitempty"`
}

// SwagSidebarCategoryListEnvelope wraps []services.SidebarCategory.
type SwagSidebarCategoryListEnvelope struct {
	Success bool                     `json:"success"`
	Data    []services.SidebarCategory `json:"data"`
	Meta    *swagMeta                `json:"meta,omitempty"`
}

// SwagWikiCategoryPayloadEnvelope wraps services.WikiCategoryPayload.
type SwagWikiCategoryPayloadEnvelope struct {
	Success bool                       `json:"success"`
	Data    services.WikiCategoryPayload `json:"data"`
	Meta    *swagMeta                  `json:"meta,omitempty"`
}

// SwagWikiContentEnvelope wraps services.WikiContent.
type SwagWikiContentEnvelope struct {
	Success bool                 `json:"success"`
	Data    services.WikiContent `json:"data"`
	Meta    *swagMeta            `json:"meta,omitempty"`
}

// SwagSearchResultListEnvelope wraps []services.SearchResult.
type SwagSearchResultListEnvelope struct {
	Success bool                   `json:"success"`
	Data    []services.SearchResult `json:"data"`
	Meta    *swagMeta              `json:"meta,omitempty"`
}

// SwagSyncResultEnvelope wraps services.SyncResult.
type SwagSyncResultEnvelope struct {
	Success bool               `json:"success"`
	Data    services.SyncResult `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

// SwagSyncAuditResultEnvelope wraps services.SyncAuditResult.
type SwagSyncAuditResultEnvelope struct {
	Success bool                    `json:"success"`
	Data    services.SyncAuditResult `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

// --- FAQ ---

// FAQModuleEnvelope documents GET /api/faq/{module} which returns a dynamic map.
// The endpoint returns map[string]interface{} so a typed envelope cannot be used here.
type FAQModuleEnvelope struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data"`
}

// SwagFAQModuleListEnvelope wraps []services.FAQModule.
type SwagFAQModuleListEnvelope struct {
	Success bool               `json:"success"`
	Data    []services.FAQModule `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

// SwagFAQCategoryResponseEnvelope wraps services.FAQCategoryResponse.
type SwagFAQCategoryResponseEnvelope struct {
	Success bool                        `json:"success"`
	Data    services.FAQCategoryResponse `json:"data"`
	Meta    *swagMeta                   `json:"meta,omitempty"`
}

// SwagFAQEntryDetailEnvelope wraps services.FAQEntryDetail.
type SwagFAQEntryDetailEnvelope struct {
	Success bool                    `json:"success"`
	Data    services.FAQEntryDetail `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

// --- Documents ---

// SwagDocumentSummaryListEnvelope wraps []models.DocumentSummary.
type SwagDocumentSummaryListEnvelope struct {
	Success bool                    `json:"success"`
	Data    []models.DocumentSummary `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

// --- Activity ---

// SwagActivityLogListEnvelope wraps []models.ActivityLog.
type SwagActivityLogListEnvelope struct {
	Success bool                `json:"success"`
	Data    []models.ActivityLog `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

// SwagActivitySummaryEnvelope wraps models.ActivitySummary.
type SwagActivitySummaryEnvelope struct {
	Success bool                   `json:"success"`
	Data    models.ActivitySummary `json:"data"`
	Meta    *swagMeta              `json:"meta,omitempty"`
}

// --- Indexing ---

// SwagMessageResultEnvelope wraps models.MessageResult.
type SwagMessageResultEnvelope struct {
	Success bool                 `json:"success"`
	Data    models.MessageResult `json:"data"`
	Meta    *swagMeta            `json:"meta,omitempty"`
}

// SwagReindexOneResultEnvelope wraps models.ReindexOneResult.
type SwagReindexOneResultEnvelope struct {
	Success bool                    `json:"success"`
	Data    models.ReindexOneResult `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

// SwagReindexStatusEnvelope wraps models.ReindexStatus.
type SwagReindexStatusEnvelope struct {
	Success bool                 `json:"success"`
	Data    models.ReindexStatus `json:"data"`
	Meta    *swagMeta            `json:"meta,omitempty"`
}

// SwagReindexUnlockEnvelope wraps models.ReindexUnlock.
type SwagReindexUnlockEnvelope struct {
	Success bool                 `json:"success"`
	Data    models.ReindexUnlock `json:"data"`
	Meta    *swagMeta            `json:"meta,omitempty"`
}

// --- Chat ---

// SwagChatAskResponseEnvelope wraps models.ChatAskResponse.
type SwagChatAskResponseEnvelope struct {
	Success bool                   `json:"success"`
	Data    models.ChatAskResponse `json:"data"`
	Meta    *swagMeta              `json:"meta,omitempty"`
}

// SwagStatusResultEnvelope wraps models.StatusResult.
type SwagStatusResultEnvelope struct {
	Success bool                `json:"success"`
	Data    models.StatusResult `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

// SwagClearResultEnvelope wraps models.ClearResult.
type SwagClearResultEnvelope struct {
	Success bool               `json:"success"`
	Data    models.ClearResult `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

// SwagRecordHistoryResultEnvelope wraps models.RecordHistoryResult.
type SwagRecordHistoryResultEnvelope struct {
	Success bool                        `json:"success"`
	Data    models.RecordHistoryResult  `json:"data"`
	Meta    *swagMeta                   `json:"meta,omitempty"`
}

// SwagListEntryListEnvelope wraps []services.ListEntry.
type SwagListEntryListEnvelope struct {
	Success bool               `json:"success"`
	Data    []services.ListEntry `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

// SwagIntentTestResultEnvelope wraps models.IntentTestResult.
type SwagIntentTestResultEnvelope struct {
	Success bool                    `json:"success"`
	Data    models.IntentTestResult `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

// SwagRouteResultEnvelope wraps models.RouteResult.
type SwagRouteResultEnvelope struct {
	Success bool               `json:"success"`
	Data    models.RouteResult `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}
