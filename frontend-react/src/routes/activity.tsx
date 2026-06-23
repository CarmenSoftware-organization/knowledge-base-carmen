import { getSelectedBUClient } from "@/lib/wiki-api";
import { useTranslations } from "@/i18n/use-translations";
import { ActivityControls } from "@/components/activity/activity-controls";
import { ActivityLogTable } from "@/components/activity/activity-log-table";

export default function Activity() {
  const bu = getSelectedBUClient();
  const t = useTranslations("activity");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            {t("title")}
          </h1>
          <p className="text-muted-foreground">
            {t("description", { bu })}
          </p>
        </div>
        <ActivityControls bu={bu} />
      </div>

      <ActivityLogTable bu={bu} />
    </div>
  );
}
