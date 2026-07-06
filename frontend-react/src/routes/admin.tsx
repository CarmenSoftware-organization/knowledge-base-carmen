import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdminKey } from "@/lib/admin-auth";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminSidebar, ADMIN_SECTIONS, type AdminSection } from "@/components/admin/admin-sidebar";
import { IndexingPanel } from "@/components/admin/indexing-panel";
import { WikiSyncPanel } from "@/components/admin/wiki-sync-panel";
import { BusinessUnitsPanel } from "@/components/admin/business-units-panel";
import { ChatDebugPanel } from "@/components/admin/chat-debug-panel";
import { ResetPanel } from "@/components/admin/reset-panel";
import { ActivityPanel } from "@/components/admin/activity-panel";

export default function Admin() {
  const [unlocked, setUnlocked] = useState<boolean>(() => getAdminKey() != null);
  const [params] = useSearchParams();
  const initial = params.get("section");
  const [section, setSection] = useState<AdminSection>(
    ADMIN_SECTIONS.includes(initial as AdminSection) ? (initial as AdminSection) : "indexing",
  );

  useEffect(() => {
    const onCleared = () => setUnlocked(false);
    window.addEventListener("admin-key-cleared", onCleared);
    return () => window.removeEventListener("admin-key-cleared", onCleared);
  }, []);

  if (!unlocked) {
    return <AdminGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
      <AdminSidebar active={section} onSelect={setSection} />
      <main className="min-w-0 flex-1">
        {section === "indexing" && <IndexingPanel />}
        {section === "wiki" && <WikiSyncPanel />}
        {section === "bu" && <BusinessUnitsPanel />}
        {section === "chat" && <ChatDebugPanel />}
        {section === "reset" && <ResetPanel />}
        {section === "activity" && <ActivityPanel />}
      </main>
    </div>
  );
}
