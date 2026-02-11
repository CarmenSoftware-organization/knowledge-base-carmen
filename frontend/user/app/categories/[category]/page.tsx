import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { KBSidebar } from "@/components/kb/sidebar";
import { Breadcrumb } from "@/components/kb/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { getCategory } from "@/lib/wiki-api";
import { formatCategoryName } from "@/lib/wiki-utils";
import { notFound } from "next/navigation";

export default async function CategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const { category } = await params;

  if (!category) {
    notFound();
  }

  const data = await getCategory(category);

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
          <KBSidebar />

          <div className="flex-1">
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
                { label: formatCategoryName(data.category) },
              ]}
            />

            <h1 className="text-3xl font-bold mt-6 mb-6">
              {formatCategoryName(data.category)}
            </h1>

            <div className="space-y-4">
              {data.items.map((item: any) => (
                <Link
                  key={item.path}
                  href={`/categories/${category}/${item.slug}`}
                >
                  <Card>
                    <CardContent className="p-4">
                      <h2 className="font-medium">{item.title}</h2>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>

      <KBFooter />
    </div>
  );
}
