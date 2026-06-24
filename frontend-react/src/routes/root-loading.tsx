/**
 * RootLoading is the router's top-level HydrateFallback. React Router renders it
 * during the very first page load while route loaders run. Without it, a pending
 * loader (e.g. a cold/slow backend on free tier) leaves the whole SPA blank.
 */
export default function RootLoading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <div
        className="h-8 w-8 rounded-full border-2 border-muted border-t-foreground animate-spin"
        aria-hidden="true"
      />
      <p className="text-sm">กำลังโหลด…</p>
    </div>
  );
}
