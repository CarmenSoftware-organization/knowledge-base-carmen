package export

import (
	"context"
	"strings"
	"testing"
)

func fakeDeps(safe bool, body string) Deps {
	return Deps{
		IsSafe: func(context.Context, string) bool { return safe },
		Fetch: func(context.Context, string) ([]byte, string, error) {
			return []byte(body), "image/png", nil
		},
	}
}

func TestEmbedSafeImages_KeepsDataURI(t *testing.T) {
	in := `<p><img src="data:image/png;base64,AAA" alt="x"></p>`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(true, "z"))
	if out != in {
		t.Errorf("data: img changed: %q", out)
	}
}

func TestEmbedSafeImages_StripsUnsafe(t *testing.T) {
	in := `a<img src="http://evil/x.png">b`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(false, "z"))
	if strings.Contains(out, "<img") {
		t.Errorf("unsafe img not stripped: %q", out)
	}
	if out != "ab" {
		t.Errorf("got %q want ab", out)
	}
}

func TestEmbedSafeImages_InlinesSafe(t *testing.T) {
	in := `<img src="https://ok/x.png">`
	out := EmbedSafeImages(context.Background(), in, "https://b", fakeDeps(true, "PNGDATA"))
	if !strings.Contains(out, "data:image/png;base64,") {
		t.Errorf("safe img not inlined: %q", out)
	}
}

func TestEmbedSafeImages_ResolvesRelativeThenInlines(t *testing.T) {
	var gotURL string
	d := Deps{
		IsSafe: func(_ context.Context, u string) bool { gotURL = u; return true },
		Fetch:  func(context.Context, string) ([]byte, string, error) { return []byte("d"), "image/jpeg", nil },
	}
	EmbedSafeImages(context.Background(), `<img src="/img/a.png">`, "https://base.test", d)
	if gotURL != "https://base.test/img/a.png" {
		t.Errorf("relative not resolved against base: %q", gotURL)
	}
}

func TestEmbedSafeImages_FetchErrorLeavesURL(t *testing.T) {
	d := Deps{
		IsSafe: func(context.Context, string) bool { return true },
		Fetch:  func(context.Context, string) ([]byte, string, error) { return nil, "", context.DeadlineExceeded },
	}
	out := EmbedSafeImages(context.Background(), `<img src="https://ok/x.png">`, "https://b", d)
	if !strings.Contains(out, `src="https://ok/x.png"`) {
		t.Errorf("fetch-error should leave absolute URL: %q", out)
	}
}

func TestEmbedSafeImages_StripsUnsupportedScheme(t *testing.T) {
	out := EmbedSafeImages(context.Background(), `<img src="javascript:alert(1)">`, "https://b", fakeDeps(true, "z"))
	if strings.Contains(out, "<img") {
		t.Errorf("unsupported scheme not stripped: %q", out)
	}
}

func TestEmbedSafeImages_SanitizesHostileContentType(t *testing.T) {
	d := Deps{
		IsSafe: func(context.Context, string) bool { return true },
		Fetch: func(context.Context, string) ([]byte, string, error) {
			// hostile upstream tries to break out of src="..." and inject markup
			return []byte("x"), `image/png"><script>alert(1)</script>`, nil
		},
	}
	out := EmbedSafeImages(context.Background(), `<img src="https://ok/x.png">`, "https://b", d)
	if strings.Contains(out, "<script>") || strings.Contains(out, `"><`) {
		t.Errorf("content-type breakout not sanitized: %q", out)
	}
	if !strings.Contains(out, "data:image/png;base64,") {
		t.Errorf("expected sanitized MIME fallback to image/png: %q", out)
	}
}

func TestEmbedSafeImages_KeepsContentTypeParams(t *testing.T) {
	d := Deps{
		IsSafe: func(context.Context, string) bool { return true },
		Fetch: func(context.Context, string) ([]byte, string, error) {
			return []byte("x"), "image/jpeg; charset=binary", nil
		},
	}
	out := EmbedSafeImages(context.Background(), `<img src="https://ok/x.png">`, "https://b", d)
	if !strings.Contains(out, "data:image/jpeg;base64,") {
		t.Errorf("expected bare media type image/jpeg: %q", out)
	}
}
