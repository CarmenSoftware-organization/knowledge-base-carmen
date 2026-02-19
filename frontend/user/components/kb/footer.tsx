'use client';

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, Clock, Send } from "lucide-react";
import { motion, Variants } from "framer-motion";

export function KBFooter() {
  const footerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
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

  return (
    <footer id="footer-contact" className="border-t border-slate-100 bg-white text-slate-600 overflow-hidden">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={footerVariants}
        className="mx-auto max-w-6xl px-6 py-8 md:py-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-10 items-stretch">

          {/* === Part 1: Brand & Contact === */}
          <motion.div variants={sectionVariants} className="lg:col-span-5 flex flex-col justify-between text-center lg:text-left items-center lg:items-start">
            <div className="space-y-5 w-full">
              <Link href="/" className="block w-fit mx-auto lg:mx-0 group">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="relative h-10 w-40 sm:h-11 sm:w-44 transition-transform duration-300"
                >
                  <Image
                    src="/carmen02-logo.png"
                    alt="Carmen Logo"
                    fill
                    priority
                    className="object-contain object-center lg:object-left"
                  />
                </motion.div>
              </Link>

              <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto lg:mx-0">
                CARMEN is here for you. If you have any questions, you can rest easy knowing you have fast, reliable support.
              </p>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Contact</h3>
                <ul className="space-y-2 text-sm flex flex-col items-center lg:items-start">
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 transition-colors hover:text-blue-600 cursor-default">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <span>support@carmensoftware.com</span>
                  </motion.li>
                  <motion.li whileHover={{ x: 5 }} className="flex items-center gap-3 transition-colors hover:text-blue-600 cursor-default">
                    <Phone className="h-4 w-4 text-blue-500" />
                    <span>02-284-0429</span>
                  </motion.li>
                </ul>
              </div>
            </div>

            {/* Part Line Official - Full Clickable Card */}
            <div className="mt-8 lg:mt-0 w-full flex flex-col items-center lg:items-start gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">Line Official</h3>

              <motion.a
                href="https://line.me/R/ti/p/%40gbl2238o#~"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                className="group relative flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl border border-slate-50 bg-slate-50/50 w-full sm:w-fit transition-all hover:bg-white hover:shadow-xl hover:shadow-green-500/10 hover:border-green-200 cursor-pointer"
              >
                {/* QR Code */}
                <div className="relative bg-white p-2 rounded-xl shadow-sm border border-slate-100 group-hover:border-green-400 transition-all shrink-0">
                  <Image
                    src="/line-carmen.png"
                    alt="Line QR"
                    width={80}
                    height={80}
                    className="rounded-lg"
                  />
                  <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#06C755] opacity-0 group-hover:opacity-100 transition-all" />
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#06C755] opacity-0 group-hover:opacity-100 transition-all" />
                </div>

                {/* Details */}
                <div className="flex flex-col items-center sm:items-start">
                  <p className="text-base font-black text-slate-900 tracking-tight group-hover:text-[#06C755] transition-colors">
                    @carmensoftware
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium mb-2">Scan or Click to add friend</p>

                  <div className="mt-1 flex items-center gap-2">
                    <div className="bg-[#06C755] group-hover:bg-[#05b34c] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5">
                      Add Friend
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl bg-green-500/0 group-hover:bg-green-500/[0.02] transition-all pointer-events-none" />
              </motion.a>
            </div>
          </motion.div>

          {/* === Part 2: Contact Form === */}
          <motion.div variants={sectionVariants} className="lg:col-span-5 flex flex-col">
            <div className="h-full p-6 md:p-8 rounded-3xl border border-slate-100 bg-slate-50/30 shadow-sm flex flex-col justify-center">
              <div className="mb-6 text-center lg:text-left">
                <h3 className="text-lg font-bold text-slate-900">Contact Support</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">ทีมงานจะตอบกลับโดยเร็วที่สุด</p>
              </div>

              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Name</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                      placeholder="ชื่อของคุณ"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 ml-0.5">Email</label>
                    <input
                      type="email"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 ml-0.5">Message</label>
                  <textarea
                    rows={3}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
                    placeholder="รายละเอียดคำถาม..."
                  ></textarea>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Message
                </motion.button>
              </form>
            </div>
          </motion.div>
        </div>

        {/* === Part 3: Bottom Footer === */}
        <motion.div
          variants={sectionVariants}
          className="mt-10 pt-6 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[10px] uppercase tracking-widest font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> 09:00 – 18:00 (Mon-Fri)
            </span>
            <span className="text-blue-500 font-bold">One Support Team</span>
          </div>
          <p className="text-[10px]">
            © 2021 <span className="text-slate-700 font-bold">Carmen Software</span>. All Rights Reserved.
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
}