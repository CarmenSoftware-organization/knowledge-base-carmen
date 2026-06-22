package config

import (
	"os"
	"path/filepath"
	"testing"
)

// isolatedLoad writes a temp override .env that resets fields under test to
// their hardcoded defaults, points BACKEND_DOTENV at that file (loaded last
// by loadDotEnv, so it wins over backend/.env), then calls Load().
// t.Setenv restores every env var automatically after the test.
func isolatedLoad(t *testing.T, extra ...string) error {
	t.Helper()

	// Build a temp override env file: set every field tested here to its
	// code-default so the test is independent of whatever backend/.env has.
	overrides := []string{
		"PRIVACY_HMAC_SECRET=0123456789abcdef0123456789abcdef",
		"DAILY_REQUEST_LIMIT=",
		"RATE_LIMIT_PER_MINUTE=",
		"MAX_PROMPT_TOKENS=",
		"LLM_INTENT_MODEL=",
		"OPENROUTER_INTENT_MODEL=",
		"LLM_FALLBACK_MODEL=",
		"CHAT_NATIVE_STREAM=",
		"CHAT_NATIVE_ROOMS=",
		"CHAT_NATIVE_FEEDBACK=",
	}
	overrides = append(overrides, extra...)

	content := ""
	for _, line := range overrides {
		content += line + "\n"
	}

	dir := t.TempDir()
	envFile := filepath.Join(dir, "test_override.env")
	if err := os.WriteFile(envFile, []byte(content), 0600); err != nil {
		t.Fatalf("write temp env: %v", err)
	}

	t.Setenv("BACKEND_DOTENV", envFile)
	return Load()
}

func TestLoad_ChatDefaults(t *testing.T) {
	// isolatedLoad sets BACKEND_DOTENV to a temp file that clears any .env
	// overrides so code-defaults are exercised.
	if err := isolatedLoad(t); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.LLM.IntentModel != "google/gemini-2.5-flash-lite" {
		t.Errorf("IntentModel = %q", AppConfig.LLM.IntentModel)
	}
	if AppConfig.LLM.MaxPromptTokens != 6000 {
		t.Errorf("MaxPromptTokens = %d, want 6000", AppConfig.LLM.MaxPromptTokens)
	}
	if AppConfig.Chat.DailyRequestLimit != 1000 {
		t.Errorf("DailyRequestLimit = %d, want 1000", AppConfig.Chat.DailyRequestLimit)
	}
	if AppConfig.Chat.RateLimitPerMin != "20/minute" {
		t.Errorf("RateLimitPerMin = %q", AppConfig.Chat.RateLimitPerMin)
	}
	if AppConfig.ChatNative.Stream || AppConfig.ChatNative.Rooms || AppConfig.ChatNative.Feedback {
		t.Errorf("native flags should default false: %+v", AppConfig.ChatNative)
	}
}

func TestLoad_ChatNativeFlagOn(t *testing.T) {
	if err := isolatedLoad(t, "CHAT_NATIVE_STREAM=true"); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if !AppConfig.ChatNative.Stream {
		t.Error("CHAT_NATIVE_STREAM=true should enable native stream")
	}
}
