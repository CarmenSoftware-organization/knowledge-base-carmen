// Package export renders chat answers to PDF with SSRF-guarded image inlining
// and a Gotenberg (Chromium) backend. Ported from the former Next.js
// app/api/export/* routes (puppeteer + ssrf-guard + export-images).
package export

import (
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/netip"
	"net/url"
	"time"
)

const (
	defaultFetchTimeout = 8 * time.Second
	defaultMaxBytes     = 20 * 1024 * 1024
)

var errRedirect = errors.New("export: redirects not allowed")

// isBlocked reports whether an IP is internal/reserved and must not be fetched.
func isBlocked(a netip.Addr) bool {
	a = a.Unmap()
	return a.IsLoopback() || a.IsPrivate() || a.IsLinkLocalUnicast() ||
		a.IsLinkLocalMulticast() || a.IsUnspecified()
}

// IsURLSafe reports whether rawURL is safe to fetch server-side: it must be
// http(s) and its host must resolve only to non-blocked addresses. Fails closed.
func IsURLSafe(ctx context.Context, rawURL string) bool {
	u, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	host := u.Hostname()
	if host == "" {
		return false
	}
	if addr, err := netip.ParseAddr(host); err == nil {
		return !isBlocked(addr)
	}
	addrs, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
	if err != nil || len(addrs) == 0 {
		return false
	}
	for _, a := range addrs {
		if isBlocked(a) {
			return false
		}
	}
	return true
}

// SafeFetch GETs rawURL with SSRF protection: http(s) only, the connection is
// pinned to a DNS-validated address (no rebinding), redirects are NOT followed,
// and the body is size-capped. Returns the body and Content-Type.
func SafeFetch(ctx context.Context, rawURL string, maxBytes int64) ([]byte, string, error) {
	if maxBytes <= 0 {
		maxBytes = defaultMaxBytes
	}
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, "", err
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, "", errors.New("export: unsupported scheme")
	}

	baseDialer := &net.Dialer{Timeout: defaultFetchTimeout}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}
			ips, err := net.DefaultResolver.LookupNetIP(ctx, "ip", host)
			if err != nil || len(ips) == 0 {
				return nil, errors.New("export: dns lookup failed")
			}
			for _, ip := range ips {
				if isBlocked(ip) {
					return nil, errors.New("export: ssrf blocked " + ip.String())
				}
			}
			return baseDialer.DialContext(ctx, network, net.JoinHostPort(ips[0].String(), port))
		},
	}
	client := &http.Client{
		Transport:     transport,
		Timeout:       defaultFetchTimeout,
		CheckRedirect: func(*http.Request, []*http.Request) error { return errRedirect },
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, "", errors.New("export: non-2xx " + resp.Status)
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, maxBytes))
	if err != nil {
		return nil, "", err
	}
	ct := resp.Header.Get("Content-Type")
	if ct == "" {
		ct = "image/png"
	}
	return body, ct, nil
}
