import { cache } from "react";
import { getCategory } from "@/lib/wiki-api";
import type { FaqWikiItem } from "@/lib/faq-nav";

/** Dedupe การโหลดรายการ FAQ ในคำขอเดียวกัน (เช่น บทความ FAQ + MobileSidebar) */
export const getCachedFaqNavItems = cache(
  async (bu: string): Promise<FaqWikiItem[]> => {
    try {
      const d = await getCategory("faq", bu, { cache: "no-store" });
      return (d.items ?? []) as FaqWikiItem[];
    } catch {
      return [];
    }
  }
);
