"""
Privacy utilities — PII masking and user_id anonymisation.

All functions are pure/deterministic so they can be called freely
without side-effects.  Import mask_pii / hash_user_id wherever
you need to log or persist user-supplied text.
"""
import re
import hmac
import hashlib

# ---------------------------------------------------------------------------
# PII patterns (compiled once at import time)
# ---------------------------------------------------------------------------
_PII_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Email addresses
    (re.compile(r'[\w.%+\-]+@[\w\-]+\.[\w.\-]+', re.IGNORECASE), '[email]'),
    # Thai mobile (06x / 08x / 09x — 10 digits)
    (re.compile(r'\b0[689]\d{8}\b'), '[phone]'),
    # International phone with country code  e.g. +66812345678
    (re.compile(r'\+\d{1,3}[\s\-]?\d{7,12}\b'), '[phone]'),
    # Thai national ID with hyphens  1-2345-67890-12-3
    (re.compile(r'\b\d{1}-\d{4}-\d{5}-\d{2}-\d{1}\b'), '[national-id]'),
    # 13 consecutive digits (national ID without hyphens)
    (re.compile(r'\b\d{13}\b'), '[national-id]'),
    # Credit / debit card  — 15-16 digit groups separated by space or dash
    (re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{3,4}\b'), '[card]'),
]


def mask_pii(text: str) -> str:
    """Replace PII patterns in *text* with safe placeholder tokens.

    Safe to call on any string — returns the original if nothing matches.
    """
    if not text:
        return text
    for pattern, replacement in _PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


# ---------------------------------------------------------------------------
# User-ID hashing
# ---------------------------------------------------------------------------

def hash_user_id(user_id: str, secret: str = "") -> str:
    """Return a short, irreversible HMAC-SHA256 token for *user_id*.

    The result is a 16-char hex string prefixed with 'u:' so it is
    distinguishable from raw IDs in logs/DB.

    'anonymous' is kept as-is (no value in hashing a known constant).
    """
    if not user_id or user_id.lower() in ("anonymous", ""):
        return "anonymous"
    key = (secret or "carmen-privacy-default").encode()
    digest = hmac.new(key, user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return "u:" + digest[:16]
