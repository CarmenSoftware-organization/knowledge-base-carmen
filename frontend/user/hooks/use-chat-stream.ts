"use client";
// frontend/user/hooks/use-chat-stream.ts
//
// Encapsulates the streaming-chat logic (executeStream + stopGeneration).
// All React state lives in the parent hook (use-carmen-chat.ts); this file
// receives only what it needs through StreamDeps, keeping concerns separate.

import { RefObject } from "react";
import { formatCarmenMessage } from "@/lib/carmen-formatter";
import { CarmenApi } from "./use-carmen-api";
import { CarmenChatConfig, DisplayMessage } from "./use-carmen-chat";

/** CDN/proxy often returns HTML (e.g. Render 502 page); never show that whole blob in the UI. */
function summarizeProxyOrHtmlError(raw: string, httpStatus: number): string {
  const t = raw.trim();
  if (!t) {
    return httpStatus === 502
      ? "502 Bad Gateway — backend หรือ chatbot บน Render ไม่ตอบชั่วคราว (deploy, sleep, หรือ PYTHON_CHATBOT_URL ผิด)"
      : `HTTP ${httpStatus}`;
  }
  const looksHtml =
    /^<!DOCTYPE/i.test(t) ||
    /^<html/i.test(t) ||
    (t.includes("<head") && t.includes("<body"));
  if (looksHtml) {
    if (httpStatus === 502 || /\b502\b|Bad Gateway/i.test(t)) {
      return "502 Bad Gateway — proxy ไม่ถึง Go หรือ Python chatbot; ลองใหม่ใน 1–2 นาที หรือเช็ค Render Dashboard (service + PYTHON_CHATBOT_URL)";
    }
    if (httpStatus === 503 || /\b503\b/i.test(t)) {
      return "503 — บริการไม่พร้อมชั่วคราว; ลองใหม่ในไม่กี่นาที";
    }
    return `ได้รับหน้า HTML จากเซิร์ฟเวอร์ (HTTP ${httpStatus}) แทน JSON — มักเป็นปัญหา deploy/proxy`;
  }
  return t.length > 500 ? `${t.slice(0, 500)}…` : t;
}

function sanitizeErrorMessageForUi(message: string): string {
  const s = message.trim();
  if (!s) return s;
  if (/^<!DOCTYPE/i.test(s) || /^<html/i.test(s)) {
    return summarizeProxyOrHtmlError(s, 0);
  }
  return s.length > 800 ? `${s.slice(0, 800)}…` : s;
}

// ---------------------------------------------------------------------------
// Dependency interface — passed from useCarmenChat into executeStream
// ---------------------------------------------------------------------------
export interface StreamDeps {
  api: CarmenApi;
  config: CarmenChatConfig;
  locale: string;
  t: (key: string) => string;
  isProcessingRef: RefObject<boolean>;
  abortController: RefObject<AbortController | null>;
  isUserStopRef: RefObject<boolean>;
  statusTimers: RefObject<NodeJS.Timeout[]>;
  setMessages: React.Dispatch<React.SetStateAction<DisplayMessage[]>>;
  setIsTyping: (v: boolean) => void;
  setTypingStatus: (v: string) => void;
  loadRoomList: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// executeStream — streams a chat response and updates message state live
// ---------------------------------------------------------------------------
export async function executeStream(
  msgText: string,
  processingRoomId: string,
  botMsgId: string,
  userMsgId: string,
  deps: StreamDeps,
): Promise<void> {
  const { api, config, locale, t, isProcessingRef, abortController, isUserStopRef, statusTimers, setMessages, setIsTyping, setTypingStatus, loadRoomList } = deps;

  if (isProcessingRef.current) return;
  isProcessingRef.current = true;

  setMessages((prev) =>
    prev.map((msg) => msg.id === botMsgId ? { ...msg, statusText: t("chat.status_searching") } : msg)
  );
  setIsTyping(true);
  setTypingStatus(t("chat.status_searching"));

  statusTimers.current.forEach(clearTimeout);
  statusTimers.current = [];

  const statusRotation = [
    { delay: 8000,  text: t("chat.status_analyzing") },
    { delay: 20000, text: t("chat.status_composing") },
    { delay: 45000, text: t("chat.status_processing") },
  ];
  statusRotation.forEach(({ delay, text }) => {
    const timer = setTimeout(() => {
      setTypingStatus(text);
      setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, statusText: text } : m));
    }, delay);
    statusTimers.current.push(timer);
  });

  const controller = new AbortController();
  abortController.current = controller;
  const { signal } = controller;

  // Abort if backend is silent for 90 seconds
  const timeoutId = setTimeout(() => controller.abort(), 90_000);

  let accumulated = "";
  let finalMsgId: string | null = null;
  let didSave = false;

  try {
    const history = await api.getRoomHistory(processingRoomId);

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
        referrer_page: config.referrer_page ?? (typeof window !== "undefined" ? window.location.pathname : null),
      }),
      signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const raw = await response.text();
      let msg: string;
      try {
        const j = JSON.parse(raw) as { message?: string; error?: string; detail?: string };
        msg = [j.message, j.detail, j.error].filter(Boolean).join(" — ") || raw;
        if (!msg.trim()) msg = summarizeProxyOrHtmlError(raw, response.status);
      } catch {
        msg = summarizeProxyOrHtmlError(raw, response.status);
      }
      throw new Error(msg.trim() || `HTTP ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder("utf-8");
    let lineBuffer = "";

    // Typing animation state
    let typingBuffer = "";
    let displayedText = "";
    let isStreamingActive = true;
    let bufferedSuggestions: string[] | null = null;

    const processTyping = () => {
      if (signal.aborted) return;
      if (typingBuffer.length > 0) {
        const charsToTake = typingBuffer.length > 40 ? 2 : 1;
        displayedText += typingBuffer.substring(0, charsToTake);
        typingBuffer = typingBuffer.substring(charsToTake);

        const html = formatCarmenMessage(displayedText, api.baseUrl);
        setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, html } : m));
        config.onTypingFrame?.();
      }

      if (isStreamingActive || typingBuffer.length > 0) {
        requestAnimationFrame(processTyping);
      } else {
        // Streaming complete — commit final HTML + suggestions
        const finalHtml = formatCarmenMessage(displayedText, api.baseUrl);
        setMessages((prev) => {
          const botMessages = prev.filter((m) => m.role === "bot");
          const isLastBot = botMessages.length > 0 && botMessages[botMessages.length - 1].id === botMsgId;
          return prev.map((m) => {
            if (m.id !== botMsgId) return m;
            return { ...m, html: finalHtml, suggestions: isLastBot ? (bufferedSuggestions ?? m.suggestions) : [] };
          });
        });
        window.dispatchEvent(new CustomEvent("carmen-scroll-smooth"));
        setTimeout(() => window.dispatchEvent(new CustomEvent("carmen-scroll-smooth")), 300);
        setTimeout(() => window.dispatchEvent(new CustomEvent("carmen-scroll-smooth")), 800);
      }
    };

    processTyping();

    // Read SSE stream
    for (;;) {
      const { done, value } = await reader.read();
      if (done || signal.aborted) break;

      lineBuffer += decoder.decode(value, { stream: true });
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

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
            setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, sources: parsed.data } : m));
          } else if (parsed.type === "suggestions") {
            bufferedSuggestions = parsed.data;
          } else if (parsed.type === "done") {
            finalMsgId = parsed.id;
            const finalTimestamp = new Date().toISOString();
            setMessages((prev) =>
              prev.map((m) => m.id === botMsgId
                ? { ...m, msgId: finalMsgId!, sources: parsed.sources ?? m.sources, timestamp: finalTimestamp }
                : m
              )
            );
            await loadRoomList();
          }
        } catch {
          // malformed JSON line — skip
        }
      }
    }

    // Flush remaining line buffer
    if (lineBuffer.trim()) {
      try {
        const parsed = JSON.parse(lineBuffer.trim());
        if (parsed.type === "chunk") { typingBuffer += parsed.data; accumulated += parsed.data; }
        else if (parsed.type === "done" && !finalMsgId) { finalMsgId = parsed.id; }
        else if (parsed.type === "suggestions") { bufferedSuggestions = parsed.data; }
      } catch {
        // malformed final line — skip
      }
    }

    isStreamingActive = false;

    // Wait for typing animation to drain
    await new Promise<void>((resolve) => {
      function check(): void {
        if ((typingBuffer.length === 0 && !isStreamingActive) || signal.aborted) {
          resolve();
        } else {
          setTimeout(check, 20);
        }
      }
      check();
    });

  } catch (e: any) {
    if (e.name === "AbortError") {
      if (isUserStopRef.current) {
        const finalHtml = formatCarmenMessage(accumulated + `\n\n**${t("chat.status_stopped")}**`, api.baseUrl);
        setMessages((prev) => prev.map((m) => m.id === botMsgId ? { ...m, html: finalHtml } : m));
      } else {
        // Aborted due to room switch — discard silently
        return;
      }
    } else {
      if (abortController.current === controller) {
        statusTimers.current.forEach(clearTimeout);
        statusTimers.current = [];
        const detail = sanitizeErrorMessageForUi(String(e?.message ?? e ?? "").trim());
        setMessages((prev) =>
          prev.map((m) =>
            m.id === botMsgId
              ? {
                  ...m,
                  html: "",
                  isError: true,
                  errorText: msgText,
                  errorDetail: detail || undefined,
                }
              : m
          )
        );
      }
    }
  } finally {
    clearTimeout(timeoutId);
    if (abortController.current === controller || isUserStopRef.current) {
      statusTimers.current.forEach(clearTimeout);
      statusTimers.current = [];
      setIsTyping(false);
      isProcessingRef.current = false;
      abortController.current = null;
    }
  }

  // Persist bot message (or clean up placeholder)
  try {
    if (accumulated && processingRoomId && (!signal.aborted || isUserStopRef.current)) {
      const stopNote = signal.aborted ? `\n\n**${t("chat.status_stopped")}**` : "";
      await api.saveMessage(processingRoomId, {
        id: finalMsgId ?? botMsgId,
        sender: "bot",
        message: accumulated + stopNote,
        timestamp: new Date().toISOString(),
      }, botMsgId);
      didSave = true;
      await loadRoomList();
    }
    if (!didSave && processingRoomId) {
      await api.deleteMessage(processingRoomId, botMsgId);
    }
  } finally {
    isUserStopRef.current = false;
  }
}

// ---------------------------------------------------------------------------
// stopGeneration — abort the active stream (user-initiated)
// ---------------------------------------------------------------------------
export function stopGeneration(
  isProcessingRef: RefObject<boolean>,
  abortController: RefObject<AbortController | null>,
  isUserStopRef: RefObject<boolean>,
): void {
  if (isProcessingRef.current && abortController.current) {
    isUserStopRef.current = true;
    abortController.current.abort();
  }
}
