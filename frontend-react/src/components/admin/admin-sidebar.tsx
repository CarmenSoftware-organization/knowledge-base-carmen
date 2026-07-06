import { cn } from "@/lib/utils";

export type AdminSection = "indexing" | "wiki" | "bu" | "chat" | "reset" | "activity";

const ITEMS: { key: AdminSection; label: string; danger?: boolean }[] = [
  { key: "indexing", label: "Indexing / Reindex" },
  { key: "wiki", label: "Wiki Sync" },
  { key: "bu", label: "Business Units" },
  { key: "chat", label: "Chat Debug" },
  { key: "reset", label: "Reset", danger: true },
  { key: "activity", label: "Activity Log" },
];

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (s: AdminSection) => void;
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto md:w-52 md:flex-col md:overflow-visible">
      {ITEMS.map((it) => (
        <button
          key={it.key}
          onClick={() => onSelect(it.key)}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition-colors",
            active === it.key ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50",
            it.danger && "text-red-600 dark:text-red-400",
          )}
        >
          {it.label}
        </button>
      ))}
    </nav>
  );
}

export const ADMIN_SECTIONS: AdminSection[] = ["indexing", "wiki", "bu", "chat", "reset", "activity"];
