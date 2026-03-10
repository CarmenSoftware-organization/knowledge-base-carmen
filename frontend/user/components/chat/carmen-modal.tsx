"use client";

interface Props {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "info" | "success";
}

export default function CarmenModal({
  title,
  description,
  confirmText = "ตกลง",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
  variant = "danger",
}: Props) {
  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return {
          iconBg: "bg-green-100",
          iconColor: "text-green-500",
          confirmBg: "bg-green-500 hover:bg-green-600",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ),
        };
      case "info":
        return {
          iconBg: "bg-blue-100",
          iconColor: "text-blue-500",
          confirmBg: "bg-[#34558b] hover:bg-[#2a446f]",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="28" height="28">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          ),
        };
      case "danger":
      default:
        return {
          iconBg: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-500 dark:text-red-400",
          confirmBg: "bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="28" height="28">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          ),
        };
    }
  };

  const v = getVariantStyles();

  return (
    <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xs rounded-2xl p-7 text-center border border-black/5 dark:border-white/10 shadow-2xl bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl animate-[scaleUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <div className={`w-14 h-14 rounded-full ${v.iconBg} ${v.iconColor} flex items-center justify-center mx-auto mb-4`}>
          {v.icon}
        </div>

        <p className="font-bold text-lg text-slate-900 dark:text-white mb-2 font-sarabun">{title}</p>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-sarabun">{description}</p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white ${v.confirmBg} transition-all hover:scale-[1.02] shadow-md`}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .font-sarabun {
          font-family: 'Sarabun', sans-serif;
        }
      `}</style>
    </div>
  );
}
