import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategories } from "@/lib/wiki-api";
import { DEFAULT_BU } from "@/lib/config";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { CategoryGrid } from "@/components/kb/category-grid";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";

export default async function CategoriesPage() {
  const t = await getTranslations();
  const cookieStore = await cookies();
  const bu = (cookieStore.get("selected_bu")?.value || DEFAULT_BU).trim().toLowerCase();

  let data;
  try {
    data = await getCategories(bu, { next: { revalidate: 300 } });
  } catch (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <KBHeader />
        <MobileSidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            <aside className="hidden md:block w-64 shrink-0"><KBSidebar /></aside>
            <div className="flex-1">
              <Breadcrumb items={[{ label: t("common.categoriesAll") }]} />
              <div className="mt-8 p-12 border border-dashed rounded-[2rem] flex flex-col items-center text-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">{t("errors.loadFailed")}</h2>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  {t("errors.systemError")}
                </p>
              </div>
            </div>
          </div>
        </main>
        <KBFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <KBHeader />
      <MobileSidebar />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 flex flex-col lg:flex-row gap-6 sm:gap-8">
          
          {/* Sidebar - Desktop Only */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24">
              <KBSidebar />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 w-full">
            <Breadcrumb items={[{ label: t("common.categoriesAll") }]} />

            <div className="mt-4 mb-6 sm:mt-6 sm:mb-8 md:mb-10">
              <h1 className="text-2xl font-black leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
                {t("category.documents")}
              </h1>
            </div>

            {/* Client Component */}
            <CategoryGrid items={data.items} />
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}