"use client";
import { DisplayMessage } from "@/hooks/use-carmen-chat";
import { useState, useMemo, memo, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DOMPurify from "dompurify";

// ── Icon constants ──────────────────────────────────────────────────────────

const IconError = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

const IconRetry = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const IconCopy = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
  </svg>
);

const IconExport = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconDocx = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

const IconPdf = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13h2a1 1 0 0 0 0-2H9v6" />
    <path d="M15 11h1.5a1.5 1.5 0 0 1 0 3H15v-3z" />
  </svg>
);

const IconThumbUp = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const IconThumbDown = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

// ── DOMPurify config ────────────────────────────────────────────────────────

const ALLOWED_IFRAME_ORIGINS = [
  "https://www.youtube.com",
  "https://www.youtube-nocookie.com",
  "https://player.vimeo.com",
];

// ── Animation variants ──────────────────────────────────────────────────────

const suggestionContainerVariants = {
  hidden: { opacity: 0, height: 0, marginTop: 0 },
  visible: {
    opacity: 1,
    height: "auto",
    marginTop: 8,
    transition: { staggerChildren: 0.08, delayChildren: 0.1, duration: 0.3, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    height: 0,
    marginTop: 0,
    transition: {
      opacity: { duration: 0.2 },
      height: { duration: 0.3, delay: 0.1 },
      marginTop: { duration: 0.3, delay: 0.1 },
      staggerChildren: 0.05,
      staggerDirection: -1 as const,
    },
  },
};

const suggestionItemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.9 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.8, y: 10, transition: { duration: 0.2 } },
};

// ── Pure helpers ────────────────────────────────────────────────────────────

/** Strip trailing incomplete HTML tags to prevent broken UI during streaming. */
function stripIncompleteTags(text: string): string {
  return text.replace(/<[a-z]*[^>]*$/i, "");
}

// ── Sub-components ──────────────────────────────────────────────────────────

const StaticHtmlContent = memo(function StaticHtmlContent({ content }: { content: string }) {
  return (
    <div
      className="carmen-content break-words leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
});

// ── Types ───────────────────────────────────────────────────────────────────

interface Props {
  msg: DisplayMessage;
  onFeedback?: (msgId: string, score: number) => void;
  onRetry?: (errorText: string) => void;
  onSelect?: (text: string, sourceMsgId?: string) => void;
  theme?: string;
  t: (key: string) => string;
}

// ── Component ───────────────────────────────────────────────────────────────

const CarmenMessage = memo(function CarmenMessage({ msg, onFeedback, onRetry, onSelect, theme = "#34558b", t }: Props) {
  const [copied, setCopied] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isBot = msg.role === "bot";

  // Close export menu on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  // Sanitize HTML to prevent XSS from LLM prompt injection
  const processedContent = useMemo(() => {
    const cleaned = stripIncompleteTags(msg.html);
    if (typeof window === "undefined") return cleaned;

    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.tagName === "IFRAME") {
        const src = node.getAttribute("src") ?? "";
        const trusted = ALLOWED_IFRAME_ORIGINS.some((origin) => src.startsWith(origin));
        if (!trusted) node.parentNode?.removeChild(node);
      }
    });
    const result = DOMPurify.sanitize(cleaned, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["data-lightbox", "target", "rel", "src", "allow", "allowfullscreen", "frameborder"],
      ALLOWED_URI_REGEXP: /^(?:https?:|\/|images\/)/i,
    });
    DOMPurify.removeHooks("afterSanitizeAttributes");
    return result;
  }, [msg.html]);

  function handleCopy() {
    const el = document.createElement("div");
    el.innerHTML = processedContent;
    const text = el.innerText || el.textContent || "";

    const onSuccess = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(onSuccess).catch(() => fallbackCopy(text, onSuccess));
    } else {
      fallbackCopy(text, onSuccess);
    }
  }

  function fallbackCopy(text: string, cb: () => void) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      cb();
    } catch (err) {
      console.error("Fallback copy failed", err);
    }
    document.body.removeChild(ta);
  }

  /** Grab already-rendered images from the DOM and convert to base64 via canvas. */
  function embedImagesFromDom(html: string): string {
    // Get the real rendered images from the content ref
    const renderedImgs = contentRef.current?.querySelectorAll("img");
    if (!renderedImgs || renderedImgs.length === 0) return html;

    const div = document.createElement("div");
    div.innerHTML = html;
    const exportImgs = div.querySelectorAll("img");

    renderedImgs.forEach((rendered, i) => {
      if (i >= exportImgs.length) return;
      const imgEl = rendered as HTMLImageElement;
      if (!imgEl.complete || imgEl.naturalWidth === 0) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = imgEl.naturalWidth;
        canvas.height = imgEl.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(imgEl, 0, 0);
        exportImgs[i].setAttribute("src", canvas.toDataURL("image/png"));
      } catch {
        // keep original src if canvas is tainted (cross-origin)
      }
    });
    return div.innerHTML;
  }

  function handleExportDocx() {
    setShowExportMenu(false);
    const embeddedHtml = embedImagesFromDom(processedContent);
    const header = [
      '<html xmlns:o="urn:schemas-microsoft-com:office:office"',
      ' xmlns:w="urn:schemas-microsoft-com:office:word"',
      ' xmlns="http://www.w3.org/TR/REC-html40">',
      "<head><meta charset='utf-8'>",
      "<style>",
      "body { font-family: 'Sarabun', 'TH SarabunPSK', 'Tahoma', sans-serif; font-size: 14pt; line-height: 1.6; padding: 20px; }",
      "img { max-width: 100%; height: auto; }",
      "table { border-collapse: collapse; width: 100%; }",
      "td, th { border: 1px solid #ccc; padding: 6px 10px; }",
      "</style></head><body>",
    ].join("");
    const footer = "</body></html>";
    const blob = new Blob(["\ufeff", header + embeddedHtml + footer], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carmen-export-${Date.now()}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    setShowExportMenu(false);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write([
      "<!DOCTYPE html><html><head><meta charset='utf-8'>",
      "<title>Carmen Export</title>",
      "<style>",
      "@import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');",
      "body { font-family: 'Sarabun', 'TH SarabunPSK', 'Tahoma', sans-serif; font-size: 14pt; line-height: 1.8; padding: 40px; color: #1e293b; }",
      "img { max-width: 100%; height: auto; }",
      "table { border-collapse: collapse; width: 100%; margin: 12px 0; }",
      "td, th { border: 1px solid #cbd5e1; padding: 8px 12px; }",
      "th { background: #f1f5f9; }",
      "a { color: #2563eb; }",
      "pre { background: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto; }",
      "code { font-size: 12pt; }",
      "@media print { body { padding: 0; } }",
      "</style></head><body>",
      processedContent,
      "</body></html>",
    ].join(""));
    printWindow.document.close();

    // Wait for images to load before printing
    const images = printWindow.document.querySelectorAll("img");
    if (images.length === 0) {
      printWindow.focus();
      printWindow.print();
      return;
    }
    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded >= images.length) {
        printWindow.focus();
        printWindow.print();
      }
    };
    images.forEach((img) => {
      if (img.complete) {
        onLoad();
      } else {
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onLoad);
      }
    });
  }

  function handleFeedback(score: number) {
    if (!msg.msgId || !onFeedback || feedbackScore !== null) return;
    onFeedback(msg.msgId, score);
    setFeedbackScore(score);
  }

  function formatTime(ts?: string): string {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      // Detect display locale by checking if translation output contains Thai characters
      const timeLocale = /[\u0E00-\u0E7F]/.test(t("chat.error_title")) ? "th-TH" : "en-US";
      return d.toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <div
      className={`group relative w-fit max-w-[88%] text-[15px] font-['Sarabun',_sans-serif] flex flex-col transition-shadow duration-300 ${isBot
        ? "self-start mr-auto rounded-[24px] rounded-bl-[4px] carmen-premium-glass pt-[16px] px-[22px] pb-[14px] shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
        : "self-end ml-auto rounded-[24px] rounded-br-[4px] text-white py-[16px] px-[22px] pb-[12px] shadow-[0_12px_24px_rgba(15,23,42,0.2)]"
        }`}
      style={{
        background: isBot
          ? undefined
          : `linear-gradient(135deg, ${theme} 0%, ${theme}dd 100%)`,
        border: isBot ? undefined : "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div className={`prose prose-sm max-w-none mb-1 ${isBot ? "text-slate-800 dark:text-slate-100 dark:prose-invert" : "text-white"}`}>
        {msg.isError ? (
          <div className="flex flex-col gap-2.5">
            <div className="text-red-500/90 font-medium text-[14px] flex items-center gap-2">
              {IconError}
              {t("chat.error_title")}
            </div>
            {msg.errorDetail && (
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-snug whitespace-pre-wrap break-words">
                {msg.errorDetail}
              </p>
            )}
            {onRetry && msg.errorText && (
              <button
                type="button"
                onClick={() => onRetry(msg.errorText!)}
                className="self-start px-3.5 py-1.5 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-700/50 active:scale-95 border border-slate-200 dark:border-slate-600 flex items-center gap-1.5"
              >
                {IconRetry}
                {t("chat.error_retry")}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {!msg.html && isBot ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                  {msg.statusText || t("chat.status_searching")}
                </span>
                <div className="flex gap-1 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 opacity-60 carmen-inline-bounce"
                      style={{ animationDelay: `${i * 0.16}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div ref={contentRef}>
                <StaticHtmlContent content={processedContent} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tools Row (timestamp + action buttons) */}
      <div className="flex items-center justify-between mt-1 gap-2 min-h-[16px]">
        {msg.timestamp && (
          <div className={`text-[10px] font-medium uppercase tracking-wider opacity-40 ${isBot ? "text-slate-500" : "text-white"}`}>
            {formatTime(msg.timestamp)}
          </div>
        )}

        {isBot && !msg.isError && (
          <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              onClick={handleCopy}
              className="p-1 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:scale-110 rounded"
              title={copied ? t("tools.copied") : t("tools.copy")}
            >
              {copied
                ? <span className="text-[12px] font-bold text-green-600 leading-none">✓</span>
                : IconCopy
              }
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setShowExportMenu((v) => !v)}
                className="p-1 text-slate-400 dark:text-slate-500 transition-all duration-200 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:scale-110 rounded"
                title={t("tools.export")}
              >
                {IconExport}
              </button>

              <AnimatePresence>
                {showExportMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute bottom-full mb-1 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[110px] whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={handleExportDocx}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {IconDocx}
                      {t("tools.export_doc")}
                    </button>
                    <button
                      type="button"
                      onClick={handleExportPdf}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {IconPdf}
                      {t("tools.export_pdf")}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {msg.msgId && (
              <>
                <div className="w-[1px] h-3 bg-slate-100 dark:bg-slate-700" />
                <div className="flex items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleFeedback(1)}
                    disabled={feedbackScore !== null}
                    className={`p-1.5 rounded-lg transition-all ${feedbackScore === 1
                      ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 scale-110 shadow-sm"
                      : feedbackScore !== null
                        ? "opacity-30 grayscale scale-95"
                        : "text-slate-400 hover:text-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:scale-110"
                      }`}
                    title={t("tools.helpful")}
                  >
                    {IconThumbUp}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleFeedback(-1)}
                    disabled={feedbackScore !== null}
                    className={`p-1.5 rounded-lg transition-all ${feedbackScore === -1
                      ? "text-red-600 bg-red-50 dark:bg-red-500/10 scale-110 shadow-sm"
                      : feedbackScore !== null
                        ? "opacity-30 grayscale scale-95"
                        : "text-slate-400 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/50 hover:scale-110"
                      }`}
                    title={t("tools.incorrect")}
                  >
                    {IconThumbDown}
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isBot && msg.suggestions && msg.suggestions.length > 0 && (
          <motion.div
            key={`suggestions-${msg.id}-${msg.suggestions.length}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={suggestionContainerVariants}
            className="flex flex-wrap items-start justify-start gap-2 mb-1 overflow-hidden p-1 -ml-1"
          >
            {msg.suggestions.map((s, i) => (
              <motion.button
                key={`${msg.id}-sugg-${i}`}
                variants={suggestionItemVariants}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect?.(s, msg.id)}
                className="text-[13px] px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 dark:hover:border-blue-400/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 font-medium transition-all shadow-sm hover:shadow-md outline-none cursor-pointer text-left w-fit"
              >
                {s}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default CarmenMessage;
