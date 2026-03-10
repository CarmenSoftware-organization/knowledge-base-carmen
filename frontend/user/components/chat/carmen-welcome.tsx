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
    <div className="flex flex-col items-center px-4 pt-8 pb-4 text-center" style={{ "--carmen-theme": theme, "--carmen-theme-low": `${theme}cc` } as React.CSSProperties}>
      <div
        className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-4 shadow-lg bg-[linear-gradient(135deg,var(--carmen-theme)_0%,var(--carmen-theme-low)_100%)] animate-[heroIconPop_0.8s_cubic-bezier(0.16,1,0.3,1)]"
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

      <p className={`text-sm text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed transition-all duration-700 ${showDesc ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"}`}>
        {WELCOME_DESC}
      </p>

      {showChips && (
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelect(s)}
              className={`text-sm px-3 py-1.5 rounded-xl border border-slate-200
    bg-white dark:bg-slate-800
    text-slate-600 dark:text-slate-300
    cursor-pointer transition-all duration-200
    hover:-translate-y-0.5 hover:shadow-md text-left
    hover:border-[var(--carmen-theme)] hover:text-[var(--carmen-theme)]
    carmen-chip carmen-chip-delay-${i}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .carmen-chip {
          animation: chipEnter 0.5s cubic-bezier(0.16,1,0.3,1) backwards;
        }
        /* Handle up to 10 suggestions with delays */
        .carmen-chip-delay-0 { animation-delay: 0s; }
        .carmen-chip-delay-1 { animation-delay: 0.08s; }
        .carmen-chip-delay-2 { animation-delay: 0.16s; }
        .carmen-chip-delay-3 { animation-delay: 0.24s; }
        .carmen-chip-delay-4 { animation-delay: 0.32s; }
        .carmen-chip-delay-5 { animation-delay: 0.40s; }

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