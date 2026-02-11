import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Folder } from "lucide-react";
import { formatCategoryName, getCategoryColor } from "@/lib/wiki-utils";
import { getCategories } from "@/lib/wiki-api";

export default async function CategoriesPage() {
  const data = await getCategories(); // { items: [{ slug }] }

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
          <KBSidebar />

          <div className="flex-1">
            <Breadcrumb items={[{ label: "หมวดหมู่ทั้งหมด" }]} />

            <h1 className="text-3xl font-bold mt-6 mb-8">
              หมวดหมู่เอกสาร
            </h1>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((c: { slug: string }) => {
                const color = getCategoryColor(c.slug);
                return (
                  <Link key={c.slug} href={`/categories/${c.slug}`}>
                    <Card className={`border-l-4 ${color.split(" ")[2]}`}>
                      <CardHeader className="flex flex-row items-center gap-3">
                        <div className={`p-3 rounded-xl ${color}`}>
                          <Folder className="h-5 w-5" />
                        </div>
                        <CardTitle>
                          {formatCategoryName(c.slug)}
                        </CardTitle>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
