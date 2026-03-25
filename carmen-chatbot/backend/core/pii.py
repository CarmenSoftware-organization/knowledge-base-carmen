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
    # Thai mobile (06x / 08x / 09x — 10 digits, with optional dashes/spaces)
    # e.g. 0812345678 / 081-234-5678 / 081 234 5678
    (re.compile(r'\b0[689]\d[\s\-]?\d{3}[\s\-]?\d{4}\b'), '[phone]'),
    # Generic 10-digit with dashes  e.g. 955-584-4455
    (re.compile(r'\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b'), '[phone]'),
    # International phone with country code  e.g. +66812345678 / +66-81-234-5678
    (re.compile(r'\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b'), '[phone]'),
    # Thai national ID with hyphens or spaces  1-2345-67890-12-3 / 1 2345 67890 12 3
    (re.compile(r'\b\d{1}[\s\-]\d{4}[\s\-]\d{5}[\s\-]\d{2}[\s\-]\d{1}\b'), '[national-id]'),
    # 13 consecutive digits (national ID without separator)
    (re.compile(r'\b\d{13}\b'), '[national-id]'),
    # Visa/Mastercard 16 digits — groups of 4 separated by space or dash
    (re.compile(r'\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b'), '[card]'),
    # Visa/Mastercard 16 digits — no separator
    (re.compile(r'\b\d{16}\b'), '[card]'),
    # Amex 15 digits — 4-6-5 format with space or dash
    (re.compile(r'\b\d{4}[\s\-]\d{6}[\s\-]\d{5}\b'), '[card]'),
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
    if not secret:
        raise ValueError("HMAC secret must not be empty — set PRIVACY_HMAC_SECRET in .env")
    key = secret.encode()
    digest = hmac.new(key, user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return "u:" + digest[:16]
