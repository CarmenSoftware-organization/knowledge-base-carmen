import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Folder, AlertCircle } from "lucide-react";
import { formatCategoryName, getCategoryColor } from "@/lib/wiki-utils";
import { getCategories } from "@/lib/wiki-api";

export default async function CategoriesPage() {
  let data;
  try {
    data = await getCategories(); // { items: [{ slug }] }
  } catch (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <KBHeader />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
            <KBSidebar />
            <div className="flex-1">
              <Breadcrumb items={[{ label: "หมวดหมู่ทั้งหมด" }]} />
              <div className="mt-8 p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <h2 className="text-xl font-semibold text-destructive">
                    ไม่สามารถเชื่อมต่อกับ Backend ได้
                  </h2>
                </div>
                <p className="text-muted-foreground mt-2">
                  กรุณาตรวจสอบว่า Backend server กำลังรันอยู่ที่{" "}
                  <code className="px-2 py-1 bg-muted rounded text-sm">
                    http://localhost:8080
                  </code>
                </p>
                <p className="text-sm text-muted-foreground mt-4">
                  วิธีแก้: รันคำสั่ง{" "}
                  <code className="px-2 py-1 bg-muted rounded">
                    cd backend && air
                  </code>{" "}
                  หรือ{" "}
                  <code className="px-2 py-1 bg-muted rounded">
                    go run cmd/server/main.go
                  </code>
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
