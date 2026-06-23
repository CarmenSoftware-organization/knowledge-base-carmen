package export

import (
	"context"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"
)

// Deps are the injectable url-safety check and fetcher (production: IsURLSafe,
// SafeFetch). Injecting them keeps EmbedSafeImages unit-testable without network.
type Deps struct {
	IsSafe func(ctx context.Context, url string) bool
	Fetch  func(ctx context.Context, url string) (body []byte, contentType string, err error)
}

var (
	imgTagRe = regexp.MustCompile(`(?i)<img\b[^>]*>`)
	imgSrcRe = regexp.MustCompile(`(?i)\bsrc="([^"]*)"`)
	// safeMIMERe matches a conservative media type token (type/subtype). It
	// deliberately excludes quotes, angle brackets, and whitespace so a hostile
	// upstream Content-Type cannot break out of the data: URI's src="..." (HTML
	// attribute injection) when the document is later rendered.
	safeMIMERe = regexp.MustCompile(`^[a-zA-Z0-9][a-zA-Z0-9.+-]*/[a-zA-Z0-9][a-zA-Z0-9.+-]*$`)
)

// sanitizeMIME reduces a Content-Type to its bare, validated media type. Params
// (e.g. "; charset=…") are dropped; anything not matching a safe token falls
// back to image/png. The fetched image server controls this header, so it must
// never be interpolated into HTML unchecked.
func sanitizeMIME(ct string) string {
	mt := strings.TrimSpace(strings.SplitN(ct, ";", 2)[0])
	if safeMIMERe.MatchString(mt) {
		return mt
	}
	return "image/png"
}

// EmbedSafeImages rewrites every <img> in html: data:/blob: kept; relative "/x"
// resolved against baseURL; absolute http(s) validated then fetched and inlined
// as a base64 data: URI; unsafe or unsupported srcs stripped. A fetch error
// leaves the (resolved) absolute URL in place. Tags without src are untouched.
func EmbedSafeImages(ctx context.Context, html, baseURL string, d Deps) string {
	return imgTagRe.ReplaceAllStringFunc(html, func(tag string) string {
		m := imgSrcRe.FindStringSubmatch(tag)
		if m == nil {
			return tag
		}
		src := m[1]
		low := strings.ToLower(src)
		if strings.HasPrefix(low, "data:") || strings.HasPrefix(low, "blob:") {
			return tag
		}
		var fetchURL string
		switch {
		case strings.HasPrefix(src, "/"):
			fetchURL = baseURL + src
		case strings.HasPrefix(low, "http://") || strings.HasPrefix(low, "https://"):
			fetchURL = src
		default:
			return "" // unsupported scheme — strip
		}
		if !d.IsSafe(ctx, fetchURL) {
			return "" // unsafe host — strip
		}
		body, ct, err := d.Fetch(ctx, fetchURL)
		if err != nil {
			// leave as resolved absolute URL (matches the original behavior)
			return strings.Replace(tag, m[0], fmt.Sprintf(`src="%s"`, fetchURL), 1)
		}
		dataURI := fmt.Sprintf("data:%s;base64,%s", sanitizeMIME(ct), base64.StdEncoding.EncodeToString(body))
		return strings.Replace(tag, m[0], fmt.Sprintf(`src="%s"`, dataURI), 1)
	})
}
