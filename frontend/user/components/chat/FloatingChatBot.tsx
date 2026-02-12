"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";

type ChatRole = "user" | "bot";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

export default function FloatingChatBot() {
  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      content: "สวัสดีค่ะ 👋 ถามฉันเกี่ยวกับ Carmen Cloud ได้เลยนะ",
    },
  ]);

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  /* Tooltip Auto Hide */
  useEffect(() => {
    if (!showTooltip) return;
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [showTooltip]);

  /* Auto Scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input,
    };

    const botMessage: ChatMessage = {
      role: "bot",
      content: "กำลังพัฒนา AI จริงเร็ว ๆ นี้ 🚀",
    };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  }

  return (
    <>
      {/* Floating Button */}
      <motion.button
        onClick={() => {
          setOpen(!open);
          setShowTooltip(false);
        }}
        animate={
          !open
            ? { y: [0, -8, 0] } // เด้งดึงพอ
            : { y: 0 }
        }
        transition={
          !open
            ? {
                duration: 1.6,
                repeat: Infinity,
                ease: [0.22, 1, 0.36, 1],
              }
            : { duration: 0.2 }
        }
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="
          fixed bottom-6 right-6 z-50
          bg-gradient-to-br from-primary to-primary/80
          text-primary-foreground
          p-4 rounded-full
          shadow-xl
          border border-primary/30
        "
      >
        {open ? <X size={20} /> : <MessageCircle size={20} />}
      </motion.button>

      {/* Tooltip */}
      <AnimatePresence>
        {!open && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="
              fixed bottom-20 right-6
              bg-primary text-primary-foreground
              px-4 py-2
              rounded-full
              text-sm
              shadow-lg
            "
          >
            💬 ถามฉันได้นะ
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 right-6 w-80 h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground px-4 py-3 font-medium">
              Carmen AI Assistant
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-xl text-sm max-w-[75%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text"
                placeholder="พิมพ์คำถาม..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSend()
                }
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleSend}
                className="bg-primary text-primary-foreground p-2 rounded-lg hover:opacity-90 transition"
              >
                <Send size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
