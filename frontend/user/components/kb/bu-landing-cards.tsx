"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { BookOpen, Building2, Headset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { setSelectedBU, type BusinessUnit } from "@/lib/wiki-api";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion, type Variants } from "framer-motion";

type Props = {
  items: BusinessUnit[];
};

const CONTACT_SUPPORT_FORM_URL =
  "https://forms.zohopublic.com/carmensoftware/form/Contactforsupport/formperma/u00Cn7XaD_LKMPjMYBVbZxAe7redlAiayQxwJJqnsLI?zf_enablecamera=true";

const easeLux: [number, number, number, number] = [0.16, 1, 0.32, 1];

const brandContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1, delayChildren: 0.08 },
  },
};

const brandTitle: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.72, ease: easeLux },
  },
};

const brandBody: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.58, ease: easeLux },
  },
};

function logoVariants(reduceMotion: boolean | null): Variants {
  return {
    hidden: { opacity: 0, scale: 0.93, y: 16 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0.28, ease: easeLux }
        : { type: "spring", damping: 28, stiffness: 140, mass: 0.92 },
    },
  };
}

function cardsContainerVariants(reduceMotion: boolean | null): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reduceMotion ? 0.04 : 0.09,
        delayChildren: reduceMotion ? 0.05 : 0.18,
      },
    },
  };
}

function cardItemVariants(reduceMotion: boolean | null): Variants {
  return {
    hidden: { opacity: 0, y: 22, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: reduceMotion
        ? { duration: 0.35, ease: easeLux }
        : { type: "spring", damping: 24, stiffness: 210, mass: 0.82 },
    },
  };
}

function AmbientOrbs({ reduceMotion }: { reduceMotion: boolean | null }) {
  const staticMode = Boolean(reduceMotion);
  return (
    <>
      <motion.div
        className="pointer-events-none absolute -left-[15%] top-[8%] h-[min(55vw,28rem)] w-[min(55vw,28rem)] rounded-full bg-primary/[0.14] blur-[80px] dark:bg-primary/[0.18]"
        aria-hidden
        animate={
          staticMode
            ? undefined
            : {
                x: [0, 22, -8, 0],
                y: [0, -18, 10, 0],
                scale: [1, 1.06, 0.98, 1],
              }
        }
        transition={
          staticMode ? undefined : { duration: 18, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <motion.div
        className="pointer-events-none absolute -right-[12%] top-[35%] h-[min(48vw,24rem)] w-[min(48vw,24rem)] rounded-full bg-accent/[0.12] blur-[72px] dark:bg-accent/[0.16]"
        aria-hidden
        animate={
          staticMode
            ? undefined
            : {
                x: [0, -18, 14, 0],
                y: [0, 24, -12, 0],
                scale: [1, 0.95, 1.04, 1],
              }
        }
        transition={
          staticMode
            ? undefined
            : { duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1.5 }
        }
      />
      <motion.div
        className="pointer-events-none absolute bottom-[5%] left-[20%] h-[min(40vw,18rem)] w-[min(40vw,18rem)] rounded-full bg-primary/[0.08] blur-[64px] dark:bg-primary/[0.1]"
        aria-hidden
        animate={staticMode ? undefined : { opacity: [0.35, 0.6, 0.4, 0.35] }}
        transition={
          staticMode ? undefined : { duration: 10, repeat: Infinity, ease: "easeInOut" }
        }
      />
    </>
  );
}

export function BULandingCards({ items }: Props) {
  const router = useRouter();
  const t = useTranslations("buLanding");
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const logoPop = logoVariants(reduceMotion);
  const cardsContainer = cardsContainerVariants(reduceMotion);
  const cardItem = cardItemVariants(reduceMotion);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/carmen-logo-light.png"
      : "/carmen-logo-light-new.png";
  const isDarkLogo = mounted && resolvedTheme === "dark";

  const goToCategoriesForBu = (slug: string) => {
    setSelectedBU(slug);
    router.push("/categories");
  };

  const whyPoints = ["whatIsPoint1", "whatIsPoint2", "whatIsPoint3", "whatIsPoint4"] as const;

  return (
    <section className="relative flex flex-col">
      <div
        id="bu-landing"
        className="relative flex min-h-0 scroll-mt-14 flex-col overflow-hidden border-b border-border/50 xl:min-h-bu-landing"
      >
        <AmbientOrbs reduceMotion={reduceMotion} />

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

        <div className="relative z-0 flex min-h-0 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:px-8 lg:px-10 xl:px-12 xl:flex-1">
          <div className="mx-auto flex min-h-0 w-full max-w-[85rem] flex-col justify-start gap-4 py-4 sm:gap-5 sm:py-5 md:gap-6 md:py-6 lg:py-7 xl:flex-1 xl:justify-center xl:gap-8 xl:py-8">
            <motion.div
              className="w-full shrink-0"
              variants={brandContainer}
              initial="hidden"
              animate="show"
            >
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-start gap-5 sm:max-w-6xl sm:gap-6 sm:px-0 md:gap-7 xl:grid-cols-2 xl:items-center xl:gap-10 xl:px-10 xl:max-w-7xl 2xl:max-w-[90rem] 2xl:gap-12 2xl:px-12">
                <div className="flex w-full justify-center px-0 sm:px-1 xl:pl-12 xl:pr-5 2xl:pl-16 2xl:pr-8">
                  <div className="flex w-full max-w-xl flex-col items-start text-left sm:max-w-2xl">
                    <motion.h1
                      variants={brandTitle}
                      className="bu-title-shift bu-title-line-1 text-[1.65rem] font-black leading-[1.12] tracking-tight sm:text-[1.95rem] md:text-[2.25rem] md:leading-tight lg:text-[2.35rem] xl:text-[2.5rem] 2xl:text-[2.65rem]"
                    >
                      {t("brandLine1")}
                    </motion.h1>
                    <motion.p
                      variants={brandTitle}
                      className="bu-title-shift bu-title-line-2 mt-1 text-[1.28rem] font-bold leading-snug tracking-tight sm:mt-1.5 sm:text-[1.55rem] md:text-[1.75rem] lg:text-[1.9rem] xl:text-[1.85rem] 2xl:text-[2rem]"
                    >
                      {t("brandLine2")}
                    </motion.p>
                    <motion.p
                      variants={brandBody}
                      className="mt-1 text-xs font-medium leading-relaxed text-muted-foreground sm:text-sm md:text-[0.9375rem] lg:text-base"
                    >
                      {t("brandLine3")}
                    </motion.p>
                    <motion.p
                      variants={brandBody}
                      className="mt-3 w-full text-left text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm md:text-[0.9375rem] lg:leading-relaxed"
                    >
                      {t("introLead")}
                    </motion.p>
                    <motion.div variants={brandBody} className="mt-4 w-full sm:mt-5">
                      <Button
                        asChild
                        size="default"
                        className="h-10 gap-2 rounded-xl px-5 text-sm font-semibold shadow-md shadow-primary/15 sm:h-11 sm:px-6"
                      >
                        <a
                          href={CONTACT_SUPPORT_FORM_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center"
                        >
                          <Headset className="h-4 w-4 shrink-0" aria-hidden />
                          {t("contactSupport")}
                        </a>
                      </Button>
                    </motion.div>
                  </div>
                </div>

                <div className="hidden w-full justify-center xl:flex xl:pl-6 xl:pr-8">
                  <motion.div
                    variants={logoPop}
                    className="relative w-full max-w-md xl:max-w-lg"
                  >
                    <div
                      className="pointer-events-none absolute left-1/2 top-1/2 h-[88%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-primary/25 via-transparent to-accent/20 blur-3xl opacity-70 dark:from-primary/30 dark:to-accent/28 sm:blur-[72px]"
                      aria-hidden
                    />
                    <div className="relative w-full">
                      <motion.div
                        className="relative mx-auto w-full will-change-transform"
                        animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                        transition={
                          reduceMotion
                            ? undefined
                            : { duration: 6.8, repeat: Infinity, ease: "easeInOut" }
                        }
                      >
                        <Image
                          src={logoSrc}
                          alt="Carmen"
                          width={480}
                          height={132}
                          className={`relative mx-auto block h-auto w-full max-h-28 object-contain xl:max-h-32 ${
                            isDarkLogo ? "scale-100" : "scale-[1.02]"
                          }`}
                          style={{ width: "auto", height: "auto" }}
                          priority
                        />
                      </motion.div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <div
              id="bu-cards"
              className="w-full shrink-0 scroll-mt-16 pt-3 sm:scroll-mt-20 sm:pt-4 md:pt-4 xl:pt-6"
            >
              <div className="flex flex-col">
                {items.length === 0 ? (
                  <Card className="mx-auto w-full max-w-md rounded-xl border-border/70 bg-card/80 shadow-lg shadow-primary/5 backdrop-blur-xl sm:max-w-lg sm:rounded-2xl">
                    <CardContent className="py-6 text-center text-sm text-muted-foreground sm:py-8 sm:text-base">
                      {t("empty")}
                    </CardContent>
                  </Card>
                ) : (
                  <motion.div
                    className={cn(
                      "grid w-full grid-cols-1 justify-items-stretch gap-3 text-left sm:grid-cols-2 sm:gap-4 md:gap-5",
                      items.length <= 2
                        ? "mx-auto max-w-3xl lg:max-w-5xl"
                        : "mx-auto max-w-6xl lg:max-w-7xl lg:grid-cols-3",
                    )}
                    variants={cardsContainer}
                    initial="hidden"
                    animate="show"
                  >
                    {items.map((bu) => (
                      <motion.div key={bu.id} variants={cardItem} className="min-h-0 w-full">
                        <Card className="relative h-full overflow-hidden rounded-xl border border-border/60 bg-card/85 shadow-md shadow-black/[0.03] backdrop-blur-xl dark:border-border/50 dark:bg-card/80 dark:shadow-black/20 sm:rounded-2xl">
                          <div
                            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-60"
                            aria-hidden
                          />
                          <CardHeader className="relative space-y-0 p-3 pb-2 sm:p-3.5 sm:pb-2.5 lg:p-4">
                            <div className="flex items-start gap-2.5 sm:gap-3">
                              <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/10 sm:h-9 sm:w-9">
                                <Building2 className="h-4 w-4 sm:h-[1.125rem] sm:w-[1.125rem]" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-[0.875rem] font-bold leading-snug text-foreground sm:text-[0.9375rem] lg:text-base">
                                  {bu.name}
                                </CardTitle>
                                {(bu.description?.trim() || t("cardFallback")) && (
                                  <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px] sm:leading-snug md:text-xs">
                                    {bu.description?.trim() || t("cardFallback")}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="relative px-3 pb-3 pt-0 sm:px-3.5 sm:pb-3.5 lg:px-4 lg:pb-4">
                            <div className="grid grid-cols-1 gap-2 sm:gap-2.5">
                              <button
                                type="button"
                                onClick={() => goToCategoriesForBu(bu.slug)}
                                className={cn(
                                  "flex min-h-[4.25rem] cursor-pointer flex-col justify-center gap-1 rounded-lg border border-border/70 bg-background/70 p-2.5 text-left shadow-sm transition-all",
                                  "hover:border-primary/45 hover:bg-primary/[0.06] active:scale-[0.98]",
                                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                )}
                                aria-label={`${bu.name} — ${t("buActionGuidesTitle")}`}
                              >
                                <BookOpen
                                  className="h-4 w-4 shrink-0 text-primary sm:h-[1.125rem] sm:w-[1.125rem]"
                                  strokeWidth={2.25}
                                />
                                <span className="text-xs font-semibold leading-tight text-foreground sm:text-[0.8125rem]">
                                  {t("buActionGuidesTitle")}
                                </span>
                                <span className="line-clamp-2 text-[9px] leading-snug text-muted-foreground sm:text-[10px]">
                                  {t("buActionGuidesHint")}
                                </span>
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full bg-muted/35 dark:bg-muted/20">
        <div className="mx-auto w-full max-w-[85rem] px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-10 sm:px-6 sm:pt-12 md:px-8 md:pt-14 lg:px-10 lg:pt-16 xl:px-12">
          <motion.div
            className="mx-auto max-w-5xl text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px", amount: 0.2 }}
            transition={{ duration: 0.75, ease: easeLux }}
          >
            <motion.h3
              className="bu-title-shift bu-title-line-2 text-xl font-bold tracking-tight sm:text-2xl md:text-3xl"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.65, ease: easeLux, delay: reduceMotion ? 0 : 0.06 }}
            >
              {t("whatIsTitle")}
            </motion.h3>
            <motion.p
              className="mx-auto mt-4 max-w-4xl text-sm leading-7 text-muted-foreground sm:mt-5 sm:text-[0.9375rem] sm:leading-7 md:text-base"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: easeLux, delay: reduceMotion ? 0 : 0.12 }}
            >
              {t("whatIsLead")}
            </motion.p>
            <motion.p
              className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-muted-foreground/90 sm:mt-5 sm:text-[0.9375rem] sm:leading-7"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, ease: easeLux, delay: reduceMotion ? 0 : 0.18 }}
            >
              {t("whatIsSubLead")}
            </motion.p>
            <motion.ul
              className="mt-8 grid gap-3 text-left sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:mt-11"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-48px", amount: 0.15 }}
              variants={{
                hidden: {},
                show: {
                  transition: {
                    staggerChildren: reduceMotion ? 0.05 : 0.08,
                    delayChildren: reduceMotion ? 0 : 0.12,
                  },
                },
              }}
            >
              {whyPoints.map((key, index) => (
                <motion.li
                  key={key}
                  variants={{
                    hidden: { opacity: 0, y: 16, scale: 0.99 },
                    show: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: reduceMotion
                        ? { duration: 0.25, ease: easeLux }
                        : { type: "spring", damping: 26, stiffness: 220 },
                    },
                  }}
                  className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/65 px-4 py-3.5 text-sm leading-7 text-muted-foreground backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/85 hover:shadow-md hover:shadow-primary/10 sm:px-5 sm:py-4 sm:text-[0.9375rem]"
                >
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden
                  />
                  <span className="mr-2.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary sm:h-8 sm:w-8">
                    {(index + 1).toString().padStart(2, "0")}
                  </span>
                  <span className="align-middle">{t(key)}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
