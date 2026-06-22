export default function ArticleLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background animate-pulse">
      <div className="h-14 border-b border-border/60 bg-background/95" />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex gap-10 items-start">
          <aside className="hidden xl:block w-64 shrink-0 space-y-2">
            {[90, 70, 85, 60, 75, 80, 65].map((w, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-9 rounded-lg bg-muted" style={{ width: `${w}%` }} />
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

          <div className="flex-1 min-w-0 max-w-4xl space-y-6">
            <div className="flex items-center gap-2">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-2 rounded bg-muted" />
              <div className="h-4 w-28 rounded bg-muted" />
              <div className="h-4 w-2 rounded bg-muted" />
              <div className="h-4 w-40 rounded bg-muted" />
            </div>

            <div className="space-y-3">
              <div className="h-10 w-3/4 rounded-lg bg-muted" />
              <div className="h-5 w-full rounded bg-muted/60" />
              <div className="flex gap-3">
                <div className="h-5 w-24 rounded-full bg-muted/50" />
                <div className="h-5 w-24 rounded-full bg-muted/50" />
                <div className="h-5 w-20 rounded-full bg-muted/50" />
              </div>
            </div>

            <div className="border-b border-border" />

            <div className="space-y-4">
              {[100, 93, 87, 100, 76].map((w, i) => (
                <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
              ))}
              <div className="h-6 w-1/3 rounded bg-muted mt-6" />
              {[100, 88, 95, 70, 100, 82].map((w, i) => (
                <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>

          <aside className="hidden xl:block w-52 shrink-0 space-y-2">
            <div className="h-5 w-28 rounded bg-muted mb-3" />
            {[80, 65, 72, 55, 68].map((w, i) => (
              <div key={i} className="h-4 rounded bg-muted/50" style={{ width: `${w}%` }} />
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}
