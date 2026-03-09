"use client";
import { ChangeEvent, KeyboardEvent, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useCarmenChat } from "@/hooks/use-carmen-chat";
import CarmenMessage from "./carmen-message";
import CarmenModal from "./carmen-modal";
import CarmenRoomDropdown from "./carmen-room-dropdown";
import CarmenTypingIndicator from "./carmen-typing-indicator";
import CarmenWelcome from "./carmen-welcome";

type ChatState = ReturnType<typeof useCarmenChat>;
interface Props { state: ChatState }

// Desktop popup จาก bottom-right
const desktopVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20, filter: "blur(4px)", transformOrigin: "bottom right" },
  visible: {
    opacity: 1, scale: 1, y: 0, filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 360, damping: 30, mass: 0.85 },
  },
  exit: {
    opacity: 0, scale: 0.88, y: 16, filter: "blur(3px)",
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] as const },
  },
};

// Mobile slide up
const mobileVariants = {
  hidden: { y: "100%", opacity: 0 },
  visible: {
    y: 0, opacity: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 32 },
  },
  exit: {
    y: "100%", opacity: 0,
    transition: { duration: 0.25, ease: [0.4, 0, 1, 1] as const },
  },
};

export default function CarmenChatWindow({ state }: Props) {
  const { isExpanded, config } = state;
  const theme = config.theme ?? "#34558b";

  // Desktop size — layout prop ทำ expand/collapse smooth
  const desktopStyle = isExpanded
    ? {
      position: "fixed" as const,
      top: 20, bottom: 20, left: 20, right: 20,
      width: "auto", height: "auto",
      borderRadius: 24,
    }
    : {
      position: "absolute" as const,
      bottom: 84, right: 0,
      width: "clamp(320px, 90vw, 370px)",
      height: "clamp(480px, 75vh, 600px)",
      borderRadius: 28,
    };

  return (
    <>
      {/* Desktop (sm ขึ้นไป) */}
      <motion.div
        className="hidden sm:flex flex-col overflow-hidden border border-slate-200/80 shadow-2xl dark:border-slate-700/50
    shadow-2xl dark:shadow-[0_24px_64px_rgba(0,0,0,0.5)]
    bg-white dark:bg-slate-900"
        style={{
          ...desktopStyle,
          background: "#ffffff",
          zIndex: 2000001,
        }}
        variants={desktopVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        layout
        transition={{ layout: { type: "spring", stiffness: 280, damping: 28 } }}
      >
        <ChatContent state={state} theme={theme} />
      </motion.div>

      {/* Mobile (< sm) */}
      <motion.div
        className="flex sm:hidden flex-col overflow-hidden fixed inset-0 dark:bg-slate-900"
        style={{ background: "#ffffff", zIndex: 2000001 }}
        variants={mobileVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <ChatContent state={state} theme={theme} />
      </motion.div>
    </>
  );
}

// ---- Shared content ----
interface ContentProps {
  state: ReturnType<typeof useCarmenChat>;
  theme: string;
}

function ChatContent({ state, theme }: ContentProps) {
  const {
    isExpanded, messages, rooms, currentRoomId,
    isTyping, typingStatus, inputValue, imageBase64,
    showSuggestions, showRoomDropdown, deleteModal, clearModal,
    suggestions, config,
    setInputValue, setImageBase64, setShowRoomDropdown,
    setDeleteModal, setClearModal, toggleOpen, toggleExpand,
    createNewChat, switchRoom, sendMessage, sendFeedback,
    confirmDeleteRoom, confirmClearHistory,
  } = state;

  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

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
      {/* Modals */}
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

      {/* ===== HEADER ===== */}
      <div
        className="flex items-center justify-between px-5 py-4 text-white flex-shrink-0 select-none"
        style={{ background: `linear-gradient(135deg, ${theme} 0%, ${theme}cc 100%)` }}
      >
        {/* Left: avatar + name */}
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/25 flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
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
            <h3 className="text-[16px] font-bold tracking-tight leading-tight"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.2)" }}>
              {config.title || "Carmen AI Specialist"}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium opacity-80 uppercase tracking-wide">
              <motion.span
                className="w-1.5 h-1.5 bg-green-400 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              />
              คลังความรู้ AI พร้อมบริการ
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1.5">
          {/* History dropdown — เฉพาะ expanded */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                className="relative"
                initial={{ opacity: 0, scale: 0.7, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.7, width: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <button
                  onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
                  title="ประวัติการสนทนา"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="17" height="17">
                    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
                    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                  </svg>
                </button>
                <AnimatePresence>
                  {showRoomDropdown && (
                    <CarmenRoomDropdown
                      rooms={rooms}
                      currentRoomId={currentRoomId}
                      isOpen={showRoomDropdown}
                      onClose={() => setShowRoomDropdown(false)}
                      onNewChat={createNewChat}
                      onSelect={switchRoom}
                      onDelete={(id) => setDeleteModal({ open: true, roomId: id })}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expand — hidden on mobile */}
          <button
            onClick={toggleExpand}
            className="w-8 h-8 rounded-xl items-center justify-center bg-white/15 hover:bg-white/25 transition-colors hidden sm:flex"
            title={isExpanded ? "ย่อหน้าจอ" : "ขยายหน้าจอ"}
          >
            {isExpanded ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="10" y1="14" x2="3" y2="21" />
                <line x1="21" y1="3" x2="14" y2="10" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="16" height="16">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>

          {/* Clear */}
          {config.showClear && currentRoomId && (
            <button
              onClick={() => setClearModal(true)}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
              title="ล้างแชท"
            >
              <svg viewBox="0 0 24 24" fill="white" width="16" height="16">
                <path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            onClick={toggleOpen}
            className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/15 hover:bg-white/25 transition-colors"
            title="ปิด"
          >
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div
        ref={bodyRef}
        className="flex-1 overflow-y-auto flex flex-col gap-4 p-4 sm:p-5
    bg-gradient-to-b from-slate-50 to-slate-100
    dark:from-slate-900 dark:to-slate-800"
        style={{ overscrollBehavior: "contain" }}
      >
        {messages.length === 0 && showSuggestions ? (
          <CarmenWelcome
            suggestions={suggestions}
            onSelect={(text) => sendMessage(text)}
            theme={theme}
          />
        ) : (
          <>
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 420, damping: 30 }}
                >
                  <CarmenMessage msg={msg} onFeedback={sendFeedback} theme={theme} />
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                >
                  <CarmenTypingIndicator status={typingStatus} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* ===== IMAGE PREVIEW ===== */}
      <AnimatePresence>
        {imageBase64 && (
          <motion.div
            className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-3 flex-shrink-0"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-12 h-12 flex-shrink-0">
              <img src={imageBase64} alt="preview"
                className="w-full h-full object-cover rounded-xl border-2 border-white shadow-md" />
              <button
                onClick={() => setImageBase64(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] hover:bg-red-200 shadow"
              >×</button>
            </div>
            <span className="text-xs text-slate-500">รูปที่แนบ</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== FOOTER ===== */}
      <div
        className="flex items-center gap-2 px-4 pb-4 pt-3 flex-shrink-0
    border-t border-slate-100 dark:border-slate-700
    bg-white dark:bg-slate-900"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom, 16px))" }}
      >
        {config.showAttach && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*"
              className="hidden" onChange={handleFileChange} />
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors flex-shrink-0"
              style={{ ["--hover-color" as string]: theme }}
              whileHover={{ scale: 1.08, color: theme }}
              whileTap={{ scale: 0.93 }}
              title="แนบรูป"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
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
          className="flex-1 px-4 py-2.5 rounded-2xl border outline-none resize-none transition-all
    bg-slate-50 dark:bg-slate-800
    border-slate-200 dark:border-slate-600
    text-slate-800 dark:text-slate-100
    placeholder:text-slate-400 dark:placeholder:text-slate-500"
          style={{
            minHeight: "44px",
            maxHeight: "120px",
            fontFamily: "'Sarabun', sans-serif",
            fontSize: "15px",
            lineHeight: "1.55",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = theme;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme}22`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "";
            e.currentTarget.style.boxShadow = "";
          }}
        />

        <motion.button
          onClick={() => {
            sendMessage();
            if (inputRef.current) inputRef.current.style.height = "auto";
          }}
          className="w-11 h-11 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: `linear-gradient(135deg, ${theme}, ${theme}cc)` }}
          whileHover={{ scale: 1.08, y: -1 }}
          whileTap={{ scale: 0.91 }}
          title="ส่งข้อความ"
        >
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </motion.button>
      </div>
    </>
  );
}