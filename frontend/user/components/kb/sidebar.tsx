"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategories, getCategory } from "@/lib/wiki-api";

interface Article {
  title: string;
  slug: string;
}

interface Category {
  name: string;
  slug: string;
  articles: Article[];
}

export function KBSidebar() {
  const pathname = usePathname();

  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    async function loadSidebar() {
      try {
        const res = await getCategories();

        const loaded: Category[] = [];

        for (const cat of res.items) {
          const catRes = await getCategory(cat.slug);

          loaded.push({
            name: cat.slug.toUpperCase(),
            slug: cat.slug,
            articles: catRes.items.map((item: any) => ({
              title: item.title,
              slug: item.slug,
            })),
          });
        }

        setCategories(loaded);
      } catch (err) {
        console.error("Sidebar error:", err);
      }
    }

    loadSidebar();
  }, []);

  const toggleCategory = (slug: string) => {
    setExpandedCategories((prev) =>
      prev.includes(slug)
        ? prev.filter((s) => s !== slug)
        : [...prev, slug]
    );
  };

  return (
    <aside className="w-64 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1 pr-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
        {categories.map((category) => {
          const isExpanded = expandedCategories.includes(category.slug);
          const isActive = pathname.includes(`/categories/${category.slug}`);

          return (
            <div key={category.slug}>
              <button
                onClick={() => toggleCategory(category.slug)}
                className={cn(
                  "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <span>{category.name}</span>

                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 space-y-1 border-l border-border pl-4">
                  {category.articles.map((article) => {
                    const articlePath = `/categories/${category.slug}/${article.slug}`;
                    const isArticleActive = pathname === articlePath;

                    return (
                      <Link
                        key={article.slug}
                        href={articlePath}
                        className={cn(
                          "block px-3 py-1.5 text-sm rounded-md transition-colors",
                          isArticleActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                        )}
                      >
                        {article.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
