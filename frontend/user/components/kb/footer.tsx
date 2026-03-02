'use client';

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, Clock, Send } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";


export function KBFooter() {
  const footerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const sectionVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const logoSrc =
    mounted && resolvedTheme === "dark"
      ? "/Carmen-logo-light.png"
      : "/carmen02-logo.png";


  return (
    <footer
      id="footer-contact"
      className="border-t border-border bg-background text-foreground overflow-hidden"
    >
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={footerVariants}
        className="mx-auto max-w-6xl px-6 py-8 md:py-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-10 items-stretch">

          {/* === Part 1: Brand & Contact === */}
          <motion.div
            variants={sectionVariants}
            className="lg:col-span-5 flex flex-col justify-between text-center lg:text-left items-center lg:items-start"
          >
            <div className="space-y-5 w-full">

              <Link href="/" className="block w-fit mx-auto lg:mx-0 group">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative h-10 w-40 sm:h-11 sm:w-44 transition-transform duration-300"
                >
                 <Image
                    src={logoSrc}
                    alt="Carmen Logo"
                    fill
                    priority
                    className="object-contain object-center lg:object-left"
                  />
                </motion.div>
              </Link>

              <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
                CARMEN is here for you. If you have any questions, you can rest easy knowing you have fast, reliable support.
              </p>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Contact
                </h3>

                <ul className="space-y-2 text-sm flex flex-col items-center lg:items-start">
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 transition-colors hover:text-primary cursor-default">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>support@carmensoftware.com</span>
                  </motion.li>

                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 transition-colors hover:text-primary cursor-default">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>02-284-0429</span>
                  </motion.li>
                </ul>
              </div>
            </div>

            {/* Line Card */}
            <div className="mt-8 lg:mt-0 w-full flex flex-col items-center lg:items-start gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Line Official
              </h3>

              <motion.a
                href="https://line.me/R/ti/p/%40gbl2238o#~"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border border-border bg-card w-full sm:w-fit transition-all hover:bg-muted hover:shadow-lg cursor-pointer"
              >
                {/* QR */}
                <div className="relative bg-background p-2 rounded-xl shadow-sm border border-border group-hover:border-primary transition-all shrink-0">
                  <Image src="/line-carmen.png" alt="Line QR" width={80} height={80} className="rounded-lg" />
                </div>

                {/* Text */}
                <div className="flex flex-col items-center sm:items-start">
                  <p className="text-base font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                    @carmensoftware
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    Scan or Click to add friend
                  </p>

                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                    Add Friend
                  </div>
                </div>
              </motion.a>
            </div>
          </motion.div>

          {/* === Part 2: Contact Form === */}
          <motion.div variants={sectionVariants} className="lg:col-span-5 flex flex-col">
            <div className="h-full p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm flex flex-col justify-center">

              <div className="mb-6 text-center lg:text-left">
                <h3 className="text-lg font-bold text-foreground">Contact Support</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  ทีมงานจะตอบกลับโดยเร็วที่สุด
                </p>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground ml-0.5">Name</label>
                    <input
                      type="text"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="ชื่อของคุณ"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground ml-0.5">Email</label>
                    <input
                      type="email"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground ml-0.5">Message</label>
                  <textarea
                    rows={3}
                    className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                    placeholder="รายละเอียดคำถาม..."
                  />
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-primary hover:opacity-90 text-primary-foreground text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Message
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* === Bottom === */}
        <motion.div
          variants={sectionVariants}
          className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] uppercase tracking-widest font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> 09:00 – 18:00 (Mon-Fri)
            </span>
            <span className="text-primary font-bold">One Support Team</span>
          </div>

          <p className="text-[10px]">
            © 2021 <span className="text-foreground font-bold">Carmen Software</span>. All Rights Reserved.
          </p>
        </motion.div>

      </motion.div>
    </footer>
  );
}