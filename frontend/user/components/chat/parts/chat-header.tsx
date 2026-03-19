"use client";
import React from "react";
import { motion } from "framer-motion";

interface ChatHeaderProps {
    isExpanded: boolean;
    onDragStart?: (e: React.PointerEvent) => void;
    toggleExpand: () => void;
    toggleOpen: () => void;
    isProcessing: () => boolean;
    showRoomDropdown: boolean;
    setShowRoomDropdown: (val: boolean) => void;
    config: any;
    currentRoomId: string | null;
    setClearModal: (val: boolean) => void;
    t: any;
}

export const ChatHeader = React.memo(({
    isExpanded, onDragStart, toggleExpand, toggleOpen, isProcessing,
    showRoomDropdown, setShowRoomDropdown, config, currentRoomId, setClearModal, t
}: ChatHeaderProps) => {
    return (
        <motion.div
            layout
            className={`flex items-center justify-between px-6 py-5 text-white flex-shrink-0 select-none relative overflow-hidden bg-[var(--chat-theme)] ${isExpanded ? "rounded-t-[24px]" : "rounded-t-[32px] cursor-move active:cursor-move"} transition-[border-radius] duration-[0.6s] ease-[ease]`}
            onPointerDown={onDragStart}
            whileTap={isExpanded ? {} : { cursor: "grabbing" }}
        >
            {/* Header Glass Shine */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3">
                <motion.div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/25 flex-shrink-0 bg-white/20 backdrop-blur-md"
                    animate={{ y: [0, -3, 0] }}
                    transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" />
                        <path d="M2 17l10 5 10-5" />
                        <path d="M2 12l10 5 10-5" />
                    </svg>
                </motion.div>
                <div>
                    <h3 className="text-[16px] font-bold tracking-tight leading-tight [text-shadow:0_1px_4px_rgba(0,0,0,0.2)]">
                        {config.title || "Carmen AI Specialist"}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold opacity-90 uppercase tracking-[0.05em]">
                        <motion.span
                            className="w-2 h-2 bg-green-400 rounded-full shadow-[0_0_8px_rgba(74,222,128,0.6)]"
                            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                        {t("header.status_online")}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => {
                        if (isProcessing()) {
                            alert(t("chat.switch_room_block"));
                            return;
                        }
                        setShowRoomDropdown(!showRoomDropdown);
                    }}
                    disabled={isProcessing()}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isProcessing() ? "bg-white/5 opacity-50 cursor-not-allowed" : "bg-white/15 hover:bg-white/25"}`}
                    title={isProcessing() ? t("chat.status_processing") : t("header.history")}
                >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="17" height="17">
                        <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7 7.07 7.07 0 0 1-6-3.18l-1.42 1.42A8.9 8.9 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                </button>

                <button
                    onClick={toggleExpand}
                    className="w-8 h-8 rounded-xl items-center justify-center bg-white/15 hover:bg-white/25 transition-colors hidden sm:flex"
                    title={isExpanded ? t("header.collapse") : t("header.expand")}
                >
                    {isExpanded ? (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                            <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="10" y1="14" x2="3" y2="21" /><line x1="21" y1="3" x2="14" y2="10" />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                            <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                    )}
                </button>

                {config.showClear && currentRoomId && (
                    <button
                        onClick={() => {
                            if (isProcessing()) {
                                alert(t("chat.clear_history_block"));
                                return;
                            }
                            setClearModal(true);
                        }}
                        disabled={isProcessing()}
                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isProcessing() ? "bg-white/5 opacity-50 cursor-not-allowed" : "bg-white/15 hover:bg-white/25"}`}
                        title={isProcessing() ? t("chat.status_processing") : t("header.clear")}
                    >
                        <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                            <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />
                        </svg>
                    </button>
                )}

                <button
                    onClick={toggleOpen}
                    className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
                    title={t("header.close")}
                >
                    <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            </div>
        </motion.div>
    );
});
