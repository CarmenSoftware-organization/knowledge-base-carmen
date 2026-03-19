import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { cookies } from "next/headers";
import Link from "next/link";
import { API_BASE } from "@/lib/config";

type FAQModule = {
  id: number;
  name: string;
  slug: string;
  icon?: string;
};

export default async function FAQHomePage() {
  const cookieStore = await cookies();
  const bu = cookieStore.get("selected_bu")?.value || "carmen";

  const res = await fetch(
    `${API_BASE}/api/faq/modules?bu=${encodeURIComponent(bu)}`,
    { cache: "no-store" }
  );

  let modules: FAQModule[] = [];
  if (res.ok) {
    const data = await res.json();
    modules = data.items || [];
  }

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <section className="border-b bg-gradient-to-b from-background to-muted/40">
          <div className="mx-auto max-w-5xl px-4 py-10 sm:py-14">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
              FAQ
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              คำถามที่พบบ่อยสำหรับ{" "}
              <span className="text-primary">Carmen Cloud</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
              รวมคำถามและคำตอบ แยกตามโมดูลการทำงาน เช่น AP, AR, GL, Asset
              เพื่อช่วยให้คุณหาวิธีแก้ปัญหาได้เร็วขึ้น
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-4">
            {modules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ยังไม่มี FAQ สำหรับ BU นี้
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {modules.map((m) => (
                  <Link
                    key={m.id}
                    href={`/faq/${m.slug}`}
                    className="group rounded-2xl border bg-card/60 hover:bg-card shadow-sm hover:shadow-md transition-all p-4 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-semibold text-base sm:text-lg">
                        {m.name}
                      </h2>
                      <span className="inline-flex items-center justify-center rounded-full bg-primary/10 text-primary text-xs px-3 py-1">
                        ดูรายละเอียด
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      คำถามที่พบบ่อยในโมดูล {m.name}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <KBFooter />
    </div>
  );
}

