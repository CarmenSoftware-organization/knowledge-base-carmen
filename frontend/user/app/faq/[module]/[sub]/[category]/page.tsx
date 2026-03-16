import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { cookies } from "next/headers";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { API_BASE } from "@/lib/config";

type FAQEntry = {
  id: number;
  title: string;
  sample_case?: string;
  problem_cause?: string;
  solution?: string;
  tags?: string[];
};

type FAQCategoryResponse = {
  module: { name: string; slug: string };
  submodule: { name: string; slug: string };
  category: { name: string; slug: string };
  items: FAQEntry[];
};

export default async function FAQCategoryPage({
  params,
}: {
  params: { module: string; sub: string; category: string };
}) {
  const { module, sub, category } = params;
  const cookieStore = await cookies();
  const bu = cookieStore.get("selected_bu")?.value || "carmen";

  const res = await fetch(
    `${API_BASE}/api/faq/${encodeURIComponent(
      module
    )}/${encodeURIComponent(sub)}/${encodeURIComponent(
      category
    )}?bu=${encodeURIComponent(bu)}`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    return (
      <div className="min-h-screen flex flex-col">
        <KBHeader />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            ไม่พบ FAQ ในหมวดนี้
          </p>
        </main>
        <KBFooter />
      </div>
    );
  }

  const data = (await res.json()) as FAQCategoryResponse;

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
              {data.submodule.name} – {data.category.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              คำถามที่พบบ่อยในหมวดนี้
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10">
          <div className="mx-auto max-w-5xl px-4">
            {data.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                ยังไม่มีคำถามในหมวดนี้
              </p>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {data.items.map((faq) => (
                  <AccordionItem
                    key={faq.id}
                    value={String(faq.id)}
                    className="border rounded-xl px-3 sm:px-4"
                  >
                    <AccordionTrigger className="text-left text-sm sm:text-base font-semibold">
                      {faq.title}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground space-y-3 pb-4">
                      {faq.sample_case && (
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Sample case
                          </p>
                          <p className="whitespace-pre-line">{faq.sample_case}</p>
                        </div>
                      )}
                      {faq.problem_cause && (
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Cause of Problems
                          </p>
                          <p className="whitespace-pre-line">
                            {faq.problem_cause}
                          </p>
                        </div>
                      )}
                      {faq.solution && (
                        <div>
                          <p className="font-medium text-foreground mb-1">
                            Solution
                          </p>
                          <p className="whitespace-pre-line">{faq.solution}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>
      </main>
      <KBFooter />
    </div>
  );
}

