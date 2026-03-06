"use client";

interface Props {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CarmenModal({
  title,
  description,
  confirmText = "ตกลง",
  cancelText = "ยกเลิก",
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-6"
      style={{
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-7 text-center border border-black/5 shadow-2xl"
        style={{
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          animation: "scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            width="28"
            height="28"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>

        <p
          className="font-bold text-lg text-slate-900 mb-2"
          style={{ fontFamily: "'Sarabun', sans-serif" }}
        >
          {title}
        </p>
        <p
          className="text-slate-500 text-sm leading-relaxed"
          style={{ fontFamily: "'Sarabun', sans-serif" }}
        >
          {description}
        </p>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all hover:scale-[1.02] shadow-md"
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
      `}</style>
    </div>
  );
}