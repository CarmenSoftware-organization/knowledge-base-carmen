"use client";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DisplayMessage } from "@/hooks/use-carmen-chat";
import CarmenMessage from "../carmen-message";
import CarmenWelcome from "../carmen-welcome";

interface MessageListProps {
    bodyRef: React.RefObject<HTMLDivElement | null>;
    messages: DisplayMessage[];
    showSuggestions: boolean;
    suggestions: string[];
    sendMessage: (text?: string) => void;
    sendFeedback: (msgId: string, score: number) => void;
    retryMessage: (text: string) => void;
    theme: string;
    isResizing: boolean;
    t: any;
}

export const MessageList = React.memo(({
    bodyRef, messages, showSuggestions, suggestions, sendMessage, sendFeedback, retryMessage, theme, isResizing, t
}: MessageListProps) => {
    return (
        <div
            ref={bodyRef}
            className={`flex-1 overflow-y-auto flex flex-col gap-4 p-4 sm:p-5 pb-8 overscroll-contain transition-all duration-300 ${isResizing ? "opacity-10 blur-md pointer-events-none" : "opacity-100 blur-0"}`}
        >
            <AnimatePresence mode="wait">
                {messages.length === 0 && showSuggestions ? (
                    <motion.div
                        key="welcome"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.1 }}
                    >
                        <CarmenWelcome
                            suggestions={suggestions}
                            onSelect={(text: string) => sendMessage(text)}
                            theme={theme}
                            t={t}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="messages"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="flex flex-col gap-4"
                    >
                        <AnimatePresence initial={false}>
                            {messages.filter((m: any) => !m.isQueued || m.role === "bot").map((msg: any) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 14, scale: 0.96 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 420, damping: 30 }}
                                >
                                    <CarmenMessage msg={msg} onFeedback={sendFeedback} onRetry={retryMessage} onSelect={sendMessage} theme={theme} t={t} />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});
