"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatInputProps {
    isResizing: boolean;
    config: any;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    inputValue: string;
    handleInput: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    setIsInputFocused: (val: boolean) => void;
    sendMessage: () => void;
    theme: string;
    imageBase64: string | null;
    setImageBase64: (val: string | null) => void;
}

export const ChatInput = React.memo(({
    isResizing, config, fileInputRef, handleFileChange, inputRef, inputValue, handleInput, handleKeyDown, setIsInputFocused, sendMessage, theme, imageBase64, setImageBase64
}: ChatInputProps) => {
    return (
        <>
            <AnimatePresence>
                {imageBase64 && (
                    <motion.div
                        className={`px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex items-center gap-3 flex-shrink-0 transition-all duration-300 ${isResizing ? "opacity-10 blur-md" : "opacity-100"}`}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="relative w-12 h-12 flex-shrink-0">
                            <img src={imageBase64} alt="preview" className="w-full h-full object-cover rounded-xl border-2 border-white dark:border-slate-700 shadow-md" />
                            <button onClick={() => setImageBase64(null)} className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-200 shadow">×</button>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">รูปที่แนบ</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`flex items-center gap-3 px-6 pt-5 pb-6 flex-shrink-0 border-t border-slate-100/50 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40 transition-all duration-300 ${isResizing ? "opacity-10 blur-sm pointer-events-none" : "opacity-100 blur-0"}`}>
                {config.showAttach && (
                    <>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} title="แนบรูปภาพ" aria-label="แนบรูปภาพ" />
                        <motion.button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-12 rounded-[14px] flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            title="แนบรูป"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                            </svg>
                        </motion.button>
                    </>
                )}

                <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="พิมพ์ข้อความที่นี่..."
                    className="flex-1 px-5 py-[14px] rounded-[16px] border outline-none resize-none transition-all bg-white/60 dark:bg-slate-800/60 border-slate-200/50 dark:border-slate-600/50 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 min-h-[50px] max-h-[120px] font-['Sarabun',_sans-serif] text-[15px] leading-[1.5] border-[color:var(--input-border-color,transparent)] [box-shadow:var(--input-focus-shadow,none)] backdrop-blur-md"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                />

                <motion.button
                    onClick={() => { sendMessage(); if (inputRef.current) inputRef.current.style.height = "auto"; }}
                    className="w-12 h-12 rounded-[14px] text-white flex items-center justify-center flex-shrink-0 shadow-lg bg-[#0f172a] hover:bg-[var(--chat-theme)]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title="ส่งข้อความ"
                >
                    <svg viewBox="0 0 24 24" fill="white" width="24" height="24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                </motion.button>
            </div>
        </>
    );
});
