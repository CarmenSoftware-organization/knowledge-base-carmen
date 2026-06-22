interface ArticleHeaderInfoProps {
  title: string;
  description?: string;
  formattedDate: string | null;
  tags: string[];
  editor?: string;
}

export function ArticleHeaderInfo({
  title,
  description,
  formattedDate,
  tags,
  editor
}: ArticleHeaderInfoProps) {

  const hasMetadata = formattedDate || editor || (tags && tags.length > 0);

  return (
    <div className={`space-y-3 sm:space-y-4 pt-2 sm:pt-4 ${hasMetadata ? "pb-4 sm:pb-6" : "pb-0"}`}>
      <h1 className="text-[1.5rem] font-bold leading-snug tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-[2.25rem] lg:leading-tight">
        {title}
      </h1>

      {hasMetadata && (
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 sm:gap-y-3 sm:gap-x-6 text-xs sm:text-sm text-muted-foreground pt-0.5 sm:pt-1">

          {formattedDate && (
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formattedDate}</span>
            </div>
          )}

          {editor && (
            <div className="flex items-center gap-2">
              <span className="opacity-70">✍️ แก้ไขโดย:</span>
              <span className="text-foreground font-semibold">{editor}</span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="
                      bg-muted
                      text-foreground
                      px-2 py-0.5 sm:px-3 sm:py-1
                      rounded-full
                      text-[10px] sm:text-xs
                      font-bold
                      border border-border
                    "
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}