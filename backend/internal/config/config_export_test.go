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

func TestLoad_GotenbergURLSchemeNormalized(t *testing.T) {
	// Render's fromService hostport gives a bare host:port (no scheme); Load must
	// prepend http:// so the http client doesn't misparse "host" as the scheme.
	t.Setenv("GOTENBERG_URL", "gotenberg-abc:3000")
	if err := Load(); err != nil {
		t.Fatalf("Load: %v", err)
	}
	if got := AppConfig.Export.GotenbergURL; got != "http://gotenberg-abc:3000" {
		t.Errorf("GotenbergURL = %q, want http://gotenberg-abc:3000", got)
	}
}

func TestNormalizeGotenbergURL(t *testing.T) {
	cases := map[string]string{
		"":                     "",
		"  ":                   "",
		"gotenberg:3000":       "http://gotenberg:3000",
		"http://gotenberg:3000": "http://gotenberg:3000",
		"https://g.onrender.com": "https://g.onrender.com",
	}
	for in, want := range cases {
		if got := normalizeGotenbergURL(in); got != want {
			t.Errorf("normalizeGotenbergURL(%q) = %q, want %q", in, got, want)
		}
	}
}
