import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ArticleTagsProps {
  tags: string[];
}

export function ArticleTags({ tags }: ArticleTagsProps) {
  return (
    <div className="flex items-start gap-3">
      <Tag className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link key={tag} to={`/search?tag=${encodeURIComponent(tag)}`}>
            <Badge
              variant="secondary"
              className="hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            >
              {tag}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  );
}
