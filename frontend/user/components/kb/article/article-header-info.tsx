interface ArticleHeaderInfoProps {
  title: string;
  formattedDate: string | null;
  tags: string[];
}

export function ArticleHeaderInfo({ title, formattedDate, tags }: ArticleHeaderInfoProps) {
  return (
    <>
      {/* Title */}
      <h1 className="text-4xl font-bold mt-6 mb-4 text-gray-900">
        {title}
      </h1>

      {/* Meta */}
      {(formattedDate || tags.length > 0) && (
        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-gray-600">
          {formattedDate && (
            <div>📅 {formattedDate}</div>
          )}

          {tags.map((tag: string) => (
            <span
              key={tag}
              className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </>
  );
}