"use client";
import { DisplayMessage } from "@/hooks/use-carmen-chat";
import { useState } from "react";

interface Props {
  msg: DisplayMessage;
  onFeedback?: (msgId: string, score: number) => void;
  theme?: string;
}

export default function CarmenMessage({ msg, onFeedback, theme = "#34558b" }: Props) {
  const [copied, setCopied] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const isBot = msg.role === "bot";

  function handleCopy() {
    const el = document.createElement("div");
    el.innerHTML = msg.html;
    navigator.clipboard?.writeText(el.innerText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleFeedback(score: number) {
    if (!msg.msgId || !onFeedback) return;
    onFeedback(msg.msgId, score);
    setFeedbackSent(true);
  }

  return (
    <div
      className={`group relative w-fit max-w-[88%] text-[15px] shadow-sm ${isBot
        ? "self-start mr-auto rounded-[20px] rounded-bl-[4px] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700"
        : "self-end ml-auto rounded-[20px] rounded-br-[4px] text-white"
        }`}
      style={{
        padding: isBot ? "14px 20px 36px 20px" : "14px 20px",
        fontFamily: "'Sarabun', sans-serif",
        ...(!isBot && { background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }),
      }}
    >
      <div
        dangerouslySetInnerHTML={{ __html: msg.html }}
        className={`prose prose-sm max-w-none ${isBot
            ? "text-slate-800 dark:text-slate-100"
            : "text-white"
          }`}
        style={{ lineHeight: 1.6 }}
      />

      {/* Bot tools */}
      {isBot && (
        <div className="absolute bottom-2 left-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button onClick={handleCopy} className="p-1 text-slate-400 dark:text-slate-500 transition-colors"
            style={{ ["--hover-color" as string]: theme }}
            onMouseEnter={e => (e.currentTarget.style.color = theme)}
            onMouseLeave={e => (e.currentTarget.style.color = "")}
            title="คัดลอก">
            {copied ? (
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="14" height="14">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#94a3b8" />
              </svg>
            )}
          </button>

          {msg.msgId && !feedbackSent && (
            <>
              <div className="w-px h-3 bg-slate-200 dark:bg-slate-600" />
              <div className="flex gap-1">
                <button onClick={() => handleFeedback(1)}
                  className="text-sm hover:scale-110 transition-transform" title="มีประโยชน์">👍</button>
                <button onClick={() => handleFeedback(-1)}
                  className="text-sm hover:scale-110 transition-transform" title="ไม่ถูกต้อง">👎</button>
              </div>
            </>
          )}
          {feedbackSent && <span className="text-xs text-green-600">ขอบคุณค่ะ ❤️</span>}
        </div>
      )}

      <style>{`
        .prose ul { list-style-type: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose ol { list-style-type: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose li { margin-bottom: 0.25rem; line-height: 1.5; }
        .prose a { color: ${theme}; text-decoration: underline; }
      `}</style>
    </div>
  );
}