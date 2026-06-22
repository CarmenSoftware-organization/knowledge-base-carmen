package utils

import "testing"

func TestMaskPII_Email(t *testing.T) {
	if got := MaskPII("a@b.com"); got != "[email]" {
		t.Errorf("email: got %q", got)
	}
}

func TestMaskPII_ThaiMobile(t *testing.T) {
	if got := MaskPII("081 234 5678"); got != "[phone]" {
		t.Errorf("Thai mobile: got %q", got)
	}
}

func TestMaskPII_International(t *testing.T) {
	if got := MaskPII("+66812345678"); got != "[phone]" {
		t.Errorf("international: got %q", got)
	}
}

func TestMaskPII_NationalID13(t *testing.T) {
	if got := MaskPII("1234567890123"); got != "[national-id]" {
		t.Errorf("13-digit national-id: got %q", got)
	}
}

func TestMaskPII_Card16Grouped(t *testing.T) {
	if got := MaskPII("4111 1111 1111 1111"); got != "[card]" {
		t.Errorf("card 16 grouped: got %q", got)
	}
}

func TestMaskPII_Card16NoSep(t *testing.T) {
	if got := MaskPII("4111111111111111"); got != "[card]" {
		t.Errorf("card 16 no-sep: got %q", got)
	}
}

func TestMaskPII_PlainText(t *testing.T) {
	in := "how to login"
	if got := MaskPII(in); got != in {
		t.Errorf("plain text changed: got %q", got)
	}
}

func TestMaskPII_Empty(t *testing.T) {
	if got := MaskPII(""); got != "" {
		t.Errorf("empty: got %q", got)
	}
}

func TestMaskPII_EmailCaseInsensitive(t *testing.T) {
	if got := MaskPII("User@Example.COM"); got != "[email]" {
		t.Errorf("case-insensitive email: got %q", got)
	}
}
