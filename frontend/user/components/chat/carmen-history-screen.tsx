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
    t: any;
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
    theme = "#34558b",
    t
}: Props) {
    // Utility to convert hex to rgb for shadow effects
    const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `${r}, ${g}, ${b}`;
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "";
        try {
            const date = new Date(dateStr);
            return new Intl.DateTimeFormat(t("chat.placeholder") === "Type your message here..." ? "en-US" : "th-TH", {
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
                        "--carmen-theme-fade": `${theme}dd`,
                        "--carmen-theme-rgb": hexToRgb(theme)
                    } as React.CSSProperties}
                >
                    {/* Header */}
                    <div className="px-5 py-4 flex items-center gap-4 border-b border-black/5 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl z-20">
                        <button
                            onClick={onClose}
                            title={t("header.history")}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-all text-slate-600 dark:text-slate-300 active:scale-90"
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="flex-1 m-0 text-[17px] font-bold tracking-tight text-slate-800 dark:text-white">{t("header.history")}</h2>
                        <button
                            onClick={onNewChat}
                            disabled={isProcessing}
                            title={isProcessing ? t("chat.status_processing") : t("welcome.new_chat")}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[14px] font-bold transition-all shadow-lg 
                                bg-[linear-gradient(135deg,var(--carmen-theme),var(--carmen-theme-fade))] text-white
                                ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 hover:shadow-[0_8px_20px_-4px_rgba(var(--carmen-theme-rgb),0.5)]"}`}
                        >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            <span>{t("welcome.new_chat")}</span>
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 overscroll-contain">
                        {rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-5 text-center text-slate-400">
                                <div className="w-16 h-16 bg-black/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-4 opacity-50 text-slate-400 dark:text-slate-400">
                                    <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                                <p>{t("chat.placeholder") === "Type your message here..." ? "No history yet" : "ยังไม่มีประวัติการสนทนา"}</p>
                                <button
                                    onClick={onNewChat}
                                    disabled={isProcessing}
                                    className={`relative mt-5 px-8 py-3 rounded-2xl text-white font-bold transition-all shadow-xl overflow-hidden
                                        bg-[linear-gradient(135deg,var(--carmen-theme),var(--carmen-theme-fade))] 
                                        ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:scale-105 active:scale-95 hover:shadow-[0_12px_24px_-6px_rgba(var(--carmen-theme-rgb),0.6)]"}`}
                                >
                                    {/* Shine overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:animate-[shine_1.5s_infinite] pointer-events-none" />
                                    <span>{t("welcome.title")}</span>
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
                                            {room.title || (t("chat.placeholder") === "Type your message here..." ? "New Conversation" : "บทสนทนาใหม่")}
                                        </span>
                                        {room.lastMessage && (
                                            <span className="text-[13.5px] sm:text-[15px] text-slate-500 dark:text-white/45 leading-relaxed font-['Sarabun',_sans-serif] line-clamp-3 sm:line-clamp-4 break-words opacity-80">
                                                {room.lastMessage}
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 dark:text-white/25 uppercase tracking-widest mt-1.5">
                                            {formatDate(room.updated_at)}
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isProcessing) onDelete(room.room_id);
                                        }}
                                        disabled={isProcessing}
                                        title={isProcessing ? t("chat.status_processing") : t("modal.delete_confirm")}
                                        className={`w-10 h-10 mt-1 rounded-xl bg-black/5 dark:bg-white/5 text-slate-400 dark:text-white/20 flex-shrink-0 flex items-center justify-center transition-all ${isProcessing ? "opacity-50 cursor-not-allowed" : "hover:bg-red-500/10 hover:text-red-500 hover:scale-110"
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
