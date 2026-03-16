"use client";
import { useEffect, useRef, useState } from "react";

interface Props {
  suggestions: string[];
  onSelect: (text: string) => void;
  theme?: string;
  t: any;
}

export default function CarmenWelcome({ suggestions, onSelect, theme = "#34558b", t }: Props) {
  const WELCOME_TITLE = t.welcome.title;
  const WELCOME_DESC = t.welcome.desc;
  const [typedTitle, setTypedTitle] = useState("");
  const [showDesc, setShowDesc] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isExiting, setIsExiting] = useState(false);
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

  function handleSelect(text: string, idx: number) {
    if (isExiting) return;
    setSelectedIndex(idx);
    setIsExiting(true);
    // Wait for the exit animation to play before sending
    setTimeout(() => onSelect(text), 500);
  }

  return (
    <div
      className={`flex flex-col items-center px-4 pt-8 pb-4 text-center carmen-welcome-container ${isExiting ? "carmen-exiting" : ""}`}
      style={{ "--carmen-theme": theme, "--carmen-theme-low": `${theme}cc` } as React.CSSProperties}
    >
      {/* Hero Icon */}
      <div
        className={`w-16 h-16 rounded-[22px] flex items-center justify-center mb-4 shadow-lg bg-[linear-gradient(135deg,var(--carmen-theme)_0%,var(--carmen-theme-low)_100%)] animate-[heroIconPop_0.8s_cubic-bezier(0.16,1,0.3,1)] ${isExiting ? "carmen-icon-exit" : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="32" height="32">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>

      {/* Title */}
      <h2 className={`text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 min-h-[28px] ${isExiting ? "carmen-title-exit" : ""}`}>
        {typedTitle}<span className={`animate-pulse text-slate-300 dark:text-slate-600 ${isExiting ? "opacity-0" : ""}`}>|</span>
      </h2>

      {/* Description */}
      <p className={`text-sm text-slate-500 dark:text-slate-400 max-w-[260px] leading-relaxed transition-all duration-700 ${showDesc ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"} ${isExiting ? "carmen-desc-exit" : ""}`}>
        {WELCOME_DESC}
      </p>

      {/* Suggestion Chips */}
      {showChips && (
        <div className="flex flex-wrap gap-2 mt-5 justify-center">
          {suggestions.map((s, i) => {
            const isSelected = selectedIndex === i;
            const isOther = selectedIndex !== null && selectedIndex !== i;
            return (
              <button
                key={i}
                onClick={() => handleSelect(s, i)}
                disabled={isExiting}
                className={`text-sm px-3 py-1.5 rounded-xl border
                  cursor-pointer text-left
                  carmen-chip carmen-chip-delay-${i}
                  ${isSelected
                    ? "carmen-chip-selected"
                    : isOther
                      ? "carmen-chip-dismissed"
                      : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:-translate-y-0.5 hover:shadow-md hover:border-[var(--carmen-theme)] hover:text-[var(--carmen-theme)]"
                  }`}
                style={{
                  ...(isSelected ? {
                    borderColor: theme,
                    color: "white",
                    background: `linear-gradient(135deg, ${theme}, ${theme}dd)`,
                    boxShadow: `0 4px 20px ${theme}44`,
                  } : {}),
                  ...(isOther ? {
                    transitionDelay: `${Math.abs(i - (selectedIndex ?? 0)) * 0.04}s`,
                  } : {}),
                }}
              >
                {isSelected && (
                  <span className="carmen-chip-spark" />
                )}
                {s}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        .carmen-chip {
          animation: chipEnter 0.5s cubic-bezier(0.16,1,0.3,1) backwards;
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          position: relative;
          overflow: hidden;
        }
        .carmen-chip-delay-0 { animation-delay: 0s; }
        .carmen-chip-delay-1 { animation-delay: 0.08s; }
        .carmen-chip-delay-2 { animation-delay: 0.16s; }
        .carmen-chip-delay-3 { animation-delay: 0.24s; }
        .carmen-chip-delay-4 { animation-delay: 0.32s; }
        .carmen-chip-delay-5 { animation-delay: 0.40s; }

        /* Selected chip: scale up + glow */
        .carmen-chip-selected {
          transform: scale(1.08);
          z-index: 10;
        }

        /* Other chips: fade + shrink + slide away */
        .carmen-chip-dismissed {
          opacity: 0 !important;
          transform: scale(0.85) translateY(6px) !important;
          pointer-events: none;
          border-color: transparent !important;
        }

        /* Spark/ripple effect on selected chip */
        .carmen-chip-spark {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.5) 0%, transparent 70%);
          animation: sparkPulse 0.5s ease-out forwards;
          border-radius: inherit;
          pointer-events: none;
        }

        /* Icon exit */
        .carmen-icon-exit {
          animation: iconExit 0.4s cubic-bezier(0.4,0,1,1) 0.15s forwards;
        }
        /* Title exit */
        .carmen-title-exit {
          animation: textExit 0.35s cubic-bezier(0.4,0,1,1) 0.1s forwards;
        }
        /* Description exit */
        .carmen-desc-exit {
          animation: textExit 0.3s cubic-bezier(0.4,0,1,1) 0.05s forwards;
        }

        @keyframes heroIconPop {
          from { transform: scale(0.5) rotate(-15deg); opacity: 0; }
          to { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes chipEnter {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sparkPulse {
          0% { opacity: 1; transform: scale(0.5); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        @keyframes iconExit {
          to { transform: scale(0.5) rotate(10deg); opacity: 0; filter: blur(4px); }
        }
        @keyframes textExit {
          to { opacity: 0; transform: translateY(-8px); filter: blur(2px); }
        }
      `}</style>
    </div>
  );
}