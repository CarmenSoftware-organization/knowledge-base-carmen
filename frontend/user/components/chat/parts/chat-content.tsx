"use client";
import React, { useRef, useState, useEffect, ChangeEvent, KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCarmenChat } from "@/hooks/use-carmen-chat";
import CarmenModal from "../carmen-modal";
import CarmenHistoryScreen from "../carmen-history-screen";
import { ChatHeader } from "./chat-header";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import ImageLightbox from "./image-lightbox";

type ChatState = ReturnType<typeof useCarmenChat>;
interface ContentProps {
    state: ChatState;
    theme: string;
    isResizing: boolean;
    onDragStart?: (e: React.PointerEvent) => void;
    isInputFocused: boolean;
    setIsInputFocused: (val: boolean) => void;
}

export function ChatContent({ state, theme, isResizing, onDragStart, isInputFocused, setIsInputFocused }: ContentProps) {
    const {
        isExpanded, messages, rooms, currentRoomId,
        isProcessing, inputValue, imageBase64,
        showSuggestions, showRoomDropdown, deleteModal, clearModal,
        suggestions, config,
        setInputValue, setImageBase64, setShowRoomDropdown,
        setDeleteModal, setClearModal, toggleOpen, toggleExpand,
        createNewChat, switchRoom, sendMessage, retryMessage, sendFeedback,
        confirmDeleteRoom, confirmClearHistory,
        alertModal, setAlertModal,
    } = state;

    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const lastProgrammaticScrollTime = useRef(0);

    // Image lightbox: delegate click on images with data-lightbox attribute
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const handleImageClick = (e: MouseEvent) => {
            const img = (e.target as HTMLElement).closest('[data-lightbox]') as HTMLElement | null;
            if (img) {
                e.preventDefault();
                e.stopPropagation();
                const src = img.getAttribute('data-lightbox') || img.getAttribute('src');
                if (src) setLightboxSrc(src);
            }
        };
        el.addEventListener('click', handleImageClick);
        return () => el.removeEventListener('click', handleImageClick);
    }, []);

    const scrollToBottom = (force = false, instant = false) => {
        const el = bodyRef.current;
        if (!el) return;
        if (force) setUserHasScrolledUp(false);

        requestAnimationFrame(() => {
            const currentHasScrolledUp = force ? false : userHasScrolledUp;
            if (force || !currentHasScrolledUp) {
                lastProgrammaticScrollTime.current = Date.now();
                const targetScrollTop = el.scrollHeight - el.clientHeight;
                if (Math.abs(el.scrollTop - targetScrollTop) < 2) return;

                if (instant) {
                    const prev = el.style.scrollBehavior;
                    el.style.scrollBehavior = "auto";
                    el.scrollTop = Math.ceil(targetScrollTop);
                    el.style.scrollBehavior = prev;
                } else {
                    el.scrollTo({ top: Math.ceil(targetScrollTop), behavior: "smooth" });
                }
            }
        });
    };

    useEffect(() => {
        if (!userHasScrolledUp || messages.length === 0) {
            // Mark programmatic scroll time BEFORE the rAF to prevent
            // the scroll handler from detecting the content shift as "user scrolled up"
            lastProgrammaticScrollTime.current = Date.now();
            setUserHasScrolledUp(false);
            scrollToBottom(true, messages.length < 5);
        }
    }, [messages.length]);

    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;

        const handleScroll = () => {
            // Ignore scroll events triggered by programmatic scrolling (e.g. after sending a message)
            if (Date.now() - lastProgrammaticScrollTime.current < 1200) return;
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (distanceFromBottom > 25) setUserHasScrolledUp(true);
            else if (distanceFromBottom < 5) setUserHasScrolledUp(false);
        };

        const userInteractionHandler = (e: any) => {
            if (!el) return;
            if (e.type === "wheel" && e.deltaY < 0) {
                setUserHasScrolledUp(true);
                return;
            }
            const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
            if (distanceFromBottom > 10) setUserHasScrolledUp(true);
        };

        const handleTypingFrame = () => {
            if (!userHasScrolledUp && el) {
                const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
                if (dist > 5) scrollToBottom(false, true);
            }
        };

        el.addEventListener("scroll", handleScroll, { passive: true });
        el.addEventListener("wheel", userInteractionHandler, { passive: true });
        el.addEventListener("touchstart", userInteractionHandler, { passive: true });
        el.addEventListener("touchmove", userInteractionHandler, { passive: true });
        window.addEventListener("carmen-typing-frame", handleTypingFrame);

        return () => {
            el.removeEventListener("scroll", handleScroll);
            el.removeEventListener("wheel", userInteractionHandler);
            el.removeEventListener("touchstart", userInteractionHandler);
            el.removeEventListener("touchmove", userInteractionHandler);
            window.removeEventListener("carmen-typing-frame", handleTypingFrame);
        };
    }, [userHasScrolledUp]);

    function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
        setInputValue(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
            if (inputRef.current) inputRef.current.style.height = "auto";
        }
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert("ไฟล์ใหญ่เกินไป ไม่เกิน 5MB"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImageBase64(ev.target?.result as string);
        reader.readAsDataURL(file);
    }

    return (
        <>
            <AnimatePresence>
                {deleteModal.open && deleteModal.roomId && (
                    <CarmenModal
                        title="ยืนยันลบห้องแชท?"
                        description="บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้"
                        confirmText="ลบทิ้ง" cancelText="ยกเลิก"
                        onConfirm={confirmDeleteRoom}
                        onCancel={() => setDeleteModal({ open: false, roomId: null })}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {clearModal && (
                    <CarmenModal
                        title="ล้างประวัติห้องนี้?"
                        description="ข้อความในห้องนี้จะถูกลบทั้งหมด"
                        confirmText="ลบเลย" cancelText="ยกเลิก"
                        onConfirm={confirmClearHistory}
                        onCancel={() => setClearModal(false)}
                    />
                )}
            </AnimatePresence>

            <CarmenHistoryScreen
                rooms={rooms}
                currentRoomId={currentRoomId}
                isOpen={showRoomDropdown}
                onClose={() => setShowRoomDropdown(false)}
                onNewChat={createNewChat}
                onSelect={switchRoom}
                onDelete={(rid) => setDeleteModal({ open: true, roomId: rid })}
                isProcessing={isProcessing()}
                theme={theme}
            />

            <ChatHeader
                isExpanded={isExpanded}
                onDragStart={onDragStart}
                toggleExpand={toggleExpand}
                toggleOpen={toggleOpen}
                isProcessing={isProcessing}
                showRoomDropdown={showRoomDropdown}
                setShowRoomDropdown={setShowRoomDropdown}
                config={config}
                currentRoomId={currentRoomId}
                setClearModal={setClearModal}
            />

            <MessageList
                bodyRef={bodyRef}
                messages={messages}
                showSuggestions={showSuggestions}
                suggestions={suggestions}
                sendMessage={sendMessage}
                sendFeedback={sendFeedback}
                retryMessage={retryMessage}
                theme={theme}
                isResizing={isResizing}
            />

            <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

            <AnimatePresence>
                {messages.filter(m => m.isQueued && m.role === "user").length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-[90px] left-0 right-0 px-4 z-40 flex flex-col items-end gap-2 pointer-events-none"
                    >
                        {messages.filter(m => m.isQueued && m.role === "user").map(msg => (
                            <motion.div
                                key={`sticky-${msg.id}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                                animate={{ opacity: 0.9, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                                className="bg-slate-800/80 backdrop-blur-md text-white text-[13px] px-3 py-2 rounded-2xl rounded-br-sm shadow-lg max-w-[70%] truncate pointer-events-auto border border-white/10 flex items-center gap-2"
                            >
                                <div className="w-3 h-3 rounded-full border-[1.5px] border-white/30 border-t-white animate-spin flex-shrink-0" />
                                <span className="truncate" dangerouslySetInnerHTML={{ __html: msg.html }} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {userHasScrolledUp && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%" }}
                        exit={{ opacity: 0, scale: 0.5, x: "-50%", transition: { duration: 0.15 } }}
                        onClick={() => scrollToBottom(true, false)}
                        className="absolute bottom-[110px] left-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg z-50 transition-transform hover:scale-110 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${theme}, ${theme}dd)` }}
                        title="เลื่อนลงล่างสุด"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M11 4v12.59l-3.3-3.29L6.29 14.7l5 5 .09.08.09.06.06.03.11.04h.12.12l.11-.04.06-.03.09-.06.09-.08 5-5-1.42-1.41-3.3 3.29V4h-2z" />
                        </svg>
                    </motion.button>
                )}
            </AnimatePresence>

            <ChatInput
                isResizing={isResizing}
                config={config}
                fileInputRef={fileInputRef}
                handleFileChange={handleFileChange}
                inputRef={inputRef}
                inputValue={inputValue}
                handleInput={handleInput}
                handleKeyDown={handleKeyDown}
                setIsInputFocused={setIsInputFocused}
                sendMessage={sendMessage}
                theme={theme}
                imageBase64={imageBase64}
                setImageBase64={setImageBase64}
            />

            <AnimatePresence>
                {alertModal.open && (
                    <CarmenModal
                        title={alertModal.title}
                        description={alertModal.description}
                        variant={alertModal.variant}
                        confirmText="ตกลง"
                        cancelText="ปิด"
                        onConfirm={() => setAlertModal({ ...alertModal, open: false })}
                        onCancel={() => setAlertModal({ ...alertModal, open: false })}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
