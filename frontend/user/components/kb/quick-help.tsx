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
    <section className="py-16 bg-background overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >

          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-border rounded-[2rem] overflow-hidden shadow-xl">
            <CardContent className="p-8 sm:p-12">

              <div className="grid lg:grid-cols-2 gap-12 items-center">

                {/* Left */}
                <motion.div variants={itemVariants} className="text-center lg:text-left">
                  <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    {t("title")}
                  </h2>

                  <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
                    {t("subtitleLine1")}
                    <br className="hidden lg:block" />
                    {t("subtitleLine2")}
                  </p>

                  <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={scrollToFooter}
                        size="lg"
                        className="gap-2 rounded-xl h-12 px-8 font-bold shadow"
                      >
                        <MessageCircle className="h-4 w-4" />
                        {t("chatButton")}
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={scrollToFooter}
                        size="lg"
                        variant="outline"
                        className="gap-2 rounded-xl px-8 h-12 font-bold"
                      >
                        <Mail className="h-4 w-4" />
                        {t("emailButton")}
                      </Button>
                    </motion.div>

                  </div>
                </motion.div>

                {/* Right Cards */}
                <div className="grid sm:grid-cols-2 gap-4">

                  {/* Phone */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:border-primary/40"
                  >
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary"
                    >
                      <Phone className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </motion.div>

                    <h3 className="font-bold text-foreground text-lg">{t("phoneTitle")}</h3>
                    <p className="mt-1 text-sm font-black text-foreground">02-284-0429</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider">
                      {t("phoneHours")}
                    </p>
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-2xl bg-card border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:border-primary/40"
                  >
                    <motion.div
                      whileHover={{ scale: 1.2, rotate: -10 }}
                      className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary"
                    >
                      <Mail className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                    </motion.div>

                    <h3 className="font-bold text-foreground text-lg">{t("emailTitle")}</h3>
                    <p className="mt-1 text-xs font-black text-foreground">
                      support@carmensoftware.com
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider">
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