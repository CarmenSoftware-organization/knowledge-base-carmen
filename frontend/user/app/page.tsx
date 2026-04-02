import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { HeroSection } from "@/components/kb/hero-section";
import { CategoryCards } from "@/components/kb/category-cards";
import { QuickHelp } from "@/components/kb/quick-help";
import { API_BASE, DEFAULT_BU } from "@/lib/config";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();

  // Single request: get full sidebar tree (counts articles per category)
  let categoriesWithCount: { slug: string; articleCount: number }[] = [];
  try {
    const res = await fetch(`${API_BASE}/api/wiki/sidebar?bu=${bu}`, {
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const json = await res.json();
      const tree: { slug: string; articles: unknown[] }[] = json.categories ?? [];
      categoriesWithCount = tree
        .filter((cat) => cat.slug !== "changelog")
        .map((cat) => ({ slug: cat.slug, articleCount: cat.articles.length }));
    }
  } catch {
    // backend down — still render shell
  }

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <HeroSection />
        <CategoryCards categories={categoriesWithCount} />
        <QuickHelp />
      </main>
      <KBFooter />
    </div>
  );
}
