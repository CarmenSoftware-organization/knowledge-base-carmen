"use client";
// frontend/user/hooks/useCarmenChat.ts

import { useState, useRef, useEffect } from "react";
import { formatCarmenMessage } from "@/lib/carmen-formatter";
import { CarmenApi, CarmenRoom, createCarmenApi } from "./use-carmen-api";

export interface DisplayMessage {
  id: string;
  role: "user" | "bot";
  html: string;
  msgId?: string;
  sources?: string[] | null;
}

export interface CarmenChatConfig {
  bu: string;
  username: string;
  apiBase: string;
  theme?: string;
  title?: string;
  promptExtend?: string | null;
  showClear?: boolean;
  showAttach?: boolean;
  suggestedQuestions?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
  "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
  "program carmen สามารถ upload file เข้า program RDPrep ได้หรือไม่",
  "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่",
  "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่",
];

export function useCarmenChat(config: CarmenChatConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [rooms, setRooms] = useState<CarmenRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState("กำลังคิด...");
  const [inputValue, setInputValue] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    roomId: string | null;
  }>({ open: false, roomId: null });
  const [clearModal, setClearModal] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);

  const apiRef = useRef<CarmenApi | null>(null);
  const suggestions = config.suggestedQuestions ?? DEFAULT_SUGGESTIONS;

  if (!apiRef.current) {
    apiRef.current = createCarmenApi(config.apiBase);
  }
  const api = apiRef.current;

  useEffect(() => {
    const wasOpen = localStorage.getItem(`carmen_open_${config.bu}`) === "true";
    const wasExpanded =
      localStorage.getItem(`carmen_expanded_${config.bu}`) === "true";
    if (wasOpen) setIsOpen(true);
    if (wasExpanded) setIsExpanded(true);

    const seen = localStorage.getItem(`carmen_tooltip_seen_${config.bu}`);
    if (!seen) setTimeout(() => setTooltipVisible(true), 2000);

    loadRoomList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRoomList() {
    const list = await api.getRooms();
    setRooms(list);
  }

  async function loadHistory(roomId: string) {
    const history = await api.getRoomHistory(roomId);
    if (history.messages && history.messages.length > 0) {
      const displayed: DisplayMessage[] = history.messages.map((m, i) => ({
        id: `${roomId}-${i}`,
        role: m.sender,
        html: formatCarmenMessage(m.message, api.baseUrl),
        msgId: m.id,
        sources: m.sources,
      }));
      setMessages(displayed);
      setShowSuggestions(false);
    } else {
      setMessages([]);
      setShowSuggestions(true);
    }
  }

  function toggleOpen() {
    const next = !isOpen;
    setIsOpen(next);
    localStorage.setItem(`carmen_open_${config.bu}`, String(next));
    if (!next) {
      setIsExpanded(false);
      setShowRoomDropdown(false);
      localStorage.setItem(`carmen_expanded_${config.bu}`, "false");
    }
  }

  function dismissTooltip() {
    setTooltipVisible(false);
    localStorage.setItem(`carmen_tooltip_seen_${config.bu}`, "true");
  }

  function toggleExpand() {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem(`carmen_expanded_${config.bu}`, String(next));
    if (!next) setShowRoomDropdown(false);
  }

  async function createNewChat() {
    if (currentRoomId) await api.clearHistory(currentRoomId);
    setCurrentRoomId(null);
    localStorage.removeItem(`carmen_current_room_${config.bu}`);
    setMessages([]);
    setShowSuggestions(true);
    setShowRoomDropdown(false);
    await loadRoomList();
  }

  async function switchRoom(roomId: string) {
    if (currentRoomId === roomId) return;
    setCurrentRoomId(roomId);
    localStorage.setItem(`carmen_current_room_${config.bu}`, roomId);
    await loadHistory(roomId);
    await loadRoomList();
    setShowRoomDropdown(false);
  }

  async function confirmDeleteRoom() {
    if (!deleteModal.roomId) return;
    const rid = deleteModal.roomId;
    setDeleteModal({ open: false, roomId: null });
    await api.deleteRoom(rid);
    if (currentRoomId === rid) {
      await createNewChat();
    } else {
      await loadRoomList();
    }
  }

  async function confirmClearHistory() {
    setClearModal(false);
    if (!currentRoomId) return;
    await api.clearHistory(currentRoomId);
    await loadHistory(currentRoomId);
  }

  async function sendMessage(text?: string) {
    const msgText = text ?? inputValue.trim();
    if (!msgText && !imageBase64) return;

    let roomId = currentRoomId;
    if (!roomId) {
      const title =
        msgText.substring(0, 30) + (msgText.length > 30 ? "..." : "");
      const room = await api.createRoom(config.bu, config.username, title);
      roomId = room.room_id;
      setCurrentRoomId(roomId);
      localStorage.setItem(`carmen_current_room_${config.bu}`, roomId);
      await loadRoomList();
    }

    const userHtml = imageBase64
      ? `<img src="${imageBase64}" style="max-width:100%;border-radius:8px;margin-bottom:5px;" /><br>${msgText}`
      : formatCarmenMessage(msgText, api.baseUrl);

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      html: userHtml,
    };
    setMessages((prev) => [...prev, userMsg]);
    setShowSuggestions(false);

    await api.saveMessage(roomId, {
      sender: "user",
      message: msgText,
      image: !!imageBase64,
      timestamp: new Date().toISOString(),
    });

    const img = imageBase64;
    setInputValue("");
    setImageBase64(null);

    setIsTyping(true);
    setTypingStatus("กำลังค้นหาเอกสารที่เกี่ยวข้อง");

    const statusMessages = [
      { delay: 2000, text: "กำลังค้นหาเอกสารที่เกี่ยวข้อง" },
      { delay: 8000, text: "กำลังวิเคราะห์ข้อมูล" },
      { delay: 20000, text: "กำลังเรียบเรียงคำตอบ" },
      { delay: 45000, text: "ใกล้เสร็จแล้ว กรุณารอสักครู่" },
    ];
    const timers = statusMessages.map(({ delay, text }) =>
      setTimeout(() => setTypingStatus(text), delay)
    );

    const botMsgId = `bot-${Date.now()}`;
    let accumulated = "";
    let finalMsgId: string | null = null;

    try {
      const history = await api.getRoomHistory(roomId);

      const response = await fetch(`${api.baseUrl}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msgText,
          image: img,
          bu: config.bu,
          username: config.username,
          room_id: roomId,
          prompt_extend: config.promptExtend,
          history: history.messages,
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");

      setMessages((prev) => [
        ...prev,
        { id: botMsgId, role: "bot", html: "" },
      ]);
      setIsTyping(false);
      timers.forEach(clearTimeout);

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "chunk") {
              accumulated += parsed.data;
              const html = formatCarmenMessage(accumulated, api.baseUrl);
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, html } : m))
              );
            } else if (parsed.type === "status") {
              setTypingStatus(parsed.data);
            } else if (parsed.type === "done") {
              finalMsgId = parsed.id;
              await loadRoomList();
            }
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (e) {
      console.error("Stream Error:", e);
      timers.forEach(clearTimeout);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: "bot",
          html: "⚠️ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
        },
      ]);
    }

    if (accumulated && roomId) {
      await api.saveMessage(roomId, {
        id: finalMsgId ?? undefined,
        sender: "bot",
        message: accumulated,
        timestamp: new Date().toISOString(),
      });
      if (finalMsgId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId ? { ...m, msgId: finalMsgId! } : m
          )
        );
      }
    }
  }

  async function sendFeedback(msgId: string, score: number) {
    await api.sendFeedback(msgId, score);
  }

  return {
    isOpen,
    isExpanded,
    messages,
    rooms,
    currentRoomId,
    isTyping,
    typingStatus,
    inputValue,
    imageBase64,
    showSuggestions,
    showRoomDropdown,
    deleteModal,
    clearModal,
    tooltipVisible,
    suggestions,
    config,
    api,
    setInputValue,
    setImageBase64,
    setShowRoomDropdown,
    setDeleteModal,
    setClearModal,
    toggleOpen,
    toggleExpand,
    createNewChat,
    switchRoom,
    sendMessage,
    sendFeedback,
    confirmDeleteRoom,
    confirmClearHistory,
    dismissTooltip,
  };
}