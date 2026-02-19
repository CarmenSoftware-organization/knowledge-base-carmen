import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { getCategories } from "@/lib/wiki-api";
import { MobileSidebar } from "@/components/kb/mobile-sidebar";
import { CategoryGrid } from "@/components/kb/category-grid";

export default async function CategoriesPage() {
  let data;
  try {
    data = await getCategories();
  } catch (error) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <KBHeader />
        <MobileSidebar />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
            <aside className="hidden md:block w-64 shrink-0"><KBSidebar /></aside>
            <div className="flex-1">
              <Breadcrumb items={[{ label: "หมวดหมู่ทั้งหมด" }]} />
              <div className="mt-8 p-12 border border-dashed rounded-[2rem] flex flex-col items-center text-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-900">ไม่สามารถโหลดข้อมูลได้</h2>
                <p className="text-muted-foreground mt-2 max-w-xs">
                  ระบบขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้งในภายหลัง
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
          
          {/* Sidebar - Desktop Only */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="sticky top-24">
              <KBSidebar />
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 w-full">
            <Breadcrumb items={[{ label: "หมวดหมู่ทั้งหมด" }]} />

            <div className="mt-6 mb-10">
              <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                หมวดหมู่เอกสาร
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