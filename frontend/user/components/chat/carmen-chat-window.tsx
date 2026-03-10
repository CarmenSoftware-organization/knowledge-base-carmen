"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useCarmenChat } from "@/hooks/use-carmen-chat";

import { ChatContent } from "./parts/chat-content";

type ChatState = ReturnType<typeof useCarmenChat>;
interface Props { state: ChatState }

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
    const startB = parseInt(style.getPropertyValue("--chat-bottom")) || parseInt(style.bottom) || 120;
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
          ["--chat-bottom" as string]: isExpanded ? "20px" : safeFormat(state.position?.bottom ?? 120),
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
// (Sub-components moved to ./parts/)
