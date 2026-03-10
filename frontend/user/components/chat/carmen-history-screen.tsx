"use client";
import React from "react";
import { CarmenRoom } from "@/hooks/use-carmen-api";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
    rooms: CarmenRoom[];
    currentRoomId: string | null;
    isOpen: boolean;
    onClose: () => void;
    onNewChat: () => void;
    onSelect: (roomId: string) => void;
    onDelete: (roomId: string) => void;
    isProcessing?: boolean;
    theme?: string;
}

export default function CarmenHistoryScreen({
    rooms,
    currentRoomId,
    isOpen,
    onClose,
    onNewChat,
    onSelect,
    onDelete,
    isProcessing = false,
    theme = "#34558b"
}: Props) {
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat("th-TH", {
                day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit"
            }).format(date);
        } catch {
            return dateStr;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="absolute inset-0 z-[150] flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white overflow-hidden rounded-[inherit]"
                    style={{
                        "--carmen-theme": theme,
                        "--carmen-theme-fade": `${theme}dd`
                    } as React.CSSProperties}
                >
                    {/* Header */}
                    <div className="px-6 py-5 flex items-center gap-4 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                        <button
                            onClick={onClose}
                            title="กลับไปที่แชท"
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 hover:scale-105 transition-all"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="flex-1 m-0 text-[18px] font-semibold">ประวัติการสนทนา</h2>
                        <button
                            onClick={onNewChat}
                            disabled={isProcessing}
                            title={isProcessing ? "ระบบกำลังประมวลผล" : "เริ่มแชทใหม่"}
                            className={`w-9 h-9 flex items-center justify-center rounded-xl text-xl font-bold transition-all shadow-lg bg-[linear-gradient(135deg,var(--carmen-theme),var(--carmen-theme-fade))] ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                                }`}
                        >
                            +
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 overscroll-contain">
                        {rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-5 text-center text-slate-400">
                                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 opacity-50">
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                                <p>ยังไม่มีประวัติการสนทนา</p>
                                <button
                                    onClick={onNewChat}
                                    disabled={isProcessing}
                                    className={`mt-5 px-6 py-2.5 rounded-xl text-white font-semibold transition-all shadow-md bg-[linear-gradient(135deg,var(--carmen-theme),var(--carmen-theme-fade))] ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                                        }`}
                                >
                                    เริ่มบทสนทนาแรก
                                </button>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <div
                                    key={room.room_id}
                                    onClick={() => !isProcessing && onSelect(room.room_id)}
                                    className={`group relative flex items-start gap-4 p-5 sm:p-7 rounded-[20px] transition-all duration-300 border ${room.room_id === currentRoomId
                                        ? "bg-[var(--carmen-theme)]/10 border-[var(--carmen-theme)]"
                                        : "bg-white dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.08]"
                                        } ${isProcessing ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.15] hover:-translate-y-0.5 hover:shadow-xl"}`}
                                >
                                    <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                                        <span className="font-bold text-[16px] sm:text-[19px] text-slate-900 dark:text-white leading-snug break-words">
                                            {room.title || "บทสนทนาใหม่"}
                                        </span>
                                        {room.lastMessage && (
                                            <span className="text-[13.5px] sm:text-[15px] text-slate-500 dark:text-white/45 leading-relaxed font-['Sarabun',_sans-serif] line-clamp-3 sm:line-clamp-4 break-words opacity-80">
                                                {room.lastMessage}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-white/25 uppercase tracking-widest mt-1.5">
                                            {formatDate(room.updated_at)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isProcessing) onDelete(room.room_id);
                                        }}
                                        disabled={isProcessing}
                                        title={isProcessing ? "ระบบกำลังประมวลผล" : "ลบ"}
                                        className={`w-10 h-10 mt-1 rounded-xl bg-white/5 text-white/20 flex-shrink-0 flex items-center justify-center transition-all ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:bg-red-500/10 hover:text-red-500 hover:scale-110"
                                            }`}
                                    >
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 6h18" />
                                            <path d="M19 6L18 20a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                                            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                                            <line x1="10" y1="11" x2="10" y2="17" />
                                            <line x1="14" y1="11" x2="14" y2="17" />
                                        </svg>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
