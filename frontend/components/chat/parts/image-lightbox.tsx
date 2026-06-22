"use client";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  src: string | null;
  onClose: () => void;
}

export default function ImageLightbox({ src, onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (src) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [src, handleKeyDown]);

  return (
    <AnimatePresence>
      {src && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="absolute inset-0 z-[100] flex items-center justify-center cursor-zoom-out"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            title="ปิด"
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          {/* Image */}
          <motion.img
            key={src}
            src={src}
            alt="Preview"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="max-w-[92%] max-h-[85%] object-contain rounded-xl shadow-2xl cursor-default"
            onClick={(e) => e.stopPropagation()}
            draggable={false}
          />

          {/* Open in new tab link */}
          {(() => {
            const s = String(src);
            const isSafe =
              s.startsWith("/") ||
              s.startsWith("http://") ||
              s.startsWith("https://") ||
              s.startsWith("data:") ||
              s.startsWith("blob:");
            return isSafe ? (
              <a
                href={s}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-4 right-4 text-xs text-white/50 hover:text-white/80 underline transition-colors"
              >
                เปิดในแท็บใหม่ ↗
              </a>
            ) : null;
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
