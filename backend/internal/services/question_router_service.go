package services

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/new-carmen/backend/internal/config"
	makeclient "github.com/new-carmen/backend/pkg/make"
	"github.com/new-carmen/backend/pkg/openclaw"
)

// QuestionRouterResult คือผลลัพธ์จาก OpenClaw
type QuestionRouterResult struct {
	IsAmbiguous bool                       `json:"is_ambiguous"`
	Candidates  []QuestionRouterCandidate  `json:"candidates"`
}

type QuestionRouterCandidate struct {
	Path   string  `json:"path"`
	Reason string  `json:"reason,omitempty"`
	Score  float32 `json:"score,omitempty"`
}

// QuestionRouterService ใช้ OpenClaw หรือ Make (ตาม config) เพื่อเดาว่าควรโฟกัส path ไหนใน carmen_cloud
type QuestionRouterService struct {
	openClaw *openclaw.Client
	make     *makeclient.Client
	wiki     *WikiService
}

func NewQuestionRouterService() *QuestionRouterService {
	return &QuestionRouterService{
		openClaw: openclaw.NewClient(),
		make:     makeclient.NewClient(),
		wiki:     NewWikiService(),
	}
}

// RouteQuestion ใช้ question + รายการไฟล์ทั้งหมด: เรียก Make หรือ OpenClaw (ตาม config) เลือก path ที่เกี่ยวข้อง
func (s *QuestionRouterService) RouteQuestion(question string) (*QuestionRouterResult, error) {
	entries, err := s.wiki.ListMarkdown()
	if err != nil {
		return nil, fmt.Errorf("list markdown failed: %w", err)
	}
	if len(entries) == 0 {
		return nil, fmt.Errorf("no wiki entries to route")
	}

	makeCfg := config.AppConfig.Make
	if makeCfg.UseForQuestionRouter && makeCfg.WebhookURL != "" {
		return s.routeViaMake(question, entries)
	}

	return s.routeViaOpenClaw(question, entries)
}

// routeViaMake ส่ง question + documents ไป Make webhook
func (s *QuestionRouterService) routeViaMake(question string, entries []WikiEntry) (*QuestionRouterResult, error) {
	docs := make([]makeclient.RouteDocEntry, 0, len(entries))
	for _, e := range entries {
		docs = append(docs, makeclient.RouteDocEntry{Path: e.Path, Title: e.Title})
	}
	raw, err := s.make.RouteQuestion(strings.TrimSpace(question), docs)
	if err != nil {
		return nil, err
	}
	var result QuestionRouterResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse Make JSON: %w (raw=%s)", err, raw)
	}
	return &result, nil
}

// routeViaOpenClaw ใช้ OpenClaw แบบเดิม (prompt เป็น text + รายการเอกสาร)
func (s *QuestionRouterService) routeViaOpenClaw(question string, entries []WikiEntry) (*QuestionRouterResult, error) {
	cfg := config.AppConfig.OpenClaw
	if !cfg.Enabled || cfg.URL == "" || cfg.Token == "" {
		return nil, fmt.Errorf("openclaw not enabled")
	}

	var b strings.Builder
	b.WriteString("Question: ")
	b.WriteString(strings.TrimSpace(question))
	b.WriteString("\n\n")
	b.WriteString("You have the following documents from Carmen Cloud. Each line is 'path - title'.\n")
	b.WriteString("Pick the most relevant 1-3 paths. Respond ONLY JSON like:\n")
	b.WriteString(`{"is_ambiguous": true/false, "candidates":[{"path":"...","reason":"...","score":0.0}]}` + "\n\n")
	b.WriteString("Documents:\n")
	for _, e := range entries {
		b.WriteString("- ")
		b.WriteString(e.Path)
		b.WriteString(" - ")
		b.WriteString(e.Title)
		b.WriteString("\n")
	}

	raw, err := s.openClaw.RouteQuestion(b.String())
	if err != nil {
		return nil, err
	}
	var result QuestionRouterResult
	if err := json.Unmarshal([]byte(raw), &result); err != nil {
		return nil, fmt.Errorf("failed to parse OpenClaw JSON: %w (raw=%s)", err, raw)
	}
	return &result, nil
}

