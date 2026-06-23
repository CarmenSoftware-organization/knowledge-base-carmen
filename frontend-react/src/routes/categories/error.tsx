import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { useTranslations } from "@/i18n/use-translations";

export default function CategoriesError() {
  const t = useTranslations();
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
              <p className="text-muted-foreground mt-2 max-w-xs">{t("errors.systemError")}</p>
            </div>
          </div>
        </div>
      </main>
      <KBFooter />
    </div>
  );
}
