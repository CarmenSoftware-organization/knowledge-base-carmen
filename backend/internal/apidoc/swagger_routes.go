package apidoc

// This package holds Swagger / OpenAPI route comments only (exported no-op functions).
// Regenerate docs: go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go -o docs -d ./cmd/server,./internal/apidoc,./internal/models

// @Summary Health check
// @Description Liveness probe
// @Tags system
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func OpHealth() {}

// @Summary System status
// @Tags system
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/system/status [get]
func OpSystemStatus() {}

// @Summary List business units
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/business-units [get]
func OpBusinessUnits() {}

// @Summary List wiki articles
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/list [get]
func OpWikiList() {}

// @Summary List wiki categories
// @Tags wiki
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/categories [get]
func OpWikiCategories() {}

// @Summary Wiki category detail
// @Tags wiki
// @Produce json
// @Param slug path string true "Category slug"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/category/{slug} [get]
func OpWikiCategory() {}

// @Summary Wiki markdown content
// @Tags wiki
// @Produce plain
// @Param path path string true "Path under wiki root"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {string} string "Markdown body"
// @Router /api/wiki/content/{path} [get]
func OpWikiContent() {}

// @Summary Full-text / vector wiki search
// @Tags wiki
// @Produce json
// @Param q query string true "Search query"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/wiki/search [get]
func OpWikiSearch() {}

// @Summary Sync wiki from Git (admin)
// @Tags wiki
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/wiki/sync [post]
func OpWikiSync() {}

// @Summary Static wiki asset
// @Tags wiki
// @Produce octet-stream
// @Param path path string true "Asset path"
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {file} binary
// @Router /wiki-assets/{path} [get]
func OpWikiAssets() {}

// @Summary GitHub push webhook
// @Tags webhooks
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Router /webhook/github [post]
func OpWebhookGitHub() {}

// @Summary Rebuild search index (admin)
// @Tags indexing
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string true "Business unit slug"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/index/rebuild [post]
func OpIndexRebuild() {}

// @Summary List indexed documents
// @Tags documents
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/documents [get]
func OpDocumentsList() {}

// @Summary Ask the knowledge-base chat (Go path)
// @Tags chat
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Param body body models.ChatAskRequest true "Question"
// @Success 200 {object} models.ChatAskResponse
// @Failure 400 {object} map[string]interface{}
// @Router /api/chat/ask [post]
func OpChatAsk() {}

// @Summary Record chat turn (internal)
// @Tags chat
// @Security InternalKey
// @Accept json
// @Produce json
// @Param body body models.RecordHistoryRequest true "History row"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/chat/record-history [post]
func OpChatRecordHistory() {}

// @Summary List chat history (admin)
// @Tags chat
// @Security AdminKey
// @Produce json
// @Param bu query string false "Filter by BU"
// @Param limit query int false "Max rows" default(50)
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} map[string]string
// @Router /api/chat/history/list [get]
func OpChatHistoryList() {}

// @Summary Route-only debug (admin)
// @Tags chat
// @Security AdminKey
// @Accept json
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Param body body models.ChatAskRequest true "Question"
// @Success 200 {object} models.RouteResult
// @Router /api/chat/route-test [post]
func OpChatRouteTest() {}

// @Summary Proxy to Python chatbot
// @Description Forwards to CHATBOT_URL; path and method vary.
// @Tags chat
// @Router /api/chat/rooms/{bu}/{username} [get]
func OpChatProxyRoomsGet() {}

// @Summary Create chat room (proxy)
// @Tags chat
// @Router /api/chat/rooms [post]
func OpChatProxyRoomsPost() {}

// @Summary Delete room (proxy)
// @Tags chat
// @Router /api/chat/rooms/{room_id} [delete]
func OpChatProxyRoomDelete() {}

// @Summary Room history (proxy)
// @Tags chat
// @Router /api/chat/room-history/{room_id} [get]
func OpChatProxyRoomHistory() {}

// @Summary Clear history (proxy)
// @Tags chat
// @Router /api/chat/history [delete]
func OpChatProxyHistoryDelete() {}

// @Summary Clear room (proxy)
// @Tags chat
// @Router /api/chat/clear/{room_id} [delete]
func OpChatProxyClear() {}

// @Summary Stream chat (proxy)
// @Tags chat
// @Router /api/chat/stream [post]
func OpChatProxyStream() {}

// @Summary Message feedback (proxy)
// @Tags chat
// @Router /api/chat/feedback/{message_id} [post]
func OpChatProxyFeedback() {}

// @Summary Chat / wiki image
// @Tags chat
// @Produce octet-stream
// @Param path path string true "Image path"
// @Param bu query string false "Business unit slug" default(carmen)
// @Router /images/{path} [get]
func OpChatImage() {}

// @Summary FAQ module list
// @Tags faq
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/modules [get]
func OpFAQModules() {}

// @Summary FAQ entry by id
// @Tags faq
// @Produce json
// @Param id path string true "Entry id"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/entry/{id} [get]
func OpFAQEntry() {}

// @Summary FAQ module detail
// @Tags faq
// @Produce json
// @Param module path string true "Module key"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/{module} [get]
func OpFAQModule() {}

// @Summary FAQ by category
// @Tags faq
// @Produce json
// @Param module path string true "Module key"
// @Param sub path string true "Sub-module"
// @Param category path string true "Category"
// @Success 200 {object} map[string]interface{}
// @Router /api/faq/{module}/{sub}/{category} [get]
func OpFAQCategory() {}

// @Summary Activity log list
// @Tags activity
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/activity/list [get]
func OpActivityList() {}

// @Summary Activity summary
// @Tags activity
// @Produce json
// @Param bu query string false "Business unit slug" default(carmen)
// @Success 200 {object} map[string]interface{}
// @Router /api/activity/summary [get]
func OpActivitySummary() {}
