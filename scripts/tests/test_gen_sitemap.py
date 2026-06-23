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

    def _make_fixture(self):
        for p in [
            ".git",
            "node_modules",
            "backend/internal/api/deep",
            "contents/carmen/configuration",
            "contents/carmen/_images",
            "contents/blueledgers/Material",
        ]:
            (self.tmp / p).mkdir(parents=True, exist_ok=True)
        (self.tmp / "contents/carmen/configuration/index.md").write_text(
            "---\ntitle: Configuration\n---\n", encoding="utf-8"
        )
        (self.tmp / "contents/carmen/a.md").write_text("x", encoding="utf-8")
        (self.tmp / "contents/carmen/b.md").write_text("x", encoding="utf-8")
        return self.tmp

    def test_build_tree_structure_and_rules(self):
        root = self._make_fixture()
        tree = gen_sitemap.build_tree(root)
        self.assertNotIn(".git", tree)
        self.assertNotIn("node_modules", tree)
        self.assertNotIn("_images", tree)
        self.assertIn("backend/", tree)
        self.assertIn("api/", tree)               # depth 3 shown
        self.assertNotIn("deep/", tree)           # depth 4 beyond MAX_DEPTH
        self.assertIn("carmen/  (3 md)", tree)    # BU md count
        self.assertIn("— Configuration", tree)    # index.md title annotation
        self.assertLess(                          # deterministic sort
            tree.index("blueledgers/"), tree.index("carmen/")
        )

    def test_count_md_recursive(self):
        self._make_fixture()
        self.assertEqual(gen_sitemap.count_md(self.tmp / "contents/carmen"), 3)

    def test_replace_only_between_markers(self):
        content = (
            "intro\n"
            + gen_sitemap.BEGIN_MARKER
            + "\n```\nOLD\n```\n"
            + gen_sitemap.END_MARKER
            + "\noutro\n"
        )
        out = gen_sitemap.replace_marker_span(content, "NEWTREE")
        self.assertIn("intro", out)
        self.assertIn("outro", out)
        self.assertIn("NEWTREE", out)
        self.assertNotIn("OLD", out)
        self.assertEqual(out.count(gen_sitemap.BEGIN_MARKER), 1)
        self.assertEqual(out.count(gen_sitemap.END_MARKER), 1)

    def test_missing_markers_raises(self):
        with self.assertRaises(ValueError):
            gen_sitemap.replace_marker_span("no markers here", "x")


if __name__ == "__main__":
    unittest.main()
