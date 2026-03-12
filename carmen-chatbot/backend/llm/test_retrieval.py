"""Unit tests for RetrievalService (no DB/Ollama required).
Run: python backend/llm/test_retrieval.py -v
Requires: carmen-chatbot as cwd, or: cd carmen-chatbot && python backend/llm/test_retrieval.py
"""
import sys
import unittest
from pathlib import Path

_root = Path(__file__).resolve().parent.parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

# Mock DB/config before import to avoid DB connection in unit tests
import unittest.mock as mock
sys.modules["backend.core.database"] = mock.MagicMock()
with mock.patch.dict("os.environ", {"DB_HOST": "localhost", "DB_NAME": "test", "DB_USER": "x", "DB_PASSWORD": "x", "DB_PORT": "5432"}):
    from backend.llm.retrieval import RetrievalService


class TestRetrievalService(unittest.TestCase):
    def setUp(self):
        self.svc = RetrievalService()

    def test_safe_schema_pattern_valid(self):
        self.assertTrue(self.svc.SAFE_SCHEMA_PATTERN.match("carmen"))
        self.assertTrue(self.svc.SAFE_SCHEMA_PATTERN.match("bu_123"))
        self.assertTrue(self.svc.SAFE_SCHEMA_PATTERN.match("a"))

    def test_safe_schema_pattern_invalid(self):
        self.assertIsNone(self.svc.SAFE_SCHEMA_PATTERN.match(""))
        self.assertIsNone(self.svc.SAFE_SCHEMA_PATTERN.match("car-men"))
        self.assertIsNone(self.svc.SAFE_SCHEMA_PATTERN.match("123abc"))
        self.assertIsNone(self.svc.SAFE_SCHEMA_PATTERN.match("schema; DROP TABLE--"))

    def test_build_path_boost_single_match(self):
        patterns, kw = self.svc.build_path_boost_from_query("วิธีทำ AP invoice")
        self.assertGreater(len(patterns), 0, "expected path boost patterns for AP/invoice query")
        kw_str = " ".join(kw).lower()
        self.assertTrue("ap" in kw_str or "invoice" in kw_str, f"expected ap/invoice in keywords, got {kw}")

    def test_build_path_boost_ambiguous(self):
        patterns, _ = self.svc.build_path_boost_from_query("ap ar gl vendor receipt invoice")
        self.assertEqual(len(patterns), 0)

    def test_format_pgvector(self):
        out = self.svc.format_pgvector([1.0, 2.0, 3.0])
        self.assertEqual(out, "[1.0,2.0,3.0]")


if __name__ == "__main__":
    unittest.main()
