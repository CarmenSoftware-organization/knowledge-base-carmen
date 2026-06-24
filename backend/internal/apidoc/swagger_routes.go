package apidoc

// This package holds Swagger / OpenAPI route comments only (exported no-op functions).
// Regenerate docs: go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs -d ./cmd/server,./internal/apidoc,./internal/models

// OpHealth documents the GET /health liveness probe.
// @Summary Health check
// @Description Lightweight liveness probe; returns {"status":"ok"} without touching the database.
// @Tags system
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func OpHealth() {}

// OpSystemStatus documents the GET /api/system/status endpoint.
// @Summary System status
// @Description Reports overall service status, including database connectivity and basic runtime info.
// @Tags system
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/system/status [get]
func OpSystemStatus() {}

// OpBusinessUnits documents the GET /api/business-units list endpoint.
// @Summary List business units
// @Description Lists the business units (tenants) available for the BU selector, excluding internal auto-provision entries.
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/business-units [get]
func OpBusinessUnits() {}

// OpWikiList documents the GET /api/wiki/list articles endpoint.
// @Summary List wiki articles
// @Description Returns all indexed wiki/markdown articles for the business unit with their metadata (title, path, tags, dates).
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/list [get]
func OpWikiList() {}

// OpWikiCategories documents the GET /api/wiki/categories endpoint.
// @Summary List wiki categories
// @Description Returns the top-level wiki categories (sidebar sections) for the business unit.
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/categories [get]
func OpWikiCategories() {}

// OpWikiCategory documents the GET /api/wiki/category/{slug} detail endpoint.
// @Summary Wiki category detail
// @Description Returns the articles contained in the given category slug for the business unit.
// @Tags wiki
// @Produce json
// @Param slug path string true "Category slug"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/category/{slug} [get]
func OpWikiCategory() {}

// OpWikiContent documents the GET /api/wiki/content/{path} markdown endpoint.
// @Summary Wiki markdown content
// @Description Returns the raw markdown body for the article at the given path under the wiki root.
// @Tags wiki
// @Produce plain
// @Param path path string true "Path under wiki root"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {string} string "Markdown body"
// @Router /api/wiki/content/{path} [get]
func OpWikiContent() {}

// OpWikiSearch documents the GET /api/wiki/search full-text/vector search endpoint.
// @Summary Full-text / vector wiki search
// @Description Hybrid full-text + pgvector search over the business unit's wiki content; returns ranked matches.
// @Tags wiki
// @Produce json
// @Param q query string true "Search query"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/search [get]
func OpWikiSearch() {}

// OpWikiSync documents the admin POST /api/wiki/sync Git-sync endpoint.
// @Summary Sync wiki from Git (admin)
// @Description Clones or pulls the content Git repo and refreshes the wiki on disk. Requires the X-Admin-Key header.
// @Tags wiki
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/wiki/sync [post]
func OpWikiSync() {}

// OpWikiAssets documents the GET /wiki-assets/{path} static asset endpoint.
// @Summary Static wiki asset
// @Description Serves a static wiki asset (image or file) referenced by markdown, resolved under the business unit's content.
// @Tags wiki
// @Produce octet-stream
// @Param path path string true "Asset path"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {file} binary
// @Router /wiki-assets/{path} [get]
func OpWikiAssets() {}

// OpWebhookGitHub documents the POST /webhook/github push webhook endpoint.
// @Summary GitHub push webhook
// @Description Receives GitHub push events and triggers a content sync + reindex for the affected business units.
// @Tags webhooks
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /webhook/github [post]
func OpWebhookGitHub() {}

// OpIndexRebuild documents the admin POST /api/index/rebuild endpoint.
// @Summary Rebuild search index (admin)
// @Description Starts an asynchronous rebuild of the pgvector + full-text search index for the business unit. Requires the X-Admin-Key header.
// @Tags indexing
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string true "Business unit slug"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/index/rebuild [post]
func OpIndexRebuild() {}

// OpDocumentsList documents the GET /api/documents indexed-documents endpoint.
// @Summary List indexed documents
// @Description Lists the documents currently indexed in the database for the business unit.
// @Tags documents
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/documents [get]
func OpDocumentsList() {}

// OpChatAsk documents the POST /api/chat/ask knowledge-base chat endpoint.
// @Summary Ask the knowledge-base chat (Go path)
// @Description Non-streaming RAG chat: retrieves relevant chunks and returns a grounded answer with its sources. Returns a "no information found" message when nothing matches.
// @Tags chat
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Param body body models.ChatAskRequest true "Question"
// @Success 200 {object} models.ChatAskResponse
// @Failure 400 {object} map[string]interface{}
// @Router /api/chat/ask [post]
func OpChatAsk() {}

// OpChatRecordHistory documents the internal POST /api/chat/record-history endpoint.
// @Summary Record chat turn (internal)
// @Description Persists a chat turn (question, answer, sources) to history. Internal-only; requires the X-Internal-API-Key header.
// @Tags chat
// @Security InternalKey
// @Accept json
// @Produce json
// @Param body body models.RecordHistoryRequest true "History row"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/chat/record-history [post]
func OpChatRecordHistory() {}

// OpChatHistoryList documents the admin GET /api/chat/history/list endpoint.
// @Summary List chat history (admin)
// @Description Returns recent chat history rows, optionally filtered by business unit. Requires the X-Admin-Key header.
// @Tags chat
// @Security AdminKey
// @Produce json
// @Param bu query string false "Filter by BU"
// @Param limit query int false "Max rows" default(50)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/chat/history/list [get]
func OpChatHistoryList() {}

// OpChatRouteTest documents the admin POST /api/chat/route-test debug endpoint.
// @Summary Route-only debug (admin)
// @Description Debug endpoint that returns only the intent-router decision for a question, without generating an answer. Requires the X-Admin-Key header.
// @Tags chat
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Param body body models.ChatAskRequest true "Question"
// @Success 200 {object} models.RouteResult
// @Router /api/chat/route-test [post]
func OpChatRouteTest() {}

// OpChatClear documents the DELETE /api/chat/clear/{room_id} no-op ack endpoint.
// @Summary Clear room history (no-op ack; history is frontend-owned)
// @Description Acknowledges a request to clear a chat room. No-op server-side — chat history is owned by the frontend.
// @Tags chat
// @Router /api/chat/clear/{room_id} [delete]
func OpChatClear() {}

// OpChatStream documents the POST /api/chat/stream native NDJSON RAG endpoint.
// @Summary Stream chat (native NDJSON RAG)
// @Description Streaming RAG chat over NDJSON: emits status, sources, answer chunks, suggestions, and a final done event. This is the primary endpoint used by the frontend.
// @Tags chat
// @Router /api/chat/stream [post]
func OpChatStream() {}

// OpChatFeedback documents the POST /api/chat/feedback/{message_id} thumbs endpoint.
// @Summary Message feedback (thumbs up/down)
// @Description Records a thumbs up/down score for a chat message, scoped to the requesting user.
// @Tags chat
// @Router /api/chat/feedback/{message_id} [post]
func OpChatFeedback() {}

// OpChatImage documents the GET /images/{path} chat/wiki image endpoint.
// @Summary Chat / wiki image
// @Description Serves an image referenced by chat answers or wiki content, resolved under the business unit's content.
// @Tags chat
// @Produce octet-stream
// @Param path path string true "Image path"
// @Param bu query string false "Business unit slug" default(carmen)
// @Router /images/{path} [get]
func OpChatImage() {}

// OpFAQModules documents the GET /api/faq/modules list endpoint.
// @Summary FAQ module list
// @Description Lists the available FAQ modules.
// @Tags faq
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/modules [get]
func OpFAQModules() {}

// OpFAQEntry documents the GET /api/faq/entry/{id} single-entry endpoint.
// @Summary FAQ entry by id
// @Description Returns a single FAQ entry by its id.
// @Tags faq
// @Produce json
// @Param id path string true "Entry id"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/entry/{id} [get]
func OpFAQEntry() {}

// OpFAQModule documents the GET /api/faq/{module} detail endpoint.
// @Summary FAQ module detail
// @Description Returns the detail (sub-modules and entries) for the given FAQ module.
// @Tags faq
// @Produce json
// @Param module path string true "Module key"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/{module} [get]
func OpFAQModule() {}

// OpFAQCategory documents the GET /api/faq/{module}/{sub}/{category} listing endpoint.
// @Summary FAQ by category
// @Description Lists FAQ entries under the given module / sub-module / category path.
// @Tags faq
// @Produce json
// @Param module path string true "Module key"
// @Param sub path string true "Sub-module"
// @Param category path string true "Category"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/{module}/{sub}/{category} [get]
func OpFAQCategory() {}

// OpActivityList documents the GET /api/activity/list log endpoint.
// @Summary Activity log list
// @Description Returns the activity log entries for the business unit.
// @Tags activity
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/activity/list [get]
func OpActivityList() {}

// OpActivitySummary documents the GET /api/activity/summary endpoint.
// @Summary Activity summary
// @Description Returns aggregated activity statistics for the business unit.
// @Tags activity
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/activity/summary [get]
func OpActivitySummary() {}
