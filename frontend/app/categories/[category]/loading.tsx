export default function CategoryLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background animate-pulse">
      <div className="h-14 border-b border-border/60 bg-background/95" />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8 items-start">
          {/* Sidebar skeleton */}
          <aside className="hidden xl:block w-64 shrink-0 space-y-2">
            {[90, 70, 85, 60, 75, 80, 65].map((w, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-9 rounded-lg bg-muted" style={{ width: `${w}%` }} />
                {i % 3 === 0 && (
                  <div className="ml-4 space-y-1.5 border-l-2 border-muted pl-2">
                    {[65, 80].map((aw, j) => (
                      <div key={j} className="h-6 rounded-md bg-muted/60" style={{ width: `${aw}%` }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </aside>

          {/* Article content skeleton */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-2 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-2 rounded bg-muted" />
              <div className="h-4 w-36 rounded bg-muted" />
            </div>

            {/* Title */}
            <div className="space-y-3">
              <div className="h-9 w-2/3 rounded-lg bg-muted" />
              <div className="h-4 w-full rounded bg-muted/60" />
              <div className="h-4 w-4/5 rounded bg-muted/60" />
            </div>

            <div className="border-b border-border" />

            {/* Paragraph lines */}
            <div className="space-y-3">
              {[100, 95, 88, 100, 72, 90, 83, 100, 60].map((w, i) => (
                <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
