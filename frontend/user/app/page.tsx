import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { BULandingCards } from "@/components/kb/bu-landing-cards";
import { QuickHelp } from "@/components/kb/quick-help";
import { getBusinessUnits, type BusinessUnit } from "@/lib/wiki-api";

export default async function HomePage() {
  let businessUnits: BusinessUnit[] = [];
  try {
    const data = await getBusinessUnits();
    businessUnits = data.items ?? [];
  } catch {
    // backend down — still render shell
  }

  return (
    <div className="min-h-screen flex flex-col">
      <KBHeader />
      <main className="flex-1">
        <BULandingCards items={businessUnits} />
        <QuickHelp />
      </main>
      <KBFooter />
    </div>
  );
}
