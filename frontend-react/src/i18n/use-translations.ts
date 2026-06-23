import { useTranslation } from "react-i18next";
import "@/i18n";

/** next-intl-compatible hook. `useTranslations("ns")` then `t("key")` → "ns.key". */
export function useTranslations(namespace?: string) {
  const { t } = useTranslation();
  return (key: string, values?: Record<string, unknown>): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, values ?? {}) as string;
  };
}

export function useLocale(): string {
  const { i18n } = useTranslation();
  return i18n.language;
}
