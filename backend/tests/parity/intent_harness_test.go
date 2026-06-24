package parity

import (
	"encoding/json"
	"os"
	"testing"

	"github.com/CarmenSoftware-organization/knowledge-base-carmen/backend/internal/services"
)

type intentEntry struct {
	Message     string `json:"message"`
	HaveHistory bool   `json:"have_history"`
	Expected    string `json:"expected"`
	Tier        string `json:"tier"`
}

func TestIntentLabeledSet(t *testing.T) {
	raw, err := os.ReadFile("intent_set.json")
	if err != nil {
		t.Fatalf("read intent_set.json: %v", err)
	}
	var entries []intentEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		t.Fatalf("parse: %v", err)
	}
	full := os.Getenv("RUN_DB_TESTS") == "1"
	if full {
		t.Setenv("CHAT_CONFIG_DIR", "../../config")
	}
	for _, e := range entries {
		e := e
		t.Run(e.Message, func(t *testing.T) {
			if e.Tier != "regex" && !full {
				t.Skip("set RUN_DB_TESTS=1 to exercise vector/LLM tiers")
			}
			var got services.IntentResult
			if e.Tier == "regex" {
				// Regex tier needs no network: use RegexIntent directly (no DB/embed/LLM).
				if intent, ok := services.RegexIntent(e.Message, e.HaveHistory); ok {
					got = services.IntentResult{Type: intent, Source: "regex"}
				}
			} else {
				got = services.NewIntentRouterService().Classify(e.Message, "th", e.HaveHistory)
			}
			if got.Type != e.Expected {
				t.Errorf("Classify(%q) = %q, want %q", e.Message, got.Type, e.Expected)
			}
		})
	}
}
