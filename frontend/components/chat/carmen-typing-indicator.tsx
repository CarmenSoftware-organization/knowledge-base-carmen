"use client";

interface Props {
  status: string;
  theme?: string;
}

export default function CarmenTypingIndicator({ status, theme = "#34558b" }: Props) {
  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-white dark:bg-slate-800 rounded-[20px] rounded-bl-[4px] border border-slate-100 dark:border-slate-700 w-fit max-w-[88%] shadow-sm">
      <span className="text-sm text-slate-500 dark:text-slate-400 animate-[statusPulse_2s_ease-in-out_infinite]">
        {status}
      </span>
      <div className="flex gap-1 items-center" style={{ "--carmen-theme": theme } as React.CSSProperties}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`block w-2 h-2 rounded-full opacity-60 carmen-bounce carmen-bounce-delay-${i}`}
          />
        ))}
      </div>
      <style jsx>{`
        .carmen-bounce {
          background: var(--carmen-theme);
          animation: typingBounce 1.4s infinite ease-in-out;
        }
        .carmen-bounce-delay-0 { animation-delay: -0.32s; }
        .carmen-bounce-delay-1 { animation-delay: -0.16s; }
        .carmen-bounce-delay-2 { animation-delay: 0s; }
        
        @keyframes typingBounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}