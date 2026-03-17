import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActivityControls } from "@/components/activity/activity-controls";
import { ActivityLogTable } from "@/components/activity/activity-log-table";
import { getTranslations } from "next-intl/server";

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const c = await cookies();
  const buCookie = c.get("selected_bu")?.value || "carmen";
  const t = await getTranslations("activity");

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("description", { bu: buCookie })}
          </p>
        </div>
        <ActivityControls bu={buCookie} />
      </div>

      <ActivityLogTable bu={buCookie} />
    </div>
  );
}
