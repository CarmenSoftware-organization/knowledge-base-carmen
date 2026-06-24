package apidoc

// This file defines concrete envelope structs for swag (OpenAPI doc generation).
// swag cannot resolve generic instantiations like response.Envelope[T] at parse time,
// so each unique T gets a dedicated concrete struct here.
//
// These types are ONLY used as @Success/@Failure type references in swagger_routes.go
// annotations — they are never instantiated at runtime.

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
	Success bool                  `json:"success"`
	Data    swagSystemStatusInner `json:"data"`
	Meta    *swagMeta             `json:"meta,omitempty"`
}

type swagSystemStatusInner struct {
	Status   string `json:"status"`
	Database string `json:"database"`
	Version  string `json:"version"`
}

// --- Business Units ---

// SwagBusinessUnitsEnvelope wraps []models.BusinessUnit.
type SwagBusinessUnitsEnvelope struct {
	Success bool              `json:"success"`
	Data    []swagBusinessUnit `json:"data"`
	Meta    *swagMeta         `json:"meta,omitempty"`
}

type swagBusinessUnit struct {
	ID   string `json:"id"`
	Slug string `json:"slug"`
	Name string `json:"name"`
}

// SwagProvisionResultEnvelope wraps models.ProvisionResult.
type SwagProvisionResultEnvelope struct {
	Success bool                `json:"success"`
	Data    swagProvisionResult `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagProvisionResult struct {
	BU      string `json:"bu"`
	Message string `json:"message"`
}

// SwagDeprovisionResultEnvelope wraps models.DeprovisionResult.
type SwagDeprovisionResultEnvelope struct {
	Success bool                  `json:"success"`
	Data    swagDeprovisionResult `json:"data"`
	Meta    *swagMeta             `json:"meta,omitempty"`
}

type swagDeprovisionResult struct {
	BU      string `json:"bu"`
	Message string `json:"message"`
}

// --- Wiki ---

// SwagWikiEntryListEnvelope wraps []services.WikiEntry.
type SwagWikiEntryListEnvelope struct {
	Success bool           `json:"success"`
	Data    []swagWikiEntry `json:"data"`
	Meta    *swagMeta      `json:"meta,omitempty"`
}

type swagWikiEntry struct {
	Title       string   `json:"title"`
	Path        string   `json:"path"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Date        string   `json:"date"`
}

// SwagCategoryEntryListEnvelope wraps []services.CategoryEntry.
type SwagCategoryEntryListEnvelope struct {
	Success bool                `json:"success"`
	Data    []swagCategoryEntry `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagCategoryEntry struct {
	Slug  string `json:"slug"`
	Title string `json:"title"`
	Count int    `json:"count"`
}

// SwagSidebarCategoryListEnvelope wraps []services.SidebarCategory.
type SwagSidebarCategoryListEnvelope struct {
	Success bool                  `json:"success"`
	Data    []swagSidebarCategory `json:"data"`
	Meta    *swagMeta             `json:"meta,omitempty"`
}

type swagSidebarCategory struct {
	Title    string         `json:"title"`
	Slug     string         `json:"slug"`
	Articles []swagWikiEntry `json:"articles"`
}

// SwagWikiCategoryPayloadEnvelope wraps services.WikiCategoryPayload.
type SwagWikiCategoryPayloadEnvelope struct {
	Success bool                    `json:"success"`
	Data    swagWikiCategoryPayload `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

type swagWikiCategoryPayload struct {
	Category swagCategoryEntry `json:"category"`
	Articles []swagWikiEntry   `json:"articles"`
}

// SwagWikiContentEnvelope wraps services.WikiContent.
type SwagWikiContentEnvelope struct {
	Success bool            `json:"success"`
	Data    swagWikiContent `json:"data"`
	Meta    *swagMeta       `json:"meta,omitempty"`
}

type swagWikiContent struct {
	Path    string `json:"path"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

// SwagSearchResultListEnvelope wraps []services.SearchResult.
type SwagSearchResultListEnvelope struct {
	Success bool               `json:"success"`
	Data    []swagSearchResult `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

type swagSearchResult struct {
	Path    string  `json:"path"`
	Title   string  `json:"title"`
	Snippet string  `json:"snippet"`
	Score   float64 `json:"score"`
}

// SwagSyncResultEnvelope wraps services.SyncResult.
type SwagSyncResultEnvelope struct {
	Success bool           `json:"success"`
	Data    swagSyncResult `json:"data"`
	Meta    *swagMeta      `json:"meta,omitempty"`
}

type swagSyncResult struct {
	Added   int    `json:"added"`
	Updated int    `json:"updated"`
	Deleted int    `json:"deleted"`
	Message string `json:"message"`
}

// SwagSyncAuditResultEnvelope wraps services.SyncAuditResult.
type SwagSyncAuditResultEnvelope struct {
	Success bool                `json:"success"`
	Data    swagSyncAuditResult `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagSyncAuditResult struct {
	LastSync string `json:"last_sync"`
	Status   string `json:"status"`
}

// --- FAQ ---

// FAQModuleEnvelope is a concrete alias for swag (cannot use generic with map key types).
type FAQModuleEnvelope struct {
	Success bool                   `json:"success"`
	Data    map[string]interface{} `json:"data"`
}

// SwagFAQModuleListEnvelope wraps []services.FAQModule.
type SwagFAQModuleListEnvelope struct {
	Success bool           `json:"success"`
	Data    []swagFAQModule `json:"data"`
	Meta    *swagMeta      `json:"meta,omitempty"`
}

type swagFAQModule struct {
	Key   string `json:"key"`
	Title string `json:"title"`
}

// SwagFAQCategoryResponseEnvelope wraps services.FAQCategoryResponse.
type SwagFAQCategoryResponseEnvelope struct {
	Success bool                    `json:"success"`
	Data    swagFAQCategoryResponse `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

type swagFAQCategoryResponse struct {
	Category string        `json:"category"`
	Entries  []swagFAQEntry `json:"entries"`
}

type swagFAQEntry struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
}

// SwagFAQEntryDetailEnvelope wraps services.FAQEntryDetail.
type SwagFAQEntryDetailEnvelope struct {
	Success bool               `json:"success"`
	Data    swagFAQEntryDetail `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

type swagFAQEntryDetail struct {
	ID       string `json:"id"`
	Question string `json:"question"`
	Answer   string `json:"answer"`
	Module   string `json:"module"`
	Category string `json:"category"`
}

// --- Documents ---

// SwagDocumentSummaryListEnvelope wraps []models.DocumentSummary.
type SwagDocumentSummaryListEnvelope struct {
	Success bool                  `json:"success"`
	Data    []swagDocumentSummary `json:"data"`
	Meta    *swagMeta             `json:"meta,omitempty"`
}

type swagDocumentSummary struct {
	ID    string `json:"id"`
	Path  string `json:"path"`
	Title string `json:"title"`
	BUID  string `json:"bu_id"`
}

// --- Activity ---

// SwagActivityLogListEnvelope wraps []models.ActivityLog.
type SwagActivityLogListEnvelope struct {
	Success bool               `json:"success"`
	Data    []swagActivityLog  `json:"data"`
	Meta    *swagMeta          `json:"meta,omitempty"`
}

type swagActivityLog struct {
	ID        string `json:"id"`
	Action    string `json:"action"`
	CreatedAt string `json:"created_at"`
}

// SwagActivitySummaryEnvelope wraps models.ActivitySummary.
type SwagActivitySummaryEnvelope struct {
	Success bool                `json:"success"`
	Data    swagActivitySummary `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagActivitySummary struct {
	Total int `json:"total"`
	Today int `json:"today"`
}

// --- Indexing ---

// SwagMessageResultEnvelope wraps models.MessageResult.
type SwagMessageResultEnvelope struct {
	Success bool              `json:"success"`
	Data    swagMessageResult `json:"data"`
	Meta    *swagMeta         `json:"meta,omitempty"`
}

type swagMessageResult struct {
	Message string `json:"message"`
}

// SwagReindexOneResultEnvelope wraps models.ReindexOneResult.
type SwagReindexOneResultEnvelope struct {
	Success bool                `json:"success"`
	Data    swagReindexOneResult `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagReindexOneResult struct {
	Path    string `json:"path"`
	Message string `json:"message"`
}

// SwagReindexStatusEnvelope wraps models.ReindexStatus.
type SwagReindexStatusEnvelope struct {
	Success bool              `json:"success"`
	Data    swagReindexStatus `json:"data"`
	Meta    *swagMeta         `json:"meta,omitempty"`
}

type swagReindexStatus struct {
	Running  bool   `json:"running"`
	Progress int    `json:"progress"`
	Message  string `json:"message"`
}

// SwagReindexUnlockEnvelope wraps models.ReindexUnlock.
type SwagReindexUnlockEnvelope struct {
	Success bool              `json:"success"`
	Data    swagReindexUnlock `json:"data"`
	Meta    *swagMeta         `json:"meta,omitempty"`
}

type swagReindexUnlock struct {
	Message string `json:"message"`
}

// --- Chat ---

// SwagChatAskResponseEnvelope wraps models.ChatAskResponse.
type SwagChatAskResponseEnvelope struct {
	Success bool                `json:"success"`
	Data    swagChatAskResponse `json:"data"`
	Meta    *swagMeta           `json:"meta,omitempty"`
}

type swagChatAskResponse struct {
	Answer  string          `json:"answer"`
	Sources []swagChatSource `json:"sources"`
}

type swagChatSource struct {
	Path  string `json:"path"`
	Title string `json:"title"`
}

// SwagStatusResultEnvelope wraps models.StatusResult.
type SwagStatusResultEnvelope struct {
	Success bool             `json:"success"`
	Data    swagStatusResult `json:"data"`
	Meta    *swagMeta        `json:"meta,omitempty"`
}

type swagStatusResult struct {
	Status string `json:"status"`
}

// SwagClearResultEnvelope wraps models.ClearResult.
type SwagClearResultEnvelope struct {
	Success bool            `json:"success"`
	Data    swagClearResult `json:"data"`
	Meta    *swagMeta       `json:"meta,omitempty"`
}

type swagClearResult struct {
	RoomID  string `json:"room_id"`
	Message string `json:"message"`
}

// SwagRecordHistoryResultEnvelope wraps models.RecordHistoryResult.
type SwagRecordHistoryResultEnvelope struct {
	Success bool                    `json:"success"`
	Data    swagRecordHistoryResult `json:"data"`
	Meta    *swagMeta               `json:"meta,omitempty"`
}

type swagRecordHistoryResult struct {
	LogID   string `json:"log_id"`
	Message string `json:"message"`
}

// SwagListEntryListEnvelope wraps []services.ListEntry.
type SwagListEntryListEnvelope struct {
	Success bool           `json:"success"`
	Data    []swagListEntry `json:"data"`
	Meta    *swagMeta      `json:"meta,omitempty"`
}

type swagListEntry struct {
	ID        string `json:"id"`
	Question  string `json:"question"`
	CreatedAt string `json:"created_at"`
}

// SwagIntentTestResultEnvelope wraps models.IntentTestResult.
type SwagIntentTestResultEnvelope struct {
	Success bool                 `json:"success"`
	Data    swagIntentTestResult `json:"data"`
	Meta    *swagMeta            `json:"meta,omitempty"`
}

type swagIntentTestResult struct {
	Intent string `json:"intent"`
	Score  float64 `json:"score"`
}

// SwagRouteResultEnvelope wraps models.RouteResult.
type SwagRouteResultEnvelope struct {
	Success bool            `json:"success"`
	Data    swagRouteResult `json:"data"`
	Meta    *swagMeta       `json:"meta,omitempty"`
}

type swagRouteResult struct {
	Route      string `json:"route"`
	Confidence float64 `json:"confidence"`
}
