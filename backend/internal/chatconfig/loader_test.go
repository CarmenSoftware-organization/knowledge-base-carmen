package chatconfig

import "testing"

func dir(t *testing.T) string {
	t.Helper()
	return "../../config" // tests run from package dir; repo backend/config
}

func TestLoadTuning_Constants(t *testing.T) {
	tn, err := LoadTuning(dir(t))
	if err != nil {
		t.Fatalf("LoadTuning: %v", err)
	}
	if tn.Intent.DefaultThreshold != 0.90 {
		t.Errorf("DefaultThreshold = %v, want 0.90", tn.Intent.DefaultThreshold)
	}
	if tn.Intent.SoftZoneMin != 0.75 || tn.Intent.SoftZoneVotes != 2 {
		t.Errorf("soft zone = (%v,%v), want (0.75,2)", tn.Intent.SoftZoneMin, tn.Intent.SoftZoneVotes)
	}
	if got := tn.Intent.CategoryThresholds["company_info"]; got != 0.82 {
		t.Errorf("company_info threshold = %v, want 0.82", got)
	}
	if tn.Retrieval.TopK != 4 || tn.Retrieval.FetchK != 20 || tn.Retrieval.RRFK != 60 {
		t.Errorf("retrieval = %+v, want top_k4 fetch20 rrf60", tn.Retrieval)
	}
	if tn.Retrieval.MaxDistance != 0.45 || tn.Retrieval.PathBoostRRF != 0.02 {
		t.Errorf("retrieval floats = %+v", tn.Retrieval)
	}
	if tn.History.ContextLimit != 4 || tn.History.MemoryLimit != 20 {
		t.Errorf("history = %+v, want 4/20", tn.History)
	}
	if tn.LLM.Temperature != 0.82 {
		t.Errorf("temperature = %v, want 0.82", tn.LLM.Temperature)
	}
}

func TestLoadIntents_Greeting(t *testing.T) {
	intents, err := LoadIntents(dir(t))
	if err != nil {
		t.Fatalf("LoadIntents: %v", err)
	}
	g, ok := intents["greeting"]
	if !ok {
		t.Fatal("greeting intent missing")
	}
	if g.Responses["th"] == "" || g.Responses["en"] == "" {
		t.Errorf("greeting responses incomplete: %+v", g.Responses)
	}
	if len(g.Examples) == 0 {
		t.Error("greeting examples empty")
	}
}

func TestLoadPathRules_NonEmpty(t *testing.T) {
	rules, err := LoadPathRules(dir(t))
	if err != nil {
		t.Fatalf("LoadPathRules: %v", err)
	}
	if len(rules) == 0 {
		t.Fatal("no path rules loaded")
	}
	if len(rules[0].Keywords) == 0 || len(rules[0].Patterns) == 0 {
		t.Errorf("first rule malformed: %+v", rules[0])
	}
}

func TestLoadPrompts_Keys(t *testing.T) {
	p, err := LoadPrompts(dir(t))
	if err != nil {
		t.Fatalf("LoadPrompts: %v", err)
	}
	if p.BasePrompt == "" || p.TranslatePrompt == "" || p.RewritePrompt == "" {
		t.Errorf("prompts incomplete: base=%d translate=%d rewrite=%d",
			len(p.BasePrompt), len(p.TranslatePrompt), len(p.RewritePrompt))
	}
}
