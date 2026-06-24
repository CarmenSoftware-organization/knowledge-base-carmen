package services

// WikiCategoryPayload is the data for GET /api/wiki/category/:slug.
type WikiCategoryPayload struct {
	Category string         `json:"category"`
	Items    []CategoryItem `json:"items"`
}

// SyncResult is the data for POST /api/wiki/sync.
type SyncResult struct {
	Message    string           `json:"message"`
	Audit      *SyncAuditReport `json:"audit,omitempty"`
	AuditError string           `json:"audit_error,omitempty"`
}

// SyncAuditResult is the data for GET /api/wiki/sync/audit.
type SyncAuditResult struct {
	Audit *SyncAuditReport `json:"audit,omitempty"`
}
