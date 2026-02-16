import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { categoryDisplayMap } from "@/configs/sidebar-map";

type Props = {
  categories: {
    slug: string;
    articleCount: number;
  }[];
};

export function CategoryCards({ categories }: Props) {
  return (
    <section className="py-16 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">
            เลือกหมวดหมู่
          </h2>
          <p className="mt-3 text-muted-foreground">
            เลือกหมวดหมู่ที่คุณต้องการเรียนรู้
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => {
            // ใช้ชื่อจาก Map ถ้าไม่มีให้แปลง slug (เช่น ap-system -> Ap System)
            const displayName = categoryDisplayMap[category.slug] || category.slug.replace(/-/g, " ");

            return (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group focus:outline-none"
              >
                <Card
                  className="
                    h-full
                    border
                    transition-all duration-200
                    hover:shadow-lg
                    hover:border-primary/40
                    hover:-translate-y-1

                    group-focus-visible:ring-2
                    group-focus-visible:ring-primary
                    group-focus-visible:ring-offset-2
                  "
                >
                  <CardContent className="p-6">

                    {/* Category Title */}
                    <h3
                      className="
                        font-semibold
                        text-foreground
                        capitalize
                        transition-colors
                        group-hover:text-primary
                        text-lg
                      "
                    >
                      {displayName}
                    </h3>

                    {/* Meta */}
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {category.articleCount} บทความ
                      </span>

                      <ArrowRight
                        className="
                          h-4 w-4
                          text-muted-foreground
                          transition-all
                          group-hover:text-primary
                          group-hover:translate-x-1
                        "
                      />
                    </div>

                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

      </div>
    </section>
  );
}