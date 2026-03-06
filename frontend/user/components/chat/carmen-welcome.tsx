"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
  theme?: string;
}

const WELCOME_TITLE = "สวัสดีค่ะ Carmen พร้อมช่วย!";
const WELCOME_DESC = "สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ";

export default function CarmenWelcome({ suggestions, onSelect, theme = "#34558b" }: Props) {
  const [typedTitle, setTypedTitle] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = 0;
    setTypedTitle(""); setShowDesc(false); setShowChips(false);
    const iv = setInterval(() => {
      if (indexRef.current < WELCOME_TITLE.length) {
        setTypedTitle(WELCOME_TITLE.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(iv);
        setTimeout(() => { setShowDesc(true); setTimeout(() => setShowChips(true), 400); }, 200);
      }
    }, 40);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex flex-col items-center px-4 pt-8 pb-4 text-center">
      <div
        className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-4 shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${theme} 0%, ${theme}cc 100%)`,
          animation: "heroIconPop 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="32" height="32">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 min-h-[28px]">
        {typedTitle}<span className="animate-pulse text-slate-300 dark:text-slate-600">|</span>
      </h2>

      <p className="text-sm text-slate-500 dark:text-slate-400max-w-[260px] leading-relaxed transition-all duration-700"
        style={{ opacity: showDesc ? 1 : 0, transform: showDesc ? "translateY(0)" : "translateY(10px)" }}>
        {WELCOME_DESC}
      </p>

      {showChips && (
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s)}
              className="text-sm px-3 py-1.5 rounded-xl border
    bg-white dark:bg-slate-800
    text-slate-600 dark:text-slate-300
    cursor-pointer transition-all duration-200
    hover:-translate-y-0.5 hover:shadow-md text-left"
              style={{
                borderColor: "#e2e8f0",
                animation: `chipEnter 0.5s cubic-bezier(0.16,1,0.3,1) ${i * 0.08}s backwards`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = theme;
                e.currentTarget.style.color = theme;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.color = "";
              }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes heroIconPop {
          from { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          to { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes chipEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}