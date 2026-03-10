"use client";
import { DisplayMessage } from "@/hooks/use-carmen-chat";
import React, { useState, useMemo, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import rehypeRaw from "rehype-raw";

interface Props {
  msg: DisplayMessage;
  onFeedback?: (msgId: string, score: number) => void;
  onRetry?: (errorText: string) => void;
  theme?: string;
}

const CarmenMessage = memo(function CarmenMessage({ msg, onFeedback, onRetry, theme = "#34558b" }: Props) {
  const [copied, setCopied] = useState(false);
  const [feedbackScore, setFeedbackScore] = useState<number | null>(null);
  const isBot = msg.role === "bot";

  const rawContent = msg.html; // Note: although named 'html', it might contain markdown now

  function handleCopy() {
    const el = document.createElement("div");
    el.innerHTML = msg.html;
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

  function handleFeedback(score: number) {
    if (!msg.msgId || !onFeedback || feedbackScore !== null) return;
    onFeedback(msg.msgId, score);
    setFeedbackScore(score);
  }


  // Prevent phantom requests/broken UI from incomplete tags during streaming
  const stripIncompleteTags = (text: string) => {
    // Strip trailing incomplete <img> or <a> tags
    return text.replace(/<[a-z]*[^>]*$/i, "");
  };

  const processedContent = useMemo(() => {
    return stripIncompleteTags(rawContent);
  }, [rawContent]);


  const formatTime = (ts?: string) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    } catch { return ""; }
  };

  if (isBot && msg.isQueued) {
    return null;
  }

  return (
    <div
      className={`group relative w-fit max-w-[88%] text-[15px] font-['Sarabun',_sans-serif] flex flex-col ${isBot
        ? "self-start mr-auto rounded-[20px] rounded-bl-[4px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 pt-[14px] px-[20px] pb-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        : "self-end ml-auto rounded-[20px] rounded-br-[4px] text-white py-[14px] px-[20px] pb-[10px] shadow-[0_4px_12px_rgba(15,23,42,0.15)]"
        }`}
      style={{
        backgroundColor: isBot ? undefined : theme,
      }}
    >
      <div className={`prose prose-sm max-w-none mb-1 ${isBot ? "text-slate-800 dark:text-slate-100 dark:prose-invert" : "text-white"}`}>
        {msg.isError ? (
          <div className="flex flex-col gap-2.5">
            <div className="text-red-500/90 font-medium text-[14px] flex items-center gap-2">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              เกิดข้อผิดพลาดในการเชื่อมต่อ
            </div>
            {onRetry && msg.errorText && (
              <button
                onClick={() => onRetry(msg.errorText!)}
                className="self-start px-3.5 py-1.5 text-slate-600 dark:text-slate-300 rounded-xl text-[13px] font-semibold transition-all hover:bg-slate-100 dark:hover:bg-slate-700/50 active:scale-95 border border-slate-200 dark:border-slate-600 flex items-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                  <path d="M3 3v5h5"></path>
                </svg>
                ลองอีกครั้ง
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {!msg.html && isBot && !msg.isQueued ? (
              <div className="flex items-center gap-2 py-1">
                <span className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">
                  {msg.statusText || "กำลังค้นหาเอกสารที่เกี่ยวข้อง"}
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
              <div
                className="carmen-content break-words leading-relaxed"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            )}
            {msg.isQueued && !isBot && (
              <div className="text-[10px] text-white/60 font-medium uppercase tracking-widest mt-1 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-white/30 border-t-white animate-spin" />
                🕐 รอคิว
              </div>
            )}
          </div>
        )}
      </div>


      {/* Tools Row (timestamp + tools) */}
      <div className="flex items-center justify-between mt-1 gap-2 min-h-[16px]">
        {msg.timestamp && !msg.isQueued && (
          <div className={`text-[10px] font-medium uppercase tracking-wider opacity-40 ${isBot ? "text-slate-500" : "text-white"}`}>
            {formatTime(msg.timestamp)}
          </div>
        )}

        {isBot && !msg.isError && !msg.isQueued && (
          <div className="flex items-center gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 dark:text-slate-500 transition-colors hover:text-blue-500"
              title={copied ? "คัดลอกแล้ว!" : "คัดลอกข้อมูล"}
            >
              {copied ? (
                <span className="text-[12px] font-bold text-green-600 leading-none">✓</span>
              ) : (
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
              )}
            </button>

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
                    title="มีประโยชน์"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
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
                    title="ไม่ถูกต้อง"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
                    </svg>
                  </motion.button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default CarmenMessage;
