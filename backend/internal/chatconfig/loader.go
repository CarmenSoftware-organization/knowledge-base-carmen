// Package chatconfig loads the YAML tuning/intents/path-rules/prompts files
// that drive the native Go chatbot. Values are read from YAML, never hardcoded,
// to preserve parity with the original Python service.
package chatconfig

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Tuning struct {
	Intent    IntentTuning    `yaml:"intent"`
	Retrieval RetrievalTuning `yaml:"retrieval"`
	History   HistoryTuning   `yaml:"history"`
	LLM       LLMTuning       `yaml:"llm"`
}

type IntentTuning struct {
	DefaultThreshold   float64            `yaml:"default_threshold"`
	SoftZoneMin        float64            `yaml:"soft_zone_min"`
	SoftZoneVotes      int                `yaml:"soft_zone_votes"`
	MtimeCheckInterval int                `yaml:"mtime_check_interval"`
	CategoryThresholds map[string]float64 `yaml:"category_thresholds"`
}

type RetrievalTuning struct {
	TopK         int     `yaml:"top_k"`
	MaxDistance  float64 `yaml:"max_distance"`
	FetchK       int     `yaml:"fetch_k"`
	RRFK         int     `yaml:"rrf_k"`
	PathBoostRRF float64 `yaml:"path_boost_rrf"`
}

type HistoryTuning struct {
	ContextLimit int `yaml:"context_limit"`
	MemoryLimit  int `yaml:"memory_limit"`
}

type LLMTuning struct {
	Temperature float64 `yaml:"temperature"`
}

type Intent struct {
	Responses map[string]string `yaml:"responses"`
	Examples  []string          `yaml:"examples"`
}

type PathRule struct {
	Keywords []string `yaml:"keywords"`
	Patterns []string `yaml:"patterns"`
}

type Prompts struct {
	BasePrompt      string `yaml:"BASE_PROMPT"`
	TranslatePrompt string `yaml:"TRANSLATE_PROMPT"`
	RewritePrompt   string `yaml:"REWRITE_PROMPT"`
}

// DefaultDir is the config directory relative to the backend working directory.
func DefaultDir() string { return "config" }

func readYAML(dir, name string, out any) error {
	path := filepath.Join(dir, name)
	data, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read %s: %w", path, err)
	}
	if err := yaml.Unmarshal(data, out); err != nil {
		return fmt.Errorf("parse %s: %w", path, err)
	}
	return nil
}

func LoadTuning(dir string) (*Tuning, error) {
	var t Tuning
	if err := readYAML(dir, "tuning.yaml", &t); err != nil {
		return nil, err
	}
	return &t, nil
}

func LoadIntents(dir string) (map[string]Intent, error) {
	out := map[string]Intent{}
	if err := readYAML(dir, "intents.yaml", &out); err != nil {
		return nil, err
	}
	return out, nil
}

func LoadPathRules(dir string) ([]PathRule, error) {
	var rules []PathRule
	if err := readYAML(dir, "path_rules.yaml", &rules); err != nil {
		return nil, err
	}
	return rules, nil
}

func LoadPrompts(dir string) (*Prompts, error) {
	var p Prompts
	if err := readYAML(dir, "prompts.yaml", &p); err != nil {
		return nil, err
	}
	return &p, nil
}
