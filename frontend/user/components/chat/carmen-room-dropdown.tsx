"use client";
import { CarmenRoom } from "@/hooks/use-carmen-api";

import { useRef, useEffect } from "react";

interface Props {
  rooms: CarmenRoom[];
  currentRoomId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (roomId: string) => void;
  onDelete: (roomId: string) => void;
}

export default function CarmenRoomDropdown({
  rooms,
  currentRoomId,
  isOpen,
  onClose,
  onNewChat,
  onSelect,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-3 w-64 z-50 rounded-2xl overflow-hidden shadow-2xl border border-white/10"
      style={{
        background: "rgba(30, 41, 59, 0.98)",
        backdropFilter: "blur(16px)",
        animation: "dropdownIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <span className="text-white font-semibold text-sm">ประวัติแชท</span>
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-lg font-bold transition-transform hover:scale-110"
          style={{ background: "linear-gradient(135deg, #34558b, #34558b)" }}
          title="เริ่มแชทใหม่"
        >
          +
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto p-2 flex flex-col gap-1">
        {rooms.length === 0 ? (
          <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-sm">
            ไม่มีประวัติการสนทนา
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.room_id}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                room.room_id === currentRoomId
                  ? "bg-[#34558b]/20 border-[#34558b]/40 text-white"
                  : "text-slate-400 border-transparent hover:bg-white/[0.08] hover:text-white hover:border-white/5"
              }`}
              onClick={() => onSelect(room.room_id)}
            >
              <span className="text-[13.5px] font-medium truncate flex-1 mr-2">
                {room.title || "บทสนทนาใหม่"}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(room.room_id);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-lg leading-none transition-all hover:scale-110"
                title="ลบ"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes dropdownIn {
          from { opacity: 0; transform: scale(0.9) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}