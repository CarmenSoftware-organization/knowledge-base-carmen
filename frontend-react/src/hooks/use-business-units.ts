import { useEffect, useState } from "react";
import { adminApiJson } from "@/lib/admin-fetch";

export type BusinessUnit = { id: string; slug: string; name?: string };

/** Loads the BU list once on mount for dropdowns. Returns [] on error. */
export function useBusinessUnits(): BusinessUnit[] {
  const [bus, setBus] = useState<BusinessUnit[]>([]);
  useEffect(() => {
    let alive = true;
    adminApiJson<BusinessUnit[]>("/api/business-units")
      .then(({ data }) => {
        if (alive) setBus(data ?? []);
      })
      .catch(() => {
        if (alive) setBus([]);
      });
    return () => {
      alive = false;
    };
  }, []);
  return bus;
}
