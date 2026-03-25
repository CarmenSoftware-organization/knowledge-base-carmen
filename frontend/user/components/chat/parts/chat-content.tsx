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
import DOMPurify from "dompurify";

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
        suggestions, config, t,
        setInputValue, setImageBase64, setShowRoomDropdown,
        setDeleteModal, setClearModal, toggleOpen, toggleExpand,
        createNewChat, switchRoom, sendMessage, retryMessage, sendFeedback,
        confirmDeleteRoom, confirmClearHistory,
        alertModal, setAlertModal, stopGeneration,
    } = state;

    const bodyRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const sentHistoryRef = useRef<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const draftValueRef = useRef('');

    const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
    const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
    const lastProgrammaticScrollTime = useRef(0);

    // Esc key closes the chat (unless a modal/panel is open)
    useEffect(() => {
        const handleGlobalEsc = (e: globalThis.KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (deleteModal.open || clearModal || alertModal.open || showRoomDropdown) return;
            toggleOpen();
        };
        window.addEventListener('keydown', handleGlobalEsc);
        return () => window.removeEventListener('keydown', handleGlobalEsc);
    }, [deleteModal.open, clearModal, alertModal.open, showRoomDropdown, toggleOpen]);

    const safeHtmlToText = (html: string) => {
        // For the sticky queue UI we only need a safe, plain-text snippet.
        const cleaned = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
        const tmp = document.createElement("div");
        tmp.innerHTML = cleaned;
        return (tmp.textContent || tmp.innerText || "").trim();
    };

    // Delegation for images and links
    useEffect(() => {
        const el = bodyRef.current;
        if (!el) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // 1. Handle image lightbox
            const img = target.closest('[data-lightbox]') as HTMLElement | null;
            if (img) {
                e.preventDefault();
                e.stopPropagation();
                const src = img.getAttribute('data-lightbox') || img.getAttribute('src');
                if (src) setLightboxSrc(src);
                return;
            }

            // 2. Handle link tab behavior
            const anchor = target.closest('a') as HTMLAnchorElement | null;
            if (anchor && anchor.href) {
                const href = anchor.getAttribute('href') || "";
                // If it's intended to open in a new tab (markdown formatter adds target="_blank") 
                // or if it looks external, force it with window.open to bypass any internal navigation logic.
                if (anchor.target === "_blank" || href.startsWith("http") || href.startsWith("//")) {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(anchor.href, '_blank', 'noopener,noreferrer');
                }
            }
        };
        el.addEventListener('click', handleClick);
        return () => el.removeEventListener('click', handleClick);
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

        const handleSmoothScroll = () => {
            if (!userHasScrolledUp && el) {
                scrollToBottom(false, false); // smooth
            }
        };

        el.addEventListener("scroll", handleScroll, { passive: true });
        el.addEventListener("wheel", userInteractionHandler, { passive: true });
        el.addEventListener("touchstart", userInteractionHandler, { passive: true });
        el.addEventListener("touchmove", userInteractionHandler, { passive: true });
        window.addEventListener("carmen-typing-frame", handleTypingFrame);
        window.addEventListener("carmen-scroll-smooth", handleSmoothScroll);

        return () => {
            el.removeEventListener("scroll", handleScroll);
            el.removeEventListener("wheel", userInteractionHandler);
            el.removeEventListener("touchstart", userInteractionHandler);
            el.removeEventListener("touchmove", userInteractionHandler);
            window.removeEventListener("carmen-typing-frame", handleTypingFrame);
            window.removeEventListener("carmen-scroll-smooth", handleSmoothScroll);
        };
    }, [userHasScrolledUp]);

    function handleInput(e: ChangeEvent<HTMLTextAreaElement>) {
        setInputValue(e.target.value);
        e.target.style.height = "auto";
        e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
    }

    function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
        // ↑ when input is empty — navigate sent message history
        if (e.key === "ArrowUp" && inputValue === "" && sentHistoryRef.current.length > 0) {
            e.preventDefault();
            const newIndex = Math.min(historyIndex + 1, sentHistoryRef.current.length - 1);
            if (historyIndex === -1) draftValueRef.current = "";
            setHistoryIndex(newIndex);
            setInputValue(sentHistoryRef.current[newIndex]);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.style.height = "auto";
                    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
                }
            }, 0);
            return;
        }

        // ↓ when navigating history — go forward / restore draft
        if (e.key === "ArrowDown" && historyIndex >= 0) {
            e.preventDefault();
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            setInputValue(newIndex >= 0 ? sentHistoryRef.current[newIndex] : draftValueRef.current);
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.style.height = "auto";
                    inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
                }
            }, 0);
            return;
        }

        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (!isProcessing()) {
                if (inputValue.trim()) {
                    sentHistoryRef.current = [inputValue, ...sentHistoryRef.current.filter(h => h !== inputValue)].slice(0, 50);
                    setHistoryIndex(-1);
                }
                sendMessage();
                setUserHasScrolledUp(false);
                if (inputRef.current) inputRef.current.style.height = "auto";
            }
        }
    }

    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { setAlertModal({ open: true, title: t("chat.error_title"), description: t("chat.file_too_large"), variant: "info" }); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImageBase64(ev.target?.result as string);
        reader.readAsDataURL(file);
    }

    return (
        <>
            <AnimatePresence>
                {deleteModal.open && deleteModal.roomId && (
                    <CarmenModal
                        title={t("modal.delete_title")}
                        description={t("modal.delete_desc")}
                        confirmText={t("modal.delete_confirm")} cancelText={t("modal.cancel")}
                        onConfirm={confirmDeleteRoom}
                        onCancel={() => setDeleteModal({ open: false, roomId: null })}
                    />
                )}
            </AnimatePresence>
            <AnimatePresence>
                {clearModal && (
                    <CarmenModal
                        title={t("modal.clear_title")}
                        description={t("modal.clear_desc")}
                        confirmText={t("modal.clear_confirm")} cancelText={t("modal.cancel")}
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
                t={t}
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
                setAlertModal={setAlertModal}
                t={t}
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
                t={t}
            />

            <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />


            <AnimatePresence>
                {userHasScrolledUp && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.5, x: "-50%" }}
                        animate={{ opacity: 1, scale: 1, x: "-50%" }}
                        exit={{ opacity: 0, scale: 0.5, x: "-50%", transition: { duration: 0.15 } }}
                        onClick={() => scrollToBottom(true, false)}
                        className="absolute bottom-[110px] left-1/2 w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg z-50 transition-transform hover:scale-110 active:scale-95"
                        style={{ background: `linear-gradient(135deg, ${theme}, ${theme}dd)` }}
                        title={t("tools.scroll_down")}
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
                isProcessing={isProcessing()}
                stopGeneration={stopGeneration}
                forceScrollToBottom={() => { setUserHasScrolledUp(false); scrollToBottom(true, false); }}
                t={t}
            />

            <AnimatePresence>
                {alertModal.open && (
                    <CarmenModal
                        title={alertModal.title}
                        description={alertModal.description}
                        variant={alertModal.variant}
                        confirmText={t("modal.ok")}
                        cancelText={t("header.close")}
                        onConfirm={() => setAlertModal({ ...alertModal, open: false })}
                        onCancel={() => setAlertModal({ ...alertModal, open: false })}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
