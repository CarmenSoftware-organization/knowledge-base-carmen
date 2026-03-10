"use client";
import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCarmenChat, DisplayMessage } from "@/hooks/use-carmen-chat";
import CarmenMessage from "./carmen-message";
import CarmenModal from "./carmen-modal";
import CarmenHistoryScreen from "./carmen-history-screen";
import CarmenTypingIndicator from "./carmen-typing-indicator";
import CarmenWelcome from "./carmen-welcome";

type ChatState = ReturnType<typeof useCarmenChat>;
interface Props { state: ChatState }
interface ContentProps {
  state: ChatState;
  theme: string;
  isResizing: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
  isInputFocused: boolean;
  setIsInputFocused: (val: boolean) => void;
}

// Desktop popup จาก bottom-right
const desktopVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20, filter: "blur(4px)", transformOrigin: "bottom right" },
  visible: {
    opacity: 1, scale: 1, filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 360, damping: 30, mass: 0.85 },
  },
  exit: {
    opacity: 0, scale: 0.88, y: 16, filter: "blur(3px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

// Mobile slide up
const mobileVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0, opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 32 },
  },
  exit: {
    y: "100%", opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  },
};

export default function CarmenChatWindow({ state }: Props) {
  const { isExpanded, config } = state;
  const theme = config.theme ?? "#34558b";
  const [isResizing, setIsResizing] = useState(false);
  const safeFormat = (val: string | number) => typeof val === 'number' ? `${val}px` : (val.endsWith('px') ? val : `${val}px`);

  const prevExpandedRef = useRef(isExpanded);
  const windowRef = useRef<HTMLDivElement>(null);

  // Blur content during expansion/collapse transition (0.6s)
  useEffect(() => {
    if (prevExpandedRef.current !== isExpanded) {
      setIsResizing(true);
      prevExpandedRef.current = isExpanded;
      const timer = setTimeout(() => setIsResizing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isExpanded]);

  // LERP logic for smoothing (ความหน่วง)
  const dragState = useRef({
    startX: 0, startY: 0, startB: 0, startR: 0,
    currentB: 0, currentR: 0,
    targetB: 0, targetR: 0,
    isMoving: false, rafId: 0
  });

  const updatePosition = () => {
    const d = dragState.current;
    if (!d.isMoving || !windowRef.current) return;

    // LERP calculation for smoothing
    d.currentB += (d.targetB - d.currentB) * 0.18; // 0.18 is the smoothing factor (หน่วงหนึบๆ)
    d.currentR += (d.targetR - d.currentR) * 0.18;

    windowRef.current.style.setProperty("--chat-bottom", d.currentB + "px");
    windowRef.current.style.setProperty("--chat-right", d.currentR + "px");

    // Continue loop until user releases and movement settles
    if (Math.abs(d.targetB - d.currentB) > 0.5 || Math.abs(d.targetR - d.currentR) > 0.5) {
      d.rafId = requestAnimationFrame(updatePosition);
    } else {
      d.currentB = d.targetB;
      d.currentR = d.targetR;
      d.rafId = requestAnimationFrame(updatePosition);
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isExpanded || !windowRef.current) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;

    const style = window.getComputedStyle(windowRef.current);
    const startB = parseInt(style.getPropertyValue("--chat-bottom")) || parseInt(style.bottom) || 84;
    const startR = parseInt(style.getPropertyValue("--chat-right")) || parseInt(style.right) || 32;

    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startB,
      startR,
      currentB: startB,
      currentR: startR,
      targetB: startB,
      targetR: startR,
      isMoving: false,
      rafId: 0
    };

    window.addEventListener("pointermove", handlePointerMove as any, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (e: PointerEvent) => {
    const d = dragState.current;
    if (!d.isMoving && Math.abs(e.clientX - d.startX) < 5 && Math.abs(e.clientY - d.startY) < 5) return;

    if (!d.isMoving) {
      d.isMoving = true;
      if (windowRef.current) {
        windowRef.current.classList.add("carmen-dragging");
      }
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";
      if (d.rafId) cancelAnimationFrame(d.rafId);
      d.rafId = requestAnimationFrame(updatePosition);
    }

    if (e.cancelable) e.preventDefault();

    const deltaX = d.startX - e.clientX;
    const deltaY = d.startY - e.clientY;
    const nextB = d.startB + deltaY;
    const nextR = d.startR + deltaX;

    if (!windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();
    const minB = -22;
    const maxB = window.innerHeight - rect.height - 42;
    const minR = -22;
    const maxR = window.innerWidth - rect.width - 42;

    // Update the target, loop will smoothly move towards it
    d.targetB = Math.min(Math.max(minB, nextB), maxB);
    d.targetR = Math.min(Math.max(minR, nextR), maxR);
  };

  const handlePointerUp = () => {
    window.removeEventListener("pointermove", handlePointerMove as any);
    window.removeEventListener("pointerup", handlePointerUp);

    const d = dragState.current;

    // Allow the loop to finish its smoothing settling before cancelling
    setTimeout(() => {
      if (d.rafId) cancelAnimationFrame(d.rafId);
      d.isMoving = false;

      if (windowRef.current) {
        windowRef.current.classList.remove("carmen-dragging");
        if (d.isMoving) {
          state.updatePosition({
            bottom: windowRef.current.style.getPropertyValue("--chat-bottom"),
            right: windowRef.current.style.getPropertyValue("--chat-right"),
          });
        }
      }
      d.isMoving = false;
    }, 150); // Small wait to allow the LERP to visibly complete its journey

    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
  };


  // Removing manual pointer handlers in favor of Framer Motion drag
  const [isInputFocused, setIsInputFocused] = useState(false); // Moved from ChatContent

  return (
    <>
      <motion.div
        ref={windowRef}
        initial={{
          opacity: 0,
          scale: 0.9,
        }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ ...desktopVariants.exit, scale: 0.9 }}
        style={{
          ["--chat-theme" as string]: theme,
          ["--input-border-color" as string]: isInputFocused ? theme : "transparent",
          ["--input-focus-shadow" as string]: isInputFocused ? `0 0 0 3px ${theme}22` : "none",
          ["--chat-bottom" as string]: isExpanded ? "20px" : safeFormat(state.position?.bottom ?? 84),
          ["--chat-right" as string]: isExpanded ? "20px" : safeFormat(state.position?.right ?? 32),
          ["--chat-width" as string]: isExpanded ? "calc(100% - 40px)" : "370px",
          ["--chat-height" as string]: isExpanded ? "calc(100% - 40px)" : "600px",
          ["--chat-radius" as string]: isExpanded ? "24px" : "32px",
        } as React.CSSProperties}
        className="hidden sm:flex flex-col overflow-hidden border border-black/10 shadow-2xl bg-white dark:bg-slate-900 z-[2000001] touch-none fixed carmen-chat-box"
      >
        <ChatContent state={state} theme={theme} isResizing={isResizing} onDragStart={handlePointerDown}
          isInputFocused={isInputFocused} setIsInputFocused={setIsInputFocused} // Pass down
        />
      </motion.div>

      {/* Mobile (< sm) */}
      <motion.div
        className="flex sm:hidden flex-col overflow-hidden fixed inset-0 bg-white dark:bg-slate-900"
        style={{ zIndex: 2000001 }}
        variants={mobileVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <ChatContent state={state} theme={theme} isResizing={isResizing}
          isInputFocused={isInputFocused} setIsInputFocused={setIsInputFocused} // Pass down
        />
      </motion.div>
      <style jsx global>{`
        .carmen-chat-box {
          bottom: var(--chat-bottom);
          right: var(--chat-right);
          width: var(--chat-width);
          height: var(--chat-height);
          border-radius: var(--chat-radius);
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.98) 0%,
            rgba(250, 250, 252, 0.98) 50%,
            rgba(255, 255, 255, 0.98) 100%
          ) !important;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.15),
            0 8px 24px rgba(0, 0, 0, 0.1),
            0 0 0 1px rgba(0, 0, 0, 0.05) !important;
        }

        :global(.dark) .carmen-chat-box {
          background: linear-gradient(
            135deg,
            rgba(15, 23, 42, 0.98) 0%,
            rgba(30, 41, 59, 0.98) 50%,
            rgba(15, 23, 42, 0.98) 100%
          ) !important;
          box-shadow:
            0 20px 60px rgba(0, 0, 0, 0.45),
            0 8px 24px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }

        .carmen-chat-box {
          will-change: transform, width, height, bottom, right;
          transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                      border-radius 0.6s ease;
        }
        
        .carmen-dragging {
          transition: none !important;
        }
        
        .carmen-content ul, .carmen-content ol {
          margin: 8px 0 12px 0 !important;
          padding-left: 20px !important;
        }
        .carmen-content li {
          margin-bottom: 6px !important;
          line-height: 1.6 !important;
        }
        .carmen-content ul {
          list-style-type: disc !important;
        }
        .carmen-content ol {
          list-style-type: decimal !important;
        }
        .carmen-link {
          transition: opacity 0.2s;
        }
        .carmen-link:hover {
          opacity: 0.7;
        }
        .carmen-processed-video {
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.3);
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
          perspective: 1000px;
          background: #000;
        }

        /* Modern Slim Scrollbar */
        .carmen-chat-box *::-webkit-scrollbar {
          width: 6px;
        }
        .carmen-chat-box *::-webkit-scrollbar-track {
          background: transparent;
        }
        .carmen-chat-box *::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
          transition: background 0.2s;
        }
        .dark .carmen-chat-box *::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
        }
        .carmen-chat-box *:hover::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
        }
        .dark .carmen-chat-box *:hover::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
        }
        
        @media (max-width: 768px) {
          .carmen-chat-box {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </>
  );
}

// ---- Shared content ----

// --- Sub-components for Performance Optimization ---

interface ChatHeaderProps {
  isExpanded: boolean;
  onDragStart?: (e: React.PointerEvent) => void;
  toggleExpand: () => void;
  toggleOpen: () => void;
  isProcessing: () => boolean;
  showRoomDropdown: boolean;
  setShowRoomDropdown: (val: boolean) => void;
  config: any;
  currentRoomId: string | null;
  setClearModal: (val: boolean) => void;
}

const ChatHeader = React.memo(({
  isExpanded, onDragStart, toggleExpand, toggleOpen, isProcessing,
  showRoomDropdown, setShowRoomDropdown, config, currentRoomId, setClearModal
}: ChatHeaderProps) => {
  return (
    <motion.div
      className={`flex items-center justify-between px-5 py-4 text-white flex-shrink-0 select-none bg-[var(--chat-theme)] ${isExpanded ? "rounded-t-[24px]" : "rounded-t-[32px] cursor-move active:cursor-move"} transition-[border-radius] duration-[0.6s] ease-[ease]`}
      onPointerDown={onDragStart}
      whileTap={isExpanded ? {} : { cursor: "grabbing" }}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/25 flex-shrink-0 bg-white/20 backdrop-blur-md"
          animate={{ y: [0, -3, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
        </motion.div>
        <div>
          <h3 className="text-[16px] font-bold tracking-tight leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]">
            {config.title || "Carmen AI Specialist"}
          </h3>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium opacity-80 uppercase tracking-wide">
            <motion.span
              className="w-1.5 h-1.5 bg-green-400 rounded-full"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            />
            คลังความรู้ AI พร้อมบริการ
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => {
            if (isProcessing()) {
              alert("ไม่สามารถเปิดประวัติได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่");
              return;
            }
            setShowRoomDropdown(!showRoomDropdown);
          }}
          disabled={isProcessing()}
          className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isProcessing() ? "bg-white/5 opacity-50 cursor-not-allowed" : "bg-white/15 hover:bg-white/25"}`}
          title={isProcessing() ? "ระบบกำลังประมวลผล" : "ประวัติการสนทนา"}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
            <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 7.07 7.07 0 0 1-6-3.18l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
          </svg>
        </button>

        <button
          onClick={toggleExpand}
          className="w-8 h-8 rounded-xl items-center justify-center bg-white/15 hover:bg-white/25 transition-colors hidden sm:flex"
          title={isExpanded ? "ย่อหน้าจอ" : "ขยายหน้าจอ"}
        >
          {isExpanded ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
              <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          )}
        </button>

        {config.showClear && currentRoomId && (
          <button
            onClick={() => {
              if (isProcessing()) {
                alert("ไม่สามารถล้างแชทได้ขณะระบบกำลังประมวลผล กรุณารอสักครู่");
                return;
              }
              setClearModal(true);
            }}
            disabled={isProcessing()}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isProcessing() ? "bg-white/5 opacity-50 cursor-not-allowed" : "bg-white/15 hover:bg-white/25"}`}
            title={isProcessing() ? "ระบบกำลังประมวลผล" : "ล้างแชท"}
          >
            <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
              <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />
            </svg>
          </button>
        )}

        <button
          onClick={toggleOpen}
          className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
          title="ปิด"
        >
          <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </motion.div>
  );
});

interface MessageListProps {
  bodyRef: React.RefObject<HTMLDivElement | null>;
  messages: DisplayMessage[];
  showSuggestions: boolean;
  suggestions: string[];
  sendMessage: (text?: string) => void;
  sendFeedback: (msgId: string, score: number) => void;
  retryMessage: (text: string) => void;
  theme: string;
  isResizing: boolean;
}

const MessageList = React.memo(({
  bodyRef, messages, showSuggestions, suggestions, sendMessage, sendFeedback, retryMessage, theme, isResizing
}: MessageListProps) => {
  return (
    <div
      ref={bodyRef}
      className={`flex-1 overflow-y-auto flex flex-col gap-4 p-4 sm:p-5 overscroll-contain transition-all duration-300 ${isResizing ? "opacity-10 blur-md pointer-events-none" : "opacity-100 blur-0"}`}
    >
      {messages.length === 0 && showSuggestions ? (
        <CarmenWelcome
          suggestions={suggestions}
          onSelect={(text: string) => sendMessage(text)}
          theme={theme}
        />
      ) : (
        <AnimatePresence initial={false}>
          {messages.filter((m: any) => !m.isQueued || m.role === "bot").map((msg: any) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <CarmenMessage msg={msg} onFeedback={sendFeedback} onRetry={retryMessage} theme={theme} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}
    </div>
  );
});

interface ChatInputProps {
  isResizing: boolean;
  config: any;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  inputValue: string;
  handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  setIsInputFocused: (val: boolean) => void;
  sendMessage: () => void;
  theme: string;
  imageBase64: string | null;
  setImageBase64: (val: string | null) => void;
}

const ChatInput = React.memo(({
  isResizing, config, fileInputRef, handleFileChange, inputRef, inputValue, handleInput, handleKeyDown, setIsInputFocused, sendMessage, theme, imageBase64, setImageBase64
}: ChatInputProps) => {
  return (
    <>
      <AnimatePresence>
        {imageBase64 && (
          <motion.div
            className={`px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-shrink-0 transition-all duration-300 ${isResizing ? "opacity-10 blur-md" : "opacity-100"}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-12 h-12 flex-shrink-0">
              <img src={imageBase64} alt="preview" className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md" />
              <button onClick={() => setImageBase64(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-200 shadow">×</button>
            </div>
            <span className="text-xs text-slate-500">รูปที่แนบ</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`flex items-center gap-3 px-6 pt-5 pb-6 flex-shrink-0 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 transition-all duration-300 ${isResizing ? "opacity-10 blur-sm pointer-events-none" : "opacity-100 blur-0"}`}>
        {config.showAttach && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} title="แนบรูปภาพ" aria-label="แนบรูปภาพ" />
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-[14px] flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="แนบรูป"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
              </svg>
            </motion.button>
          </>
        )}

        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="พิมพ์ข้อความที่นี่..."
          className="flex-1 px-5 py-[14px] rounded-[16px] border outline-none resize-none transition-all bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[50px] max-h-[120px] font-['Sarabun',_sans-serif] text-[15px] leading-[1.5] border-[color:var(--input-border-color,transparent)] [box-shadow:var(--input-focus-shadow,none)]"
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />

        <motion.button
          onClick={() => { sendMessage(); if (inputRef.current) inputRef.current.style.height = "auto"; }}
          className="w-12 h-12 rounded-[14px] text-white flex items-center justify-center flex-shrink-0 shadow-lg bg-[#0f172a] hover:bg-[var(--chat-theme)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="ส่งข้อความ"
        >
          <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </motion.button>
      </div>
    </>
  );
});

function ChatContent({ state, theme, isResizing, onDragStart, isInputFocused, setIsInputFocused }: ContentProps) {

  const {
    isExpanded, messages, rooms, currentRoomId,
    isTyping, isProcessing, typingStatus, inputValue, imageBase64,
    showSuggestions, showRoomDropdown, deleteModal, clearModal,
    suggestions, config,
    setInputValue, setImageBase64, setShowRoomDropdown,
    setDeleteModal, setClearModal, toggleOpen, toggleExpand,
    createNewChat, switchRoom, sendMessage, retryMessage, sendFeedback,
    confirmDeleteRoom, confirmClearHistory,
    alertModal, setAlertModal,
  } = state;

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  const lastProgrammaticScrollTime = useRef(0);

  const scrollToBottom = (force = false, instant = false) => {
    const el = bodyRef.current;
    if (!el) return;
    if (force) setUserHasScrolledUp(false);

    // Using requestAnimationFrame or direct update instead of setTimeout 0 for better sync
    requestAnimationFrame(() => {
      const currentHasScrolledUp = force ? false : userHasScrolledUp;
      if (force || !currentHasScrolledUp) {
        lastProgrammaticScrollTime.current = Date.now();
        const targetScrollTop = el.scrollHeight - el.clientHeight;

        if (Math.abs(el.scrollTop - targetScrollTop) < 2) return;

        if (instant) {
          const prev = el.style.scrollBehavior;
          el.style.scrollBehavior = "auto";
          el.scrollTop = Math.ceil(targetScrollTop);
          el.style.scrollBehavior = prev;
        } else {
          el.scrollTo({ top: Math.ceil(targetScrollTop), behavior: "smooth" });
        }
      }
    });
  };

  // Initial scroll on message change - only if not scrolled up
  useEffect(() => {
    if (!userHasScrolledUp || messages.length === 0) {
      scrollToBottom(false, messages.length < 5); // Instant for short/initial histories
    }
  }, [messages.length]); // Only trigger when message count changes

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const handleScroll = () => {
      // Guard: ignore scroll events caused by our own scrollToBottom
      if (Date.now() - lastProgrammaticScrollTime.current < 500) return;

      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > 25) { // 25px threshold a bit more lenient than 15
        setUserHasScrolledUp(true);
      } else if (distanceFromBottom < 5) {
        setUserHasScrolledUp(false);
      }
    };

    const userInteractionHandler = (e: any) => {
      if (!el) return;

      // If it's a wheel event, check the delta to see if the user is trying to scroll UP
      if (e.type === "wheel") {
        if (e.deltaY < 0) {
          setUserHasScrolledUp(true);
          return;
        }
      }

      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > 10) {
        setUserHasScrolledUp(true);
      }
    };

    const handleTypingFrame = () => {
      if (!userHasScrolledUp && el) {
        const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (dist > 5) scrollToBottom(false, true);
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("wheel", userInteractionHandler, { passive: true });
    el.addEventListener("touchstart", userInteractionHandler, { passive: true });
    el.addEventListener("touchmove", userInteractionHandler, { passive: true });
    window.addEventListener("carmen-typing-frame", handleTypingFrame);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", userInteractionHandler);
      el.removeEventListener("touchstart", userInteractionHandler);
      el.removeEventListener("touchmove", userInteractionHandler);
      window.removeEventListener("carmen-typing-frame", handleTypingFrame);
    };
  }, [userHasScrolledUp]);

  function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
    setInputValue(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      if (inputRef.current) inputRef.current.style.height = "auto";
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ใหญ่เกินไป ไม่เกิน 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setImageBase64(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <>
      {/* Modals */}
      <AnimatePresence>
        {deleteModal.open && deleteModal.roomId && (
          <CarmenModal
            title="ยืนยันลบห้องแชท?"
            description="บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้"
            confirmText="ลบทิ้ง" cancelText="ยกเลิก"
            onConfirm={confirmDeleteRoom}
            onCancel={() => setDeleteModal({ open: false, roomId: null })}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {clearModal && (
          <CarmenModal
            title="ล้างประวัติห้องนี้?"
            description="ข้อความในห้องนี้จะถูกลบทั้งหมด"
            confirmText="ลบเลย" cancelText="ยกเลิก"
            onConfirm={confirmClearHistory}
            onCancel={() => setClearModal(false)}
          />
        )}
      </AnimatePresence>

      <CarmenHistoryScreen
        rooms={rooms}
        currentRoomId={currentRoomId}
        isOpen={showRoomDropdown}
        onClose={() => setShowRoomDropdown(false)}
        onNewChat={createNewChat}
        onSelect={switchRoom}
        onDelete={(rid) => setDeleteModal({ open: true, roomId: rid })}
        isProcessing={isProcessing()}
        theme={theme}
      />

      <ChatHeader
        isExpanded={isExpanded}
        onDragStart={onDragStart}
        toggleExpand={toggleExpand}
        toggleOpen={toggleOpen}
        isProcessing={isProcessing}
        showRoomDropdown={showRoomDropdown}
        setShowRoomDropdown={setShowRoomDropdown}
        config={config}
        currentRoomId={currentRoomId}
        setClearModal={setClearModal}
      />

      <MessageList
        bodyRef={bodyRef}
        messages={messages}
        showSuggestions={showSuggestions}
        suggestions={suggestions}
        sendMessage={sendMessage}
        sendFeedback={sendFeedback}
        retryMessage={retryMessage}
        theme={theme}
        isResizing={isResizing}
      />

      {/* ===== STICKY QUEUE ===== */}
      <AnimatePresence>
        {messages.filter(m => m.isQueued && m.role === "user").length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-[90px] left-0 right-0 px-4 z-40 flex flex-col items-end gap-2 pointer-events-none"
          >
            {messages.filter(m => m.isQueued && m.role === "user").map(msg => (
              <motion.div
                key={`sticky-${msg.id}`}
                layout
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 0.9, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                className="bg-slate-800/80 backdrop-blur-md text-white text-[13px] px-3 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[70%] truncate pointer-events-auto border border-white/10 flex items-center gap-2"
              >
                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                <span className="truncate" dangerouslySetInnerHTML={{ __html: msg.html }} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {userHasScrolledUp && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.5, x: "-50%", transition: { duration: 0.15 } }}
            onClick={() => scrollToBottom(true, false)}
            className="absolute bottom-[110px] left-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg z-50 transition-transform hover:scale-110 active:scale-95"
            style={{ background: `linear-gradient(135deg, ${theme}, ${theme}dd)` }}
            title="เลื่อนลงล่างสุด"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11 4v12.59l-3.3-3.29L6.29 14.7l5 5 .09.08.09.06.06.03.11.04h.12.12l.11-.04.06-.03.09-.06.09-.08 5-5-1.42-1.41-3.3 3.29V4h-2z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      <ChatInput
        isResizing={isResizing}
        config={config}
        fileInputRef={fileInputRef}
        handleFileChange={handleFileChange}
        inputRef={inputRef}
        inputValue={inputValue}
        handleInput={handleInput}
        handleKeyDown={handleKeyDown}
        setIsInputFocused={setIsInputFocused}
        sendMessage={sendMessage}
        theme={theme}
        imageBase64={imageBase64}
        setImageBase64={setImageBase64}
      />


      <AnimatePresence>
        {alertModal.open && (
          <CarmenModal
            title={alertModal.title}
            description={alertModal.description}
            variant={alertModal.variant}
            confirmText="ตกลง"
            cancelText="ปิด"
            onConfirm={() => setAlertModal({ ...alertModal, open: false })}
            onCancel={() => setAlertModal({ ...alertModal, open: false })}
          />
        )}
      </AnimatePresence>

      <CarmenHistoryScreen
        rooms={rooms}
        currentRoomId={currentRoomId}
        isOpen={showRoomDropdown}
        onClose={() => setShowRoomDropdown(false)}
        onNewChat={createNewChat}
        onSelect={switchRoom}
        onDelete={(id: string) => setDeleteModal({ open: true, roomId: id })}
        theme={theme}
      />
    </>
  );
}