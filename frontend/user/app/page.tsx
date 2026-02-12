import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { HeroSection } from "@/components/kb/hero-section";
import { CategoryCards } from "@/components/kb/category-cards";
import { PopularArticles } from "@/components/kb/popular-articles";
import { QuickHelp } from "@/components/kb/quick-help";
import { getCategories, getCategory } from "@/lib/wiki-api";

export default async function HomePage() {
  // ดึงหมวดจริงจาก backend
  const { items: categories } = await getCategories();

  //  ดึงจำนวนบทความแต่ละหมวด
  const categoriesWithCount = await Promise.all(
    categories.map(async (cat) => {
      try {
        const data = await getCategory(cat.slug);
        return {
          slug: cat.slug,
          articleCount: data.items.length,
        };
      } catch {
        return {
          slug: cat.slug,
          articleCount: 0,
        };
      }
    })
  );

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
