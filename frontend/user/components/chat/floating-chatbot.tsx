"use client";
import { CarmenChatConfig, useCarmenChat } from "@/hooks/use-carmen-chat";
import { AnimatePresence, motion } from "framer-motion";
import CarmenChatWindow from "./carmen-chat-window";
import { API_BASE } from "@/lib/config";
import { getSelectedBUClient } from "@/lib/wiki-api";
import { useEffect, useState } from "react";

interface Props extends Partial<CarmenChatConfig> {
  bu?: string;
  username?: string;
}

export default function FloatingChatBot({
  bu: initialBU,
  username = "Guest",
  apiBase,
  theme = "#34558b",
  title = "Carmen AI Specialist",
  promptExtend,
  showClear = false,
  showAttach = false,
  suggestedQuestions,
}: Props) {
  const [currentBU, setCurrentBU] = useState(initialBU || getSelectedBUClient());

  useEffect(() => {
    if (!initialBU) {
      const handleBUChange = () => setCurrentBU(getSelectedBUClient());
      window.addEventListener("bu-changed", handleBUChange);
      return () => window.removeEventListener("bu-changed", handleBUChange);
    }
  }, [initialBU]);

  const resolvedApiBase = apiBase ?? API_BASE;

  const state = useCarmenChat({
    bu: currentBU,
    username,
    apiBase: resolvedApiBase,
    theme,
    title,
    promptExtend,
    showClear,
    showAttach,
    suggestedQuestions,
    onTypingFrame: () => {
      // Dispatch a custom event to sync auto-scroll with typing frames
      window.dispatchEvent(new CustomEvent("carmen-typing-frame"));
    }
  });

  const { isOpen, tooltipVisible, toggleOpen, dismissTooltip } = state;

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-[1999997] sm:hidden bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={toggleOpen}
          />
        )}
      </AnimatePresence>

      {/* Fixed anchor */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-[2000000]"
        style={{
          "--carmen-theme": theme,
          "--carmen-theme-low": `${theme}dd`
        } as React.CSSProperties}
      >

        {/* Chat window */}
        <AnimatePresence mode="wait">
          {isOpen && <CarmenChatWindow key="chat" state={state} />}
        </AnimatePresence>

        {/* Tooltip */}
        <AnimatePresence>
          {tooltipVisible && !isOpen && (
            <motion.div
              className="absolute bottom-[80px] right-0 flex items-center gap-3
                bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl
                px-4 py-3 rounded-2xl cursor-pointer w-max max-w-[280px]"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              onClick={() => { dismissTooltip(); toggleOpen(); }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md carmen-gradient"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="20" height="20">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>

              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[12px] font-bold tracking-wide carmen-theme-text">
                  ผู้ช่วย AI พร้อมให้คำแนะนำ
                </span>
                <span className="text-[12px] font-medium text-slate-600 dark:text-slate-400
                leading-tight">
                  สอบถามข้อมูลคู่มือได้ทันที!
                </span>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); dismissTooltip(); }}
                aria-label="Close tooltip"
                className="absolute -top-2 -right-2 w-5 h-5 bg-white dark:bg-slate-700 rounded-full
                  flex items-center justify-center shadow border border-slate-200 dark:border-slate-600
                  text-slate-400 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Launcher — กลมเสมอ */}
        <motion.button
          onClick={() => { dismissTooltip(); toggleOpen(); }}
          className="w-[60px] h-[60px] sm:w-[66px] sm:h-[66px] flex items-center justify-center cursor-pointer shadow-2xl carmen-launcher"
          whileHover={{ scale: 1.1, y: -3 }}
          whileTap={{ scale: 0.92 }}
          animate={{
            boxShadow: isOpen
              ? `0 8px 24px ${theme}44`
              : [
                `0 8px 24px ${theme}55, 0 0 0 0px ${theme}44`,
                `0 12px 32px ${theme}66, 0 0 0 12px ${theme}00`,
                `0 8px 24px ${theme}55, 0 0 0 0px ${theme}00`,
              ],
          }}
          transition={{
            boxShadow: isOpen
              ? { duration: 0.2 }
              : { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
          }}
          title="Carmen AI"
        >
          {/* Shine Effect */}
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shine_1.5s_infinite]" />
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {isOpen ? (
              <motion.div
                key="x"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none"
                  stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.div>
            ) : (
              <motion.div
                key="bot"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 8V4H8" />
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2" /><path d="M20 14h2" />
                  <path d="M15 13v2" /><path d="M9 13v2" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <style>{`
        .carmen-gradient {
          background: linear-gradient(135deg, var(--carmen-theme), var(--carmen-theme-low));
        }
        .carmen-theme-text {
          color: var(--carmen-theme);
        }
        .carmen-launcher {
          background: linear-gradient(135deg, var(--carmen-theme) 0%, var(--carmen-theme-low) 100%);
          border-radius: 50% !important;
          position: relative;
          overflow: hidden;
        }
        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(-45deg); }
          100% { transform: translateX(100%) translateY(100%) rotate(-45deg); }
        }
      `}</style>
    </>
  );
}