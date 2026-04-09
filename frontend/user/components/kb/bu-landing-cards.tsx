"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Building2, ArrowUpRight, Sparkles, Check, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setSelectedBU, type BusinessUnit } from "@/lib/wiki-api";
import { useTranslations } from "next-intl";
import { motion, type Variants } from "framer-motion";

type Props = {
  items: BusinessUnit[];
};

const brandContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.09, delayChildren: 0.06 },
  },
};

const brandItem: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const logoPop: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

const cardsContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.35 },
  },
};

const cardItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

function AmbientOrbs() {
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-[15%] top-[8%] h-[min(55vw,28rem)] w-[min(55vw,28rem)] rounded-full bg-primary/[0.14] blur-[80px] dark:bg-primary/[0.18]"
        aria-hidden
        animate={{
          x: [0, 22, -8, 0],
          y: [0, -18, 10, 0],
          scale: [1, 1.06, 0.98, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -right-[12%] top-[35%] h-[min(48vw,24rem)] w-[min(48vw,24rem)] rounded-full bg-accent/[0.12] blur-[72px] dark:bg-accent/[0.16]"
        aria-hidden
        animate={{
          x: [0, -18, 14, 0],
          y: [0, 24, -12, 0],
          scale: [1, 0.95, 1.04, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-[5%] left-[20%] h-[min(40vw,18rem)] w-[min(40vw,18rem)] rounded-full bg-primary/[0.08] blur-[64px] dark:bg-primary/[0.1]"
        aria-hidden
        animate={{ opacity: [0.35, 0.6, 0.4, 0.35] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

export function BULandingCards({ items }: Props) {
  const router = useRouter();
  const t = useTranslations("buLanding");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/carmen-logo-light.png"
      : "/carmen-logo-light-new.png";
  const isDarkLogo = mounted && resolvedTheme === "dark";

  const handleSelectBU = (slug: string) => {
    setSelectedBU(slug);
    router.push("/categories");
  };

  const introPoints = ["introPoint1", "introPoint2", "introPoint3"] as const;
  const whyPoints = ["whatIsPoint1", "whatIsPoint2", "whatIsPoint3", "whatIsPoint4"] as const;

  const scrollToCards = () => {
    document.getElementById("bu-cards")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section className="relative flex flex-col">
      {/* ฮีโร่เต็มหน้าจอ (หัก header) */}
      <div
        id="bu-landing"
        className="relative flex min-h-bu-landing scroll-mt-14 flex-col overflow-hidden border-b border-border/50"
      >
        <AmbientOrbs />

        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-primary/[0.08] via-background/95 to-background" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_50%_-5%,hsl(var(--primary)/0.14),transparent_58%)] dark:bg-[radial-gradient(ellipse_85%_55%_at_50%_-5%,hsl(var(--primary)/0.18),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,theme(colors.border/0.4)_1px,transparent_1px),linear-gradient(to_bottom,theme(colors.border/0.4)_1px,transparent_1px)] bg-[size:2.75rem_2.75rem] opacity-[0.4] [mask-image:radial-gradient(ellipse_75%_60%_at_50%_20%,#000_45%,transparent_100%)] sm:bg-[size:3.25rem_3.25rem] lg:bg-[size:3.5rem_3.5rem]" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay dark:opacity-[0.22]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: "128px 128px",
          }}
          aria-hidden
        />

        <div className="relative z-0 flex min-h-0 flex-1 flex-col px-3 sm:px-5 md:px-6 lg:px-8 xl:px-10">
          <div className="flex min-h-0 flex-1 flex-col justify-center py-6 sm:py-8 md:py-10">
            <motion.div
              className="mx-auto w-full max-w-[85rem]"
              variants={brandContainer}
              initial="hidden"
              animate="show"
            >
              <div className="flex w-full flex-col items-center justify-center gap-7 sm:gap-8 lg:gap-10 xl:flex-row xl:items-center xl:gap-14 2xl:gap-16">
                <div className="flex w-full max-w-[26rem] flex-col items-center text-center sm:max-w-[32rem] lg:max-w-[40rem] xl:max-w-[min(100%,30rem)] xl:shrink xl:items-start xl:text-left 2xl:max-w-[34rem]">
                

                  <motion.h1
                    variants={brandItem}
                    className="bu-title-shift bu-title-line-1 text-[2rem] font-black leading-[1.1] tracking-tight sm:text-[2.35rem] md:text-[2.75rem] md:leading-tight lg:text-[3.2rem] xl:text-[2.85rem] 2xl:text-[3.15rem]"
                  >
                    {t("brandLine1")}
                  </motion.h1>
                  <motion.p
                    variants={brandItem}
                    className="bu-title-shift bu-title-line-2 mt-1.5 text-[1.65rem] font-bold leading-snug tracking-tight sm:mt-2 sm:text-[1.95rem] md:text-[2.25rem] lg:text-[2.7rem] xl:text-[2.2rem] 2xl:text-[2.4rem]"
                  >
                    {t("brandLine2")}
                  </motion.p>
                  <motion.p
                    variants={brandItem}
                    className="mt-1.5 text-sm font-medium leading-relaxed text-muted-foreground sm:text-base md:text-lg lg:text-xl xl:text-lg 2xl:text-xl"
                  >
                    {t("brandLine3")}
                  </motion.p>

                  <motion.p
                    variants={brandItem}
                    className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm md:text-[0.9375rem] lg:leading-6"
                  >
                    {t("introLead")}
                  </motion.p>

                  <motion.ul
                    variants={brandItem}
                    className="mt-3 w-full max-w-prose space-y-2 text-left text-xs text-muted-foreground sm:mt-4 sm:space-y-2.5 sm:text-sm md:text-[0.9375rem]"
                  >
                    {introPoints.map((key) => (
                      <li key={key} className="flex gap-2.5 leading-snug sm:gap-3">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary sm:h-5 sm:w-5">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" strokeWidth={2.5} />
                        </span>
                        <span>{t(key)}</span>
                      </li>
                    ))}
                  </motion.ul>
                </div>

                <motion.div
                  variants={logoPop}
                  className="relative hidden w-full shrink-0 justify-center xl:flex xl:max-w-[min(36vw,34rem)] 2xl:max-w-[36rem] [@media(max-height:520px)]:scale-[0.9]"
                >
                  {/* Soft glow only (no box/backplate) */}
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/25 via-transparent to-accent/20 blur-3xl opacity-70 dark:from-primary/30 dark:to-accent/28 sm:blur-[80px]"
                    aria-hidden
                  />
                  <div className="relative w-full">
                    <Image
                      src={logoSrc}
                      alt="Carmen"
                      width={480}
                      height={132}
                      className={`relative mx-auto h-auto w-full max-h-[6rem] object-contain sm:max-h-32 md:max-h-36 lg:max-h-40 xl:max-h-44 2xl:max-h-[12rem] ${
                        isDarkLogo
                          ? "scale-100"
                          : "scale-[1.08] sm:scale-[1.06] md:scale-[1.04]"
                      }`}
                      style={{ width: "auto", height: "auto" }}
                      priority
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Scroll guide — ลูกเล่น + responsive */}
          <motion.div
            className="flex shrink-0 flex-col items-center px-2 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pb-6 sm:pt-3 md:pb-7"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <button
              type="button"
              onClick={scrollToCards}
              className="group relative flex flex-col items-center gap-2 px-2 py-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:gap-2.5"
              aria-label={t("scrollHint")}
            >
              <span className="max-w-[16rem] text-center text-[11px] leading-snug text-muted-foreground sm:max-w-none sm:text-xs md:text-sm">
                {t("scrollHint")}
              </span>
              <div className="relative flex h-11 w-11 items-end justify-center overflow-visible sm:h-12 sm:w-12">
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/15"
                  animate={{ scale: [1, 1.45], opacity: [0.45, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                  aria-hidden
                />
                <motion.span
                  className="absolute inset-[2px] rounded-full border border-primary/25 bg-primary/5"
                  animate={{ scale: [1, 1.08], opacity: [0.8, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                />
                <div className="relative flex items-end justify-center pb-0.5">
                  <motion.span
                    animate={{ y: [0, 5, 0] }}
                    transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronDown className="h-5 w-5 text-primary sm:h-6 sm:w-6" strokeWidth={2.5} />
                  </motion.span>
                </div>
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      {/* รายการการ์ด — ด้านล่างหน้าจอฮีโร่ */}
      <div className="relative mx-auto w-full max-w-7xl px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-6 md:px-6 md:pt-7 lg:px-8 lg:pt-8 xl:max-w-[90rem] xl:px-10">
        <div
          id="bu-cards"
          className="scroll-mt-16 sm:scroll-mt-20 border-t border-border/40 pt-5 sm:pt-6 md:pt-6 lg:pt-7"
        >
            <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg md:text-xl lg:text-[1.35rem]">
            {t("cardsSectionTitle")}
          </h2>
          <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm md:text-[0.9375rem] lg:leading-6">
            {t("cardsSectionSubtitle")}
          </p>
        </div>

        <div className="mt-4 flex min-h-0 flex-col justify-center sm:mt-5 md:mt-5">
          {items.length === 0 ? (
            <Card className="mx-auto w-full max-w-2xl rounded-2xl border-border/70 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur-xl sm:rounded-3xl">
              <CardContent className="py-8 text-center text-sm text-muted-foreground sm:py-10 sm:text-base">
                {t("empty")}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              className="grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2 sm:gap-3 md:gap-4 lg:grid-cols-3 lg:gap-5 xl:gap-5"
              variants={cardsContainer}
              initial="hidden"
              animate="show"
            >
              {items.map((bu) => (
                <motion.div key={bu.id} variants={cardItem} className="min-h-0">
                  <button
                    type="button"
                    onClick={() => handleSelectBU(bu.slug)}
                    className="group/card relative h-full min-h-[44px] w-full text-left"
                  >
                    <span
                      className="absolute -inset-px rounded-[1.05rem] bg-gradient-to-br from-primary/25 via-border/40 to-accent/20 opacity-40 blur-[1px] transition-opacity duration-500 group-hover/card:opacity-90 group-active/card:opacity-70 sm:rounded-[1.35rem]"
                      aria-hidden
                    />
                    <span
                      className="absolute -inset-px rounded-[1.05rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/10 opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 sm:rounded-[1.35rem]"
                      aria-hidden
                    />
                    <Card className="relative h-full overflow-hidden rounded-2xl border border-border/60 bg-card/85 shadow-md shadow-black/[0.03] backdrop-blur-xl transition-all duration-500 dark:border-border/50 dark:bg-card/80 dark:shadow-black/20 sm:rounded-3xl md:group-hover/card:-translate-y-1 md:group-hover/card:border-primary/35 md:group-hover/card:shadow-xl md:group-hover/card:shadow-primary/15 active:scale-[0.99]">
                      <div
                        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.05] opacity-0 transition-opacity duration-500 group-hover/card:opacity-100 dark:from-primary/[0.1] dark:to-accent/[0.08]"
                        aria-hidden
                      />
                      <div
                        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-transform duration-500 group-hover/card:scale-150 dark:bg-primary/15"
                        aria-hidden
                      />
                      <CardHeader className="relative space-y-0 p-4 pb-2 sm:p-5 sm:pb-2 lg:p-6 lg:pb-3">
                        <div className="mb-2.5 flex items-center justify-between sm:mb-3">
                          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary shadow-sm shadow-primary/10 ring-1 ring-primary/10 transition-transform duration-300 group-hover/card:scale-105 group-hover/card:ring-primary/25 sm:h-10 sm:w-10 sm:rounded-xl">
                            <Building2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-all duration-300 group-hover/card:translate-x-0.5 group-hover/card:-translate-y-0.5 group-hover/card:text-primary" />
                        </div>
                        <CardTitle className="text-base font-bold leading-snug text-foreground sm:text-lg lg:text-xl">
                          {bu.name}
                        </CardTitle>
                        <span className="mt-2 inline-block h-0.5 w-8 rounded-full bg-gradient-to-r from-primary/40 to-transparent opacity-60 transition-all duration-300 group-hover/card:w-12 group-hover/card:from-primary group-hover/card:opacity-100" />
                      </CardHeader>
                      <CardContent className="relative px-4 pb-4 pt-0 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6">
                        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground sm:text-sm lg:line-clamp-4">
                          {bu.description?.trim() || t("cardFallback")}
                        </p>
                      </CardContent>
                    </Card>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="mt-10 border-t border-border/40 pt-8 sm:mt-12 sm:pt-10 lg:mt-14 lg:pt-12">
          <div className="mx-auto max-w-5xl text-center">
            <h3 className="bu-title-shift bu-title-line-2 text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
              {t("whatIsTitle")}
            </h3>
            <p className="mx-auto mt-4 max-w-4xl text-sm leading-7 text-muted-foreground sm:mt-5 sm:text-base sm:leading-8 md:text-lg">
              {t("whatIsLead")}
            </p>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-muted-foreground/90 sm:mt-5 sm:text-base sm:leading-8">
              {t("whatIsSubLead")}
            </p>
            <ul className="mt-7 grid gap-4 text-left sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:mt-10">
              {whyPoints.map((key, index) => (
                <li
                  key={key}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/65 px-4 py-4 text-sm leading-7 text-muted-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/85 hover:shadow-md hover:shadow-primary/10 sm:px-5 sm:py-4.5 sm:text-base"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                  <span className="mr-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary sm:h-8 sm:w-8">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="align-middle">{t(key)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
