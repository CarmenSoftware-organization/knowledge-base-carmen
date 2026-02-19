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
    <div className={`space-y-4 pt-4 ${hasMetadata ? 'pb-6' : 'pb-0'}`}>
      <h1 className="text-4xl font-bold text-gray-900 leading-tight">
        {title}
      </h1>

      {/* {description && (
          <p className="text-lg text-gray-600 italic leading-relaxed border-l-4 border-blue-400 pl-4 bg-blue-50/40 py-2 rounded-r-lg">
            {description}
          </p>
        )} 
      */}

      {hasMetadata && (
        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-sm text-gray-500 pt-1">
          {formattedDate && (
            <div className="flex items-center gap-2">
              <span>📅</span>
              <span>{formattedDate}</span>
            </div>
          )}

          {editor && (
            <div className="flex items-center gap-2">
              <span className="opacity-70">✍️ แก้ไขโดย:</span>
              <span className="text-gray-800 font-semibold">{editor}</span>
            </div>
          )}

          {tags.length > 0 && (
            <div className="flex items-center gap-2">
              <span>🏷️</span>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200"
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