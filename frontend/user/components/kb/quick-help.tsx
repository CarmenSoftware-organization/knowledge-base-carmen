'use client';

import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, Variants } from "framer-motion";
import { useTranslations } from "next-intl";

export function QuickHelp() {
  const t = useTranslations("quickHelp");

  const scrollToFooter = (e: React.MouseEvent) => {
    e.preventDefault();
    const footer = document.getElementById('footer-contact');
    if (footer) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut", staggerChildren: 0.15 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, y: 15 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    }
  };

  return (
    <section className="py-8 sm:py-11 md:py-14 lg:py-16 bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >

          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-border rounded-2xl sm:rounded-3xl lg:rounded-[2rem] overflow-hidden shadow-lg sm:shadow-xl">
            <CardContent className="p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12">

              <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10 lg:gap-12 items-center">

                {/* Left */}
                <motion.div variants={itemVariants} className="text-center lg:text-left">
                  <h2 className="text-[1.35rem] leading-tight sm:text-2xl md:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
                    {t("title")}
                  </h2>

                  <p className="mt-3 sm:mt-4 text-muted-foreground leading-relaxed text-sm sm:text-base md:text-lg max-w-prose mx-auto lg:mx-0">
                    {t("subtitleLine1")}
                    <br className="hidden lg:block" />
                    {t("subtitleLine2")}
                  </p>

                  <div className="mt-5 sm:mt-6 md:mt-8 flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-3 md:gap-4">

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={scrollToFooter}
                        size="default"
                        className="gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl h-9 px-3.5 text-xs font-bold shadow sm:h-10 sm:px-5 sm:text-sm md:h-11 md:px-6 md:text-base lg:h-12 lg:px-8"
                      >
                        <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        {t("chatButton")}
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={scrollToFooter}
                        size="default"
                        variant="outline"
                        className="gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl h-9 px-3.5 text-xs font-bold sm:h-10 sm:px-5 sm:text-sm md:h-11 md:px-6 md:text-base lg:h-12 lg:px-8"
                      >
                        <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                        {t("emailButton")}
                      </Button>
                    </motion.div>

                  </div>
                </motion.div>

                {/* Right Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

                  {/* Phone */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:border-primary/40"
                  >
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary"
                    >
                      <Phone className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem] md:h-6 md:w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </motion.div>

                    <h3 className="font-bold text-foreground text-sm sm:text-base md:text-lg">{t("phoneTitle")}</h3>
                    <p className="mt-1 text-xs sm:text-sm font-black text-foreground tabular-nums">02-284-0429</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider leading-snug text-center lg:text-left">
                      {t("phoneHours")}
                    </p>
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-card border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:border-primary/40"
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: -10 }}
                      className="w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-primary/10 rounded-lg sm:rounded-xl flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-primary"
                    >
                      <Mail className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem] md:h-6 md:w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </motion.div>

                    <h3 className="font-bold text-foreground text-sm sm:text-base md:text-lg">{t("emailTitle")}</h3>
                    <p className="mt-1 text-[0.7rem] sm:text-xs font-black text-foreground break-all text-center lg:text-left">
                      support@carmensoftware.com
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider leading-snug text-center lg:text-left">
                      {t("emailReplyTime")}
                    </p>
                  </motion.div>

                </div>

              </div>

            </CardContent>
          </Card>

        </motion.div>
      </div>
    </section>
  );
}