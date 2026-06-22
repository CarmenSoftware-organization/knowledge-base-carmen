"use client";
// frontend/user/hooks/useCarmenChat.ts

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { formatCarmenMessage } from "@/lib/carmen-formatter";
import { CarmenApi, CarmenRoom, createCarmenApi } from "./use-carmen-api";
import { locales, LocaleKey } from "@/configs/locales";
import { executeStream, stopGeneration } from "./use-chat-stream";

export interface DisplayMessage {
  id: string;
  role: "user" | "bot";
  html: string;
  msgId?: string;
  sources?: (string | { source: string; title?: string; score?: number })[] | null;
  isError?: boolean;
  errorText?: string;
  /** Short server/network message shown under the generic connection error title */
  errorDetail?: string;
  statusText?: string;
  timestamp?: string;
  suggestions?: string[];
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
  locale?: LocaleKey;
  proactiveMessages?: { pathPattern: RegExp | string; delayMs: number; message: string; subMessage?: string; timeoutMs?: number }[];
  onTypingFrame?: () => void;
  referrer_page?: string;
}


export interface UseCarmenChatReturn {
  isOpen: boolean;
  isExpanded: boolean;
  messages: DisplayMessage[];
  rooms: CarmenRoom[];
  currentRoomId: string | null;
  isTyping: boolean;
  isRoomActionLoading: boolean;
  isProcessing: () => boolean;
  typingStatus: string;
  inputValue: string;
  imageBase64: string | null;
  showSuggestions: boolean;
  showRoomDropdown: boolean;
  deleteModal: { open: boolean; roomId: string | null };
  clearModal: boolean;
  alertModal: {
    open: boolean;
    title: string;
    description: string;
    variant: "danger" | "info" | "success";
  };
  tooltipData: { visible: boolean; message: string; subMessage?: string };
  position: { bottom: string | number; right: string | number } | null;
  suggestions: string[];
  config: CarmenChatConfig;
  api: CarmenApi;
  t: any;
  setInputValue: (val: string) => void;
  setImageBase64: (val: string | null) => void;
  setShowRoomDropdown: (val: boolean) => void;
  setDeleteModal: (val: any) => void;
  setClearModal: (val: boolean) => void;
  setAlertModal: (val: any) => void;
  toggleOpen: () => void;
  toggleExpand: () => void;
  createNewChat: () => void;
  switchRoom: (roomId: string) => void;
  sendMessage: (text?: string, sourceMsgId?: string) => void;
  retryMessage: (errorText: string) => void;
  sendFeedback: (msgId: string, score: number) => void;
  confirmDeleteRoom: () => void;
  confirmClearHistory: () => void;
  dismissTooltip: () => void;
  updatePosition: (pos: { bottom: string | number; right: string | number }) => void;
  stopGeneration: () => void;
}

// ---------------------------------------------------------------------------
// UI state helpers — consolidate all per-BU localStorage keys into one entry
// so we minimise the fingerprint surface exposed to browser storage.
// ---------------------------------------------------------------------------
type UiState = {
  open?: boolean;
  expanded?: boolean;
  tooltipSeen?: boolean;
  pos?: { bottom: string | number; right: string | number };
  currentRoom?: string | null;
};

function readUiState(bu: string): UiState {
  try {
    const raw = localStorage.getItem(`carmen_ui_${bu}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeUiState(bu: string, patch: Partial<UiState>): void {
  try {
    const current = readUiState(bu);
    localStorage.setItem(`carmen_ui_${bu}`, JSON.stringify({ ...current, ...patch }));
  } catch { /* quota or private-mode — fail silently */ }
}

export function useCarmenChat(config: CarmenChatConfig): UseCarmenChatReturn {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [rooms, setRooms] = useState<CarmenRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isRoomActionLoading, setIsRoomActionLoading] = useState(false);
  const [typingStatus, setTypingStatus] = useState(t("chat.status_thinking"));
  const [inputValue, setInputValue] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const locale = config.locale || "th";
  
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    roomId: string | null;
  }>({ open: false, roomId: null });
  const [clearModal, setClearModal] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    variant: "danger" | "info" | "success";
  }>({
    open: false,
    title: "",
    description: "",
    variant: "info",
  });
  const [tooltipData, setTooltipData] = useState<{ visible: boolean; message: string; subMessage?: string }>({
    visible: false,
    message: t("header.status_online"),
    subMessage: t("welcome.desc"),
  });
  const [position, setPosition] = useState<{
    bottom: string | number;
    right: string | number;
  } | null>(null);

  const api = useRef(createCarmenApi(config.apiBase)).current;

  const abortController = useRef<AbortController | null>(null);
  const isUserStopRef = useRef(false);
  const isProcessingRef = useRef(false);
  const statusTimers = useRef<NodeJS.Timeout[]>([]);
  const suggestions = config.suggestedQuestions ?? locales[locale].welcome.default_suggestions;

  // Locale-aware translator that respects config.locale
  const translator = (path: string) => {
    const parts = path.split(".");
    let current: any = locales[locale];
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Fallback to next-intl if key missing in hardcoded locales
        try { return t(path); } catch (e) { return path; }
      }
    }
    return typeof current === "string" ? current : path;
  };

  useEffect(() => {
    const ui = readUiState(config.bu);
    if (ui.open) setIsOpen(true);
    if (ui.expanded) setIsExpanded(true);

    const checkProactiveMessages = () => {
      if (isOpen || !config.proactiveMessages) return;
      const currentPath = window.location.pathname;

      for (const rule of config.proactiveMessages) {
        let isMatch = false;
        if (rule.pathPattern instanceof RegExp) {
          isMatch = rule.pathPattern.test(currentPath);
        } else {
          isMatch = currentPath.includes(rule.pathPattern);
        }

        if (isMatch) {
          const ruleId = `carmen_proactive_${config.bu}_${rule.message}`;
          const hasSeenRule = sessionStorage.getItem(ruleId); // Use sessionStorage so it resets on new tab/session
          
          if (!hasSeenRule) {
            setTimeout(() => {
              // Check again if it's open, user might have opened it during the delay
              setIsOpen(currentIsOpen => {
                 if(!currentIsOpen) {
                    setTooltipData({
                      visible: true,
                      message: rule.message,
                      subMessage: rule.subMessage || "มีข้อสงสัยถาม Carmen ได้เลย!",
                    });
                    if (rule.timeoutMs) {
                      setTimeout(() => setTooltipData(prev => ({...prev, visible: false})), rule.timeoutMs);
                    }
                 }
                 return currentIsOpen;
              })
            }, rule.delayMs);
            sessionStorage.setItem(ruleId, "true");
            return; // Stop after first match
          }
        }
      }
      
      // Default Welcome Tooltip (only if hasn't seen any tooltip)
      if (!ui.tooltipSeen) {
        setTimeout(() => setTooltipData(prev => ({...prev, visible: true})), 2000);
        setTimeout(() => setTooltipData(prev => ({...prev, visible: false})), 10000);
        writeUiState(config.bu, { tooltipSeen: true });
      }
    };
    
    checkProactiveMessages();

    if (ui.pos) {
      setPosition(ui.pos);
    }

    api.housekeep();
    loadRoomList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadRoomList() {
    const rawRooms = await api.getRooms();

    // Enrich with last message snippets
    const enriched = await Promise.all(
      rawRooms.map(async (room) => {
        try {
          const history = await api.getRoomHistory(room.room_id);
          const lastMsg =
            history.messages && history.messages.length > 0
              ? history.messages[history.messages.length - 1]
              : null;

          let snippet = "ไม่มีข้อความ";
          if (lastMsg) {
            snippet = lastMsg.message;
            // Clean up markdown/tags if any for the snippet
            snippet = snippet.replace(/[#*`]/g, "").trim();
            if (snippet.length > 200)
              snippet = snippet.substring(0, 200) + "...";
          }

          return { ...room, lastMessage: snippet };
        } catch (e) {
          return { ...room, lastMessage: "ไม่มีข้อความ" };
        }
      })
    );

    setRooms(enriched);
  }

  async function loadHistory(roomId: string) {
    const history = await api.getRoomHistory(roomId);
    
    // Clean up any empty bot messages that might have been stuck from previous bugs
    const validMessages = history.messages?.filter(m => !(m.sender === "bot" && !m.message.trim())) || [];

    if (validMessages.length > 0) {
      const displayed: DisplayMessage[] = validMessages.map((m, i) => ({
        id: `${roomId}-${i}`,
        role: m.sender,
        html: formatCarmenMessage(m.message, api.baseUrl),
        msgId: m.id,
        sources: m.sources,
        timestamp: m.timestamp,
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
    writeUiState(config.bu, { open: next });
    if (!next) {
      setIsExpanded(false);
      setShowRoomDropdown(false);
      writeUiState(config.bu, { open: next, expanded: false });
    }
    if (next) setTooltipData(prev => ({...prev, visible: false})); // Auto dismiss tooltip when opened
  }

  function dismissTooltip() {
    setTooltipData(prev => ({...prev, visible: false}));
    writeUiState(config.bu, { tooltipSeen: true });
  }

  function toggleExpand() {
    const next = !isExpanded;
    setIsExpanded(next);
    writeUiState(config.bu, { expanded: next });
    if (!next) setShowRoomDropdown(false);
  }

  async function createNewChat() {
    if (isProcessingRef.current) {
      alert(t("chat.new_chat_block"));
      return;
    }
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    isProcessingRef.current = false;
    statusTimers.current.forEach(clearTimeout);
    statusTimers.current = [];
    setIsTyping(false);

    if (currentRoomId) {
      await api.clearHistory(currentRoomId);
    }
    setCurrentRoomId(null);
    writeUiState(config.bu, { currentRoom: null });
    setMessages([]);
    setShowSuggestions(true);
    setShowRoomDropdown(false);
    await loadRoomList();
  }

  async function switchRoom(roomId: string) {
    if (isProcessingRef.current) {
      alert(t("chat.switch_room_block"));
      return;
    }
    if (currentRoomId === roomId) return;

    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    isProcessingRef.current = false;
    statusTimers.current.forEach(clearTimeout);
    statusTimers.current = [];
    setIsTyping(false);

    setCurrentRoomId(roomId);
    writeUiState(config.bu, { currentRoom: roomId });
    await loadHistory(roomId);
    await loadRoomList();
    setShowRoomDropdown(false);
  }

  async function confirmDeleteRoom() {
    if (isProcessingRef.current) {
      alert(t("chat.delete_room_block"));
      setDeleteModal({ open: false, roomId: null });
      return;
    }
    if (!deleteModal.roomId) return;
    const rid = deleteModal.roomId;
    setDeleteModal({ open: false, roomId: null });
    setIsRoomActionLoading(true);
    try {
      await api.deleteRoom(rid);
      if (currentRoomId === rid) {
        await createNewChat();
      } else {
        await loadRoomList();
      }
    } finally {
      setIsRoomActionLoading(false);
    }
  }

  async function confirmClearHistory() {
    setClearModal(false);
    if (!currentRoomId) return;
    setIsRoomActionLoading(true);
    try {
      await api.clearHistory(currentRoomId);
      await loadHistory(currentRoomId);
    } finally {
      setIsRoomActionLoading(false);
    }
  }

  async function retryMessage(errorText: string) {
    if (isProcessingRef.current) return;
    setMessages((prev) => prev.filter((m) => !(m.isError && m.errorText === errorText)));
    if (currentRoomId) {
      const userMsgId = `user-${Math.random().toString(36).substring(2, 11)}`;
      const botMsgId = `bot-${Math.random().toString(36).substring(2, 11)}`;
      
      const userTimestamp = new Date().toISOString();
      const botTimestamp = new Date(Date.now() + 1).toISOString();

      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          role: "user",
          html: formatCarmenMessage(errorText, api.baseUrl),
          timestamp: userTimestamp,
        },
        {
          id: botMsgId,
          role: "bot",
          html: "",
          statusText: t("chat.status_waiting") + "...",
        },
      ]);

      await api.saveMessage(currentRoomId, {
        id: userMsgId,
        sender: "user",
        message: errorText,
        image: false,
        timestamp: userTimestamp,
      });

      await api.saveMessage(currentRoomId, {
        id: botMsgId,
        sender: "bot",
        message: "",
        timestamp: botTimestamp,
      });

      executeStream(errorText, currentRoomId, botMsgId, userMsgId, getStreamDeps());
    }
  }

  function getStreamDeps() {
    return {
      api, config, locale, t: translator,
      isProcessingRef, abortController, isUserStopRef, statusTimers,
      setMessages, setIsTyping, setTypingStatus,
      loadRoomList,
    };
  }

  async function sendMessage(text?: string, _sourceMsgId?: string) {
    if (isProcessingRef.current) return;

    // Clear ALL suggestions from previous messages
    setMessages((prev) => prev.map((m) => m.suggestions && m.suggestions.length > 0 ? { ...m, suggestions: [] } : m));
    const msgText = text ?? inputValue.trim();
    if (!msgText && !imageBase64) return;

    const img = imageBase64;
    setInputValue("");
    setImageBase64(null);

    let roomId = currentRoomId;
    if (!roomId) {
      const title =
        msgText.substring(0, 100).trim() + (msgText.length > 100 ? "..." : "");
      const room = await api.createRoom(config.bu, config.username, title);
      roomId = room.room_id;
      setCurrentRoomId(roomId);
      writeUiState(config.bu, { currentRoom: roomId });
      await loadRoomList();
    }

    const userHtml = img
      ? `<img src="${img}" style="max-width:100%;border-radius:8px;margin-bottom:5px;" /><br>${msgText}`
      : formatCarmenMessage(msgText, api.baseUrl);

    const userMsgId = `user-${Math.random().toString(36).substring(2, 11)}`;
    const userMsg: DisplayMessage = {
      id: userMsgId,
      role: "user",
      html: userHtml,
      timestamp: new Date().toISOString(),
    };

    const botMsgId = `bot-${Math.random().toString(36).substring(2, 11)}`;
    const botPlaceholder: DisplayMessage = {
      id: botMsgId,
      role: "bot",
      html: "",
      statusText: t("chat.status_waiting") + "...",
    };

    setMessages((prev) => {
      const cleared = prev.map((m) => m.suggestions && m.suggestions.length > 0 ? { ...m, suggestions: [] } : m);
      return [...cleared, userMsg, botPlaceholder];
    });
    setShowSuggestions(false);

    await api.saveMessage(roomId, {
      id: userMsg.id,
      sender: "user",
      message: msgText,
      image: !!img,
      timestamp: userMsg.timestamp || new Date().toISOString(),
    });

    await api.saveMessage(roomId, {
      id: botMsgId,
      sender: "bot",
      message: "",
      timestamp: new Date(Date.now() + 1).toISOString(),
    });

    executeStream(msgText, roomId, botMsgId, userMsgId, getStreamDeps());
  }

  async function sendFeedback(msgId: string, score: number) {
    await api.sendFeedback(msgId, score, config.bu, config.username);
  }

  function updatePosition(newPos: { bottom: string | number; right: string | number }) {
    setPosition(newPos);
    writeUiState(config.bu, { pos: newPos });
  }

  function handleStopGeneration() {
    stopGeneration(isProcessingRef, abortController, isUserStopRef);
  }

  // Use refs to keep stable function identities
  const sendMessageRef = useRef(sendMessage);
  const retryMessageRef = useRef(retryMessage);
  const sendFeedbackRef = useRef(sendFeedback);
  const createNewChatRef = useRef(createNewChat);
  const switchRoomRef = useRef(switchRoom);

  useEffect(() => {
    sendMessageRef.current = sendMessage;
    retryMessageRef.current = retryMessage;
    sendFeedbackRef.current = sendFeedback;
    createNewChatRef.current = createNewChat;
    switchRoomRef.current = switchRoom;
  });

  const stableSendMessage = useState(() => (text?: string, sourceMsgId?: string) => sendMessageRef.current(text, sourceMsgId))[0];
  const stableRetryMessage = useState(() => (errorText: string) => retryMessageRef.current(errorText))[0];
  const stableSendFeedback = useState(() => (msgId: string, score: number) => sendFeedbackRef.current(msgId, score))[0];
  
  const stopGenerationRef = useRef(handleStopGeneration);
  useEffect(() => { stopGenerationRef.current = handleStopGeneration; });
  const stableStopGeneration = useState(() => () => stopGenerationRef.current())[0];

  const stableCreateNewChat = useState(() => () => createNewChatRef.current())[0];
  const stableSwitchRoom = useState(() => (roomId: string) => switchRoomRef.current(roomId))[0];

  return {
    isOpen,
    isExpanded,
    messages,
    rooms,
    currentRoomId,
    isTyping,
    isRoomActionLoading,
    isProcessing: () => isProcessingRef.current,
    typingStatus,
    inputValue,
    imageBase64,
    showSuggestions,
    showRoomDropdown,
    deleteModal,
    clearModal,
    alertModal,
    tooltipData,
    position,
    suggestions,
    config,
    api,
    t: translator,
    setInputValue,
    setImageBase64,
    setShowRoomDropdown,
    setDeleteModal,
    setClearModal,
    setAlertModal,
    toggleOpen,
    toggleExpand,
    createNewChat: stableCreateNewChat,
    switchRoom: stableSwitchRoom,
    sendMessage: stableSendMessage,
    retryMessage: stableRetryMessage,
    sendFeedback: stableSendFeedback,
    confirmDeleteRoom,
    confirmClearHistory,
    dismissTooltip,
    updatePosition,
    stopGeneration: stableStopGeneration,
  };
}