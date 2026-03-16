"use client";
// frontend/user/hooks/useCarmenChat.ts

import { useState, useRef, useEffect } from "react";
import { formatCarmenMessage } from "@/lib/carmen-formatter";
import { CarmenApi, CarmenRoom, createCarmenApi } from "./use-carmen-api";
import { locales, LocaleKey, LocaleStrings } from "@/configs/locales";

export interface DisplayMessage {
  id: string;
  role: "user" | "bot";
  html: string;
  msgId?: string;
  sources?: (string | { source: string; title?: string; score?: number })[] | null;
  isQueued?: boolean;
  isError?: boolean;
  errorText?: string;
  statusText?: string;
  timestamp?: string;
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
}

const DEFAULT_SUGGESTIONS = [
  "กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง",
  "บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่",
  "program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่",
  "ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Invoice ได้หรือไม่",
  "ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่",
];

export interface UseCarmenChatReturn {
  isOpen: boolean;
  isExpanded: boolean;
  messages: DisplayMessage[];
  rooms: CarmenRoom[];
  currentRoomId: string | null;
  isTyping: boolean;
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
  t: LocaleStrings;
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
  sendMessage: (text?: string) => void;
  retryMessage: (errorText: string) => void;
  sendFeedback: (msgId: string, score: number) => void;
  confirmDeleteRoom: () => void;
  confirmClearHistory: () => void;
  dismissTooltip: () => void;
  updatePosition: (pos: { bottom: string | number; right: string | number }) => void;
  stopGeneration: () => void;
}

export function useCarmenChat(config: CarmenChatConfig): UseCarmenChatReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [rooms, setRooms] = useState<CarmenRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  
  const locale = config.locale || "th";
  const t = locales[locale];
  
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
    message: t.header.status_online,
    subMessage: t.welcome.desc,
  });
  const [position, setPosition] = useState<{
    bottom: string | number;
    right: string | number;
  } | null>(null);

  const api = useRef(createCarmenApi(config.apiBase)).current;

  // Added references for queue processing and aborting streams
  const messageQueue = useRef<{ text: string; roomId: string; botMsgId: string; userMsgId: string }[]>([]);
  const abortController = useRef<AbortController | null>(null);
  const isUserStopRef = useRef(false);
  const isProcessingRef = useRef(false);
  const statusTimers = useRef<NodeJS.Timeout[]>([]);
  const suggestions = config.suggestedQuestions ?? t.welcome.default_suggestions;

  useEffect(() => {
    const wasOpen = localStorage.getItem(`carmen_open_${config.bu}`) === "true";
    const wasExpanded =
      localStorage.getItem(`carmen_expanded_${config.bu}`) === "true";
    if (wasOpen) setIsOpen(true);
    if (wasExpanded) setIsExpanded(true);

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
      const seenDefault = localStorage.getItem(`carmen_tooltip_seen_${config.bu}`);
      if (!seenDefault) {
        setTimeout(() => setTooltipData(prev => ({...prev, visible: true})), 2000);
        setTimeout(() => setTooltipData(prev => ({...prev, visible: false})), 10000);
        localStorage.setItem(`carmen_tooltip_seen_${config.bu}`, "true");
      }
    };
    
    checkProactiveMessages();

    const savedPos = localStorage.getItem(`carmen_chat_pos_${config.bu}`);
    if (savedPos) {
      try {
        setPosition(JSON.parse(savedPos));
      } catch (e) {
        console.warn("Restore Position Error:", e);
      }
    }

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
    localStorage.setItem(`carmen_open_${config.bu}`, String(next));
    if (!next) {
      setIsExpanded(false);
      setShowRoomDropdown(false);
      localStorage.setItem(`carmen_expanded_${config.bu}`, "false");
    }
    if (next) setTooltipData(prev => ({...prev, visible: false})); // Auto dismiss tooltip when opened
  }

  function dismissTooltip() {
    setTooltipData(prev => ({...prev, visible: false}));
    localStorage.setItem(`carmen_tooltip_seen_${config.bu}`, "true");
  }

  function toggleExpand() {
    const next = !isExpanded;
    setIsExpanded(next);
    localStorage.setItem(`carmen_expanded_${config.bu}`, String(next));
    if (!next) setShowRoomDropdown(false);
  }

  async function createNewChat() {
    if (isProcessingRef.current || messageQueue.current.length > 0) {
      alert(t.chat.new_chat_block);
      return;
    }
    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    messageQueue.current = [];
    isProcessingRef.current = false;
    statusTimers.current.forEach(clearTimeout);
    statusTimers.current = [];
    setIsTyping(false);

    if (currentRoomId) {
      await api.clearHistory(currentRoomId);
    }
    setCurrentRoomId(null);
    localStorage.removeItem(`carmen_current_room_${config.bu}`);
    setMessages([]);
    setShowSuggestions(true);
    setShowRoomDropdown(false);
    await loadRoomList();
  }

  async function switchRoom(roomId: string) {
    if (isProcessingRef.current || messageQueue.current.length > 0) {
      alert(t.chat.switch_room_block);
      return;
    }
    if (currentRoomId === roomId) return;

    if (abortController.current) {
      abortController.current.abort();
      abortController.current = null;
    }
    messageQueue.current = [];
    isProcessingRef.current = false;
    statusTimers.current.forEach(clearTimeout);
    statusTimers.current = [];
    setIsTyping(false);

    setCurrentRoomId(roomId);
    localStorage.setItem(`carmen_current_room_${config.bu}`, roomId);
    await loadHistory(roomId);
    await loadRoomList();
    setShowRoomDropdown(false);
  }

  async function confirmDeleteRoom() {
    if (isProcessingRef.current || messageQueue.current.length > 0) {
      alert(t.chat.delete_room_block);
      setDeleteModal({ open: false, roomId: null });
      return;
    }
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

  async function retryMessage(errorText: string) {
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
          isQueued: true,
          timestamp: userTimestamp,
        },
        {
          id: botMsgId,
          role: "bot",
          html: "",
          isQueued: true,
          statusText: t.chat.status_waiting,
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

      messageQueue.current.push({ text: errorText, roomId: currentRoomId, botMsgId, userMsgId });
      processQueue();
    }
  }

  async function processQueue() {
    // Synchronous lock using Ref to prevent race conditions
    if (isProcessingRef.current || messageQueue.current.length === 0) return;

    isProcessingRef.current = true;
    const currentTask = messageQueue.current.shift();
    if (!currentTask) {
      isProcessingRef.current = false;
      return;
    }

    const msgText = currentTask.text;
    const processingRoomId = currentTask.roomId;

    // From this point onward, it acts similar to the lower part of sendMessage
    // finding the matching queued message, setting it to streaming, and fetching.

    const botMsgId = currentTask.botMsgId;
    const userMsgId = currentTask.userMsgId;

    // Clear "isQueued" for both the user message and the specific bot placeholder
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === userMsgId) {
          return { ...msg, isQueued: false };
        }
        if (msg.id === botMsgId) {
          return { ...msg, isQueued: false, statusText: t.chat.status_searching };
        }
        return msg;
      })
    );

    setIsTyping(true);
    setTypingStatus(t.chat.status_searching);

    // Clear any existing status timers
    statusTimers.current.forEach(clearTimeout);
    statusTimers.current = [];

    // Legacy status rotation logic
    const statusMessages = [
      { delay: 8000, text: t.chat.status_analyzing },
      { delay: 20000, text: t.chat.status_composing },
      { delay: 45000, text: t.chat.status_processing },
    ];

    statusMessages.forEach(st => {
      const timer = setTimeout(() => {
        setTypingStatus(st.text);
        setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, statusText: st.text } : m));
      }, st.delay);
      statusTimers.current.push(timer);
    });

    const controller = new AbortController();
    abortController.current = controller;
    const signal = controller.signal;

    let accumulated = "";
    let finalMsgId: string | null = null;
    let didSave = false;

    // ... [Stream fetching logic] Same as the inner block of sendMessage ...
    try {
      const history = await api.getRoomHistory(processingRoomId!);

      const response = await fetch(`${api.baseUrl}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msgText,
          bu: config.bu,
          username: config.username,
          room_id: processingRoomId,
          prompt_extend: config.promptExtend,
          history: history.messages.filter((m: any) => m.id !== botMsgId && m.id !== userMsgId),
          lang: locale,
        }),
        signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder("utf-8");
      let lineBuffer = "";

      // Legacy-style typing animation state
      let typingBuffer = "";
      let displayedText = "";
      let isStreamingActive = true;

      // Concurrent typing animation loop
      const processTyping = () => {
        if (signal.aborted) return; // Stop animation immediately if room changed
        if (typingBuffer.length > 0) {
          // Truly Smooth Typewriter: 60fps Native refresh rate
          // 1 char per frame (~60 chars/sec) is generally fast enough and ultra-smooth.
          // We only take 2 if the stream is rushing way ahead. Never chunk >2 to avoid blockiness.
          const charsToTake = typingBuffer.length > 40 ? 2 : 1;
          displayedText += typingBuffer.substring(0, charsToTake);
          typingBuffer = typingBuffer.substring(charsToTake);

          // Format text (may include HTML media tags)
          const html = formatCarmenMessage(displayedText, api.baseUrl);

          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, html } : m))
          );

          // Optimization: Trigger frame callback for auto-scroll sync
          config.onTypingFrame?.();
        }

        if (isStreamingActive || typingBuffer.length > 0) {
          // Fire on the exact monitor refresh cycle (~16.6ms) for zero-jitter animation.
          requestAnimationFrame(processTyping);
        } else {
          // Final clean update to render all tokens (tokens processed in CarmenMessage)
          const finalHtml = formatCarmenMessage(displayedText, api.baseUrl);
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, html: finalHtml } : m))
          );
        }
      };

      // Start the visual streaming animation
      processTyping();

      for (; ;) {
        const { done, value } = await reader.read();
        if (done) break;

        // Abort check: if room changed during streaming
        if (signal.aborted) break;

        // Accumulate and resolve partial JSON lines
        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() || ""; // Keep the last incomplete line for the next chunk

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed.type === "chunk") {
              typingBuffer += parsed.data;
              accumulated += parsed.data;
            } else if (parsed.type === "status") {
              setTypingStatus(parsed.data);
            } else if (parsed.type === "sources") {
              const src = parsed.data;
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, sources: src } : m))
              );
            } else if (parsed.type === "done") {
              finalMsgId = parsed.id;
              const finalSources = parsed.sources || null;
              const finalTimestamp = new Date().toISOString();
              setMessages((prev) =>
                prev.map((m) => (m.id === botMsgId ? { ...m, msgId: finalMsgId!, sources: finalSources || m.sources, timestamp: finalTimestamp } : m))
              );
              await loadRoomList();
            }
          } catch (err) {
            console.warn("JSON Parse Error on line:", line, err);
          }
        }
      }

      // Process any remaining content in lineBuffer after stream ends
      if (lineBuffer.trim()) {
        try {
          const parsed = JSON.parse(lineBuffer.trim());
          if (parsed.type === "chunk") {
            typingBuffer += parsed.data;
            accumulated += parsed.data;
          } else if (parsed.type === "done" && !finalMsgId) {
             finalMsgId = parsed.id;
          }
        } catch (e) {
          console.warn("Final lineBuffer parse error:", e);
        }
      }

      // Signal that network streaming is done, but typing might still be catching up
      isStreamingActive = false;

      // Wait for the typing buffer to fully drain before saving the final message
      await new Promise<void>((resolve) => {
        const checkDone = () => {
          if (typingBuffer.length === 0 || signal.aborted) resolve();
          else setTimeout(checkDone, 20); // Faster check-in for final completion
        };
        checkDone();
      });
    } catch (e: any) {
      if (e.name === "AbortError") {
        if (isUserStopRef.current) {
          const finalHtml = formatCarmenMessage(accumulated + `\n\n**${t.chat.status_stopped}**`, api.baseUrl);
          setMessages((prev) =>
            prev.map((m) => (m.id === botMsgId ? { ...m, html: finalHtml } : m))
          );
        } else {
          console.log("Stream request aborted due to room switch.");
          return;
        }
      } else {
        console.warn("Stream Error:", e.message || e);
        // Only show error and clear timers if we are still in the same room context
        if (abortController.current === controller) {
          statusTimers.current.forEach(clearTimeout);
          statusTimers.current = [];
          setMessages((prev) => prev.map((m) => {
            if (m.id === botMsgId) {
              return {
                ...m,
                html: "⚠️ Error occurred, please try again",
                isError: true,
                errorText: msgText,
              };
            }
            return m;
          }));
        }
      }
    } finally {
      // Only run cleanup if this specific process wasn't aborted by a room switch
      if (abortController.current === controller || isUserStopRef.current) {
        statusTimers.current.forEach(clearTimeout);
        statusTimers.current = [];

        setIsTyping(false);
        isProcessingRef.current = false; // Release lock
        abortController.current = null;
        processQueue();
      }
    }

    if (accumulated && processingRoomId && (!signal.aborted || isUserStopRef.current)) {
      const stopNote = signal.aborted ? `\n\n**${t.chat.status_stopped}**` : "";
      await api.saveMessage(processingRoomId, {
        id: finalMsgId || botMsgId,
        sender: "bot",
        message: accumulated + stopNote,
        timestamp: new Date().toISOString(),
      }, botMsgId);
      didSave = true;
      await loadRoomList();
    }
    
    if (!didSave && processingRoomId) {
      // Clean up the placeholder if we didn't save a final message
      await api.deleteMessage(processingRoomId, botMsgId);
    }
    
    isUserStopRef.current = false;
  }

  async function sendMessage(text?: string) {
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
      localStorage.setItem(`carmen_current_room_${config.bu}`, roomId);
      await loadRoomList();
    }

    const willBeQueued = isProcessingRef.current || messageQueue.current.length > 0;

    const userHtml = img
      ? `<img src="${img}" style="max-width:100%;border-radius:8px;margin-bottom:5px;" /><br>${msgText}`
      : formatCarmenMessage(msgText, api.baseUrl);

    const userMsgId = `user-${Math.random().toString(36).substring(2, 11)}`;
    const userMsg: DisplayMessage = {
      id: userMsgId,
      role: "user",
      html: userHtml,
      isQueued: willBeQueued,
      timestamp: new Date().toISOString(),
    };

    const botMsgId = `bot-${Math.random().toString(36).substring(2, 11)}`;
    const botPlaceholder: DisplayMessage = {
      id: botMsgId,
      role: "bot",
      html: "",
      isQueued: true,
      statusText: t.chat.status_waiting,
    };

    setMessages((prev) => [...prev, userMsg, botPlaceholder]);
    setShowSuggestions(false);

    await api.saveMessage(roomId, {
      id: userMsg.id,
      sender: "user",
      message: msgText,
      image: !!img,
      timestamp: userMsg.timestamp || new Date().toISOString(),
    });

    // Save a placeholder for the bot message to maintain chronological order in localStorage
    await api.saveMessage(roomId, {
      id: botMsgId,
      sender: "bot",
      message: "",
      timestamp: new Date(Date.now() + 1).toISOString(), // slightly after the user message
    });

    // Pass the actual roomId (local variable) to the queue
    messageQueue.current.push({ text: msgText, roomId, botMsgId, userMsgId });
    processQueue();
  }

  async function sendFeedback(msgId: string, score: number) {
    await api.sendFeedback(msgId, score);
  }

  function updatePosition(newPos: { bottom: string | number; right: string | number }) {
    setPosition(newPos);
    localStorage.setItem(`carmen_chat_pos_${config.bu}`, JSON.stringify(newPos));
  }

  function stopGeneration() {
    if (isProcessingRef.current && abortController.current) {
      isUserStopRef.current = true;
      abortController.current.abort();
    }
  }

  // Use refs to keep stable function identities for child components (avoids re-rendering MessageList on every keystroke)
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

  const stableSendMessage = useState(() => (text?: string) => sendMessageRef.current(text))[0];
  const stableRetryMessage = useState(() => (errorText: string) => retryMessageRef.current(errorText))[0];
  const stableSendFeedback = useState(() => (msgId: string, score: number) => sendFeedbackRef.current(msgId, score))[0];
  
  const stopGenerationRef = useRef(stopGeneration);
  useEffect(() => { stopGenerationRef.current = stopGeneration; });
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
    isProcessing: () => isProcessingRef.current || messageQueue.current.length > 0,
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
    t,
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