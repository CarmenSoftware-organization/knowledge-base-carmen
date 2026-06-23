import { useLoaderData } from "react-router-dom";
import { KBHeader } from "@/components/kb/header";
import { KBFooter } from "@/components/kb/footer";
import { BULandingCards } from "@/components/kb/bu-landing-cards";
import { QuickHelp } from "@/components/kb/quick-help";
import { getBusinessUnits, type BusinessUnit } from "@/lib/wiki-api";

export async function homeLoader(): Promise<{ businessUnits: BusinessUnit[] }> {
  try {
    const data = await getBusinessUnits();
    return { businessUnits: data.items ?? [] };
  } catch {
    return { businessUnits: [] };
  }
}

export default function Home() {
  const { businessUnits } = useLoaderData() as { businessUnits: BusinessUnit[] };
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
