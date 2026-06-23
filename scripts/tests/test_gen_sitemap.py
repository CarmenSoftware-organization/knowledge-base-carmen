import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import gen_sitemap


class GenSitemapTest(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmpdir.name)
        self._orig = (gen_sitemap.REPO_ROOT, gen_sitemap.SITEMAP)

    def tearDown(self):
        gen_sitemap.REPO_ROOT, gen_sitemap.SITEMAP = self._orig
        self._tmpdir.cleanup()

    def test_reads_quoted_and_plain_title(self):
        (self.tmp / "a.md").write_text(
            "---\ntitle: Configuration\nlang: th-TH\n---\n# x\n", encoding="utf-8"
        )
        (self.tmp / "b.md").write_text(
            '---\ntitle: "Untitled"\n---\n', encoding="utf-8"
        )
        self.assertEqual(
            gen_sitemap.read_frontmatter_title(self.tmp / "a.md"), "Configuration"
        )
        self.assertEqual(
            gen_sitemap.read_frontmatter_title(self.tmp / "b.md"), "Untitled"
        )

    def test_returns_none_without_frontmatter_or_title(self):
        (self.tmp / "c.md").write_text("# no frontmatter\n", encoding="utf-8")
        (self.tmp / "d.md").write_text("---\nlang: th-TH\n---\n", encoding="utf-8")
        self.assertIsNone(gen_sitemap.read_frontmatter_title(self.tmp / "c.md"))
        self.assertIsNone(gen_sitemap.read_frontmatter_title(self.tmp / "d.md"))


if __name__ == "__main__":
    unittest.main()
