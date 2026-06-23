package config

import (
	"os"
	"testing"
)

func TestLoad_ExportDefaults(t *testing.T) {
	os.Unsetenv("GOTENBERG_URL")
	os.Unsetenv("EXPORT_IMAGE_BASE_URL")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.Export.GotenbergURL != "" {
		t.Errorf("GotenbergURL default = %q, want empty", AppConfig.Export.GotenbergURL)
	}
}

func TestLoad_ExportFromEnv(t *testing.T) {
	t.Setenv("GOTENBERG_URL", "http://gotenberg:3000")
	t.Setenv("EXPORT_IMAGE_BASE_URL", "https://kb.example.com")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if AppConfig.Export.GotenbergURL != "http://gotenberg:3000" {
		t.Errorf("GotenbergURL = %q", AppConfig.Export.GotenbergURL)
	}
	if AppConfig.Export.ImageBaseURL != "https://kb.example.com" {
		t.Errorf("ImageBaseURL = %q", AppConfig.Export.ImageBaseURL)
	}
}
