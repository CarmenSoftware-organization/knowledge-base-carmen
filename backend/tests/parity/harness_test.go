package parity

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/config"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/database"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/pkg/openrouter"
)

type goldenEntry struct {
	Question      string   `json:"question"`
	BU            string   `json:"bu"`
	ExpectedPaths []string `json:"expected_paths"`
}

func TestGoldenSetRecall(t *testing.T) {
	if os.Getenv("RUN_DB_TESTS") != "1" {
		t.Skip("set RUN_DB_TESTS=1 (and reachable DB + LLM_API_KEY) to run the golden-set parity harness")
	}
	// Point CHAT_CONFIG_DIR to backend/config so NewRetrievalService can load
	// tuning.yaml and path_rules.yaml when the test runs from tests/parity/.
	t.Setenv("CHAT_CONFIG_DIR", "../../config")
	if err := config.Load(); err != nil {
		t.Skipf("config: %v", err)
	}
	if err := database.Connect(); err != nil {
		t.Skipf("DB unreachable: %v", err)
	}
	raw, err := os.ReadFile("golden_set.json")
	if err != nil {
		t.Fatalf("read golden_set.json: %v", err)
	}
	var entries []goldenEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		t.Fatalf("parse golden set: %v", err)
	}

	embedder := openrouter.NewClient()
	rs := services.NewRetrievalService()
	for _, e := range entries {
		t.Run(e.Question, func(t *testing.T) {
			emb, err := embedder.Embedding(e.Question)
			if err != nil {
				t.Skipf("embedding failed (LLM unreachable): %v", err)
			}
			chunks, err := rs.Retrieve(e.BU, e.Question, emb)
			if err != nil {
				t.Fatalf("retrieve: %v", err)
			}
			for _, want := range e.ExpectedPaths {
				if !anyPathMatches(chunks, want) {
					t.Errorf("expected path %q not in top-%d for %q", want, len(chunks), e.Question)
				}
			}
		})
	}
}

func anyPathMatches(chunks []services.RetrievedChunk, glob string) bool {
	for _, c := range chunks {
		if services.LikeMatch(c.Path, glob) {
			return true
		}
	}
	return false
}
