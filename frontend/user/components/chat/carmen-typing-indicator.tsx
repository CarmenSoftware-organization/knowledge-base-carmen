"use client";

interface Props {
  status: string;
  theme?: string;
}

export default function CarmenTypingIndicator({ status, theme = "#34558b" }: Props) {
  return (
    <div className="flex items-center gap-2 py-3 px-4 bg-white dark:bg-slate-800 rounded-[20px] rounded-bl-[4px] border border-slate-100 dark:border-slate-700 w-fit max-w-[88%] shadow-sm">
      <span className="text-sm text-slate-500 dark:text-slate-400"
        style={{ animation: "statusPulse 2s ease-in-out infinite" }}>
        {status}
      </span>
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block w-2 h-2 rounded-full opacity-60"
            style={{
              background: theme,
              animation: "typingBounce 1.4s infinite ease-in-out",
              animationDelay: i === 0 ? "-0.32s" : i === 1 ? "-0.16s" : "0s",
            }}
          />
        ))}
      </div>
      <style>{`
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