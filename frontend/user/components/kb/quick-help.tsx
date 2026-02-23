'use client';

import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, Variants } from "framer-motion";

export function QuickHelp() {
  const scrollToFooter = (e: React.MouseEvent) => {
    e.preventDefault();
    const footer = document.getElementById('footer-contact');
    if (footer) {
      footer.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
        staggerChildren: 0.15
      }
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
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          <Card className="bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20 rounded-[2rem] overflow-hidden shadow-xl shadow-primary/5">
            <CardContent className="p-8 sm:p-12">
              <div className="grid lg:grid-cols-2 gap-12 items-center">

                {/* Left Content */}
                <motion.div variants={itemVariants} className="text-center lg:text-left">
                  <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                    ต้องการความช่วยเหลือเพิ่มเติม?
                  </h2>
                  <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
                    หากคุณไม่พบคำตอบที่ต้องการในคู่มือ <br className="hidden lg:block" />
                    ทีมสนับสนุนของเราพร้อมช่วยเหลือคุณตลอด 24 ชั่วโมง
                  </p>
                  <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-4">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button size="lg" className="gap-2 rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
                        <MessageCircle className="h-4 w-4" />
                        แชทกับเรา
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        onClick={scrollToFooter}
                        size="lg"
                        variant="outline"
                        className="gap-2 border-slate-200 rounded-xl px-8 h-12 hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-all font-bold"
                      >
                        <Mail className="h-4 w-4" />
                        ส่งอีเมล
                      </Button>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Right Content - Quick Links */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Tel. Box */}
                  <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
                  >
                    <motion.div 
                      whileHover={{ rotate: 15, scale: 1.1 }}
                      className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-primary group-hover:text-white"
                    >
                      <Phone className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                    </motion.div>
                    <h3 className="font-bold text-foreground text-lg">โทรหาเรา</h3>
                    <p className="mt-1 text-sm text-slate-700 font-black">02-284-0429</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider">จ-ศ 9:00-18:00 น.</p>
                  </motion.div>

                  {/* Email Box */}
                  <motion.div 
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-border flex flex-col items-center lg:items-start group transition-all hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
                  >
                    <motion.div 
                      whileHover={{ scale: 1.2, rotate: -10 }}
                      className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 transition-colors group-hover:bg-primary group-hover:text-white"
                    >
                      <Mail className="h-6 w-6 text-primary group-hover:text-white transition-colors" />
                    </motion.div>
                    <h3 className="font-bold text-foreground text-lg">อีเมล</h3>
                    <p className="mt-1 text-xs text-slate-700 font-black">support@carmensoftware.com</p>
                    <p className="text-[10px] text-muted-foreground uppercase mt-1 font-bold tracking-wider">ตอบกลับภายใน 24 ชม.</p>
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