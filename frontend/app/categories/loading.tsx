export default function CategoriesLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background animate-pulse">
      {/* Header placeholder */}
      <div className="h-14 border-b border-border/60 bg-background/95" />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
          {/* Sidebar skeleton */}
          <aside className="hidden md:block w-64 shrink-0 space-y-2">
            {[90, 70, 85, 60, 75, 80].map((w, i) => (
              <div key={i} className="space-y-1.5">
                <div
                  className="h-9 rounded-lg bg-muted"
                  style={{ width: `${w}%` }}
                />
                {i % 3 === 0 && (
                  <div className="ml-4 space-y-1.5 border-l-2 border-muted pl-2">
                    {[65, 80].map((aw, j) => (
                      <div
                        key={j}
                        className="h-6 rounded-md bg-muted/60"
                        style={{ width: `${aw}%` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          {/* Content skeleton */}
          <div className="flex-1 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-2 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <div className="h-8 w-1/3 rounded-lg bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted/60" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-muted"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
