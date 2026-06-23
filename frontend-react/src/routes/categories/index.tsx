import { useLoaderData } from "react-router-dom";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { CategoryGrid } from "@/components/kb/category-grid";
import { getCategories, getSelectedBUClient } from "@/lib/wiki-api";
import { useTranslations } from "@/i18n/use-translations";

type CategoriesData = { items: { slug: string; title: string }[] };

export async function categoriesLoader(): Promise<CategoriesData> {
  const bu = getSelectedBUClient();
  const data = await getCategories(bu);
  return { items: data.items };
}

export default function Categories() {
  const t = useTranslations();
  const { items } = useLoaderData() as CategoriesData;
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24">
              <KBSidebar />
            </div>
          </aside>
          <div className="flex-1 w-full">
            <Breadcrumb items={[{ label: t("common.categoriesAll") }]} />
            <div className="mt-4 mb-6 sm:mt-6 sm:mb-8 md:mb-10">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {t("category.documents")}
              </h1>
            </div>
            <CategoryGrid items={items} />
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
