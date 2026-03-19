import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE } from "@/lib/config";

type FAQCategory = {
  id: number;
  name: string;
  slug: string;
};

type FAQSubmodule = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  categories?: FAQCategory[];
};

type FAQModule = {
  id: number;
  name: string;
  slug: string;
};

export default async function FAQModulePage({
  params,
}: {
  params: { module: string };
}) {
  const { module } = params;
  const cookieStore = await cookies();
  const bu = cookieStore.get("selected_bu")?.value || "carmen";

  const res = await fetch(
    `${API_BASE}/api/faq/${encodeURIComponent(
      module
    )}?bu=${encodeURIComponent(bu)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <div className="min-h-screen flex flex-col">
        <KBHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            ไม่พบข้อมูล FAQ สำหรับโมดูลนี้
          </p>
        </main>
        <KBFooter />
      </div>
    );
  }

  const data = (await res.json()) as {
    module: FAQModule;
    submodules: FAQSubmodule[];
  };

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-2">
              FAQ
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">
              {data.module.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              เลือกหัวข้อย่อยและประเภทปัญหาที่คุณสนใจในโมดูลนี้
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-4 space-y-4">
            {data.submodules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ยังไม่มี Submodule สำหรับโมดูลนี้
              </p>
            ) : (
              data.submodules.map((sm) => (
                <div
                  key={sm.id}
                  className="rounded-2xl border bg-card/60 shadow-sm p-4 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="font-semibold text-base sm:text-lg">
                        {sm.name}
                      </h2>
                      {sm.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {sm.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {sm.categories && sm.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {sm.categories.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/faq/${module}/${sm.slug}/${cat.slug}`}
                          className="inline-flex items-center rounded-full border px-3 py-1 text-xs sm:text-[13px] bg-muted/40 hover:bg-muted transition-colors"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
      <KBFooter />
    </div>
  );
}

