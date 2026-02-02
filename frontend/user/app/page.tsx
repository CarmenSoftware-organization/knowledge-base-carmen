import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { HeroSection } from "@/components/kb/hero-section";
import { CategoryCards } from "@/components/kb/category-cards";
import { PopularArticles } from "@/components/kb/popular-articles";
import { QuickHelp } from "@/components/kb/quick-help";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <HeroSection />
        <CategoryCards />
        <PopularArticles />
        <QuickHelp />
      </main>
      <KBFooter />
    </div>
  );
}
