import Link from "next/link";
import { FileText, ArrowRight, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RelatedArticle {
  title: string;
  href: string;
  category: string;
  readTime?: string;
}

interface RelatedArticlesProps {
  articles: RelatedArticle[];
}

export function RelatedArticles({ articles }: RelatedArticlesProps) {
  if (articles.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          บทความที่เกี่ยวข้อง
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {articles.map((article) => (
            <Link
              key={article.href}
              href={article.href}
              className="group block p-3 -mx-3 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{article.category}</span>
                    {article.readTime && (
                      <>
                        <span className="text-border">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {article.readTime}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
