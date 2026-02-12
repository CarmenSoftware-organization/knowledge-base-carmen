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

            {/* Breadcrumb */}
            <Breadcrumb
              items={[
                { label: "หมวดหมู่", href: "/categories" },
                { label: formatCategoryName(data.category) },
              ]}
            />

            {/* Title Section */}
            <div className="mt-6 mb-10">
              <h1 className="text-4xl font-bold text-foreground">
                {formatCategoryName(data.category)}
              </h1>
              <p className="text-muted-foreground mt-2">
                รวมบทความทั้งหมดในหมวดนี้
              </p>
            </div>

            {/* Cards Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
              {data.items.map((item: any) => (
                <Link
                  key={item.path}
                  href={`/categories/${category}/${item.slug}`}
                  className="group"
                >
                  <Card
                    className="
            h-full
            border border-primary/10
            bg-card
            transition-all
            duration-300
            hover:shadow-lg
            hover:border-primary/30
            hover:-translate-y-1
          "
                  >
                    <CardContent className="p-6 flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          ดูรายละเอียดเพิ่มเติม
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="
              text-primary/60
              group-hover:text-primary
              transition-colors
            ">
                        →
                      </div>
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
