package export

import (
	"strings"
	"testing"
)

func TestWrapHTML(t *testing.T) {
	out := WrapHTML(`<p>hello</p>`)
	if !strings.Contains(out, "<p>hello</p>") {
		t.Error("body not embedded")
	}
	if !strings.Contains(out, "<!DOCTYPE html>") || !strings.Contains(out, "<style>") {
		t.Error("missing doctype/style wrapper")
	}
	if !strings.Contains(out, "font-family") {
		t.Error("missing style rules")
	}
}
