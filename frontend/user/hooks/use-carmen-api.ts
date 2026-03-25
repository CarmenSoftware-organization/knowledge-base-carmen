// ---------------------------------------------------------------------------
// Client-side PII masking — mirrors backend/core/pii.py patterns.
// Applied before any message is persisted to localStorage.
// ---------------------------------------------------------------------------
const _PII_PATTERNS: [RegExp, string][] = [
  [/[\w.%+\-]+@[\w\-]+\.[\w.\-]+/gi, "[email]"],
  [/\b0[689]\d[\s\-]?\d{3}[\s\-]?\d{4}\b/g, "[phone]"],
  [/\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b/g, "[phone]"],
  [/\+\d{1,3}[\s\-]?\d{1,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}\b/g, "[phone]"],
  [/\b\d{1}[\s\-]\d{4}[\s\-]\d{5}[\s\-]\d{2}[\s\-]\d{1}\b/g, "[national-id]"],
  [/\b\d{13}\b/g, "[national-id]"],
  [/\b\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}\b/g, "[card]"],
  [/\b\d{16}\b/g, "[card]"],
  [/\b\d{4}[\s\-]\d{6}[\s\-]\d{5}\b/g, "[card]"],
];

function maskPii(text: string): string {
  if (!text) return text;
  for (const [pattern, replacement] of _PII_PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export interface CarmenRoom {
  room_id: string;
  title: string;
  updated_at: string;
  lastMessage?: string;
}

export interface CarmenMessage {
  id?: string;
  sender: "user" | "bot";
  message: string;
  image?: boolean;
  sources?: string[] | null;
  timestamp: string;
}

export interface CarmenRoomHistory {
  messages: CarmenMessage[];
}

const ROOMS_KEY = "carmen_rooms";
const MAX_ROOMS = 15;           // สูงสุด 15 ห้อง
const MAX_MESSAGES = 100;       // สูงสุด 100 messages ต่อห้อง
const ROOM_TTL_DAYS = 30;       // ลบห้องที่ไม่ได้ใช้เกิน 30 วัน

export function createCarmenApi(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, "");

  async function getRooms(): Promise<CarmenRoom[]> {
    try {
      const raw = localStorage.getItem(ROOMS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /** ลบ carmen_history_* ที่ไม่มี room ใน carmen_rooms แล้ว (orphan keys) */
  function _cleanOrphans(validIds: Set<string>): void {
    const toDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("carmen_history_") && !validIds.has(key.slice("carmen_history_".length))) {
        toDelete.push(key);
      }
    }
    toDelete.forEach(k => localStorage.removeItem(k));
  }

  /** ลบห้องที่ไม่ได้ใช้เกิน ROOM_TTL_DAYS และ orphan keys */
  async function housekeep(): Promise<void> {
    try {
      const rooms = await getRooms();
      const cutoff = Date.now() - ROOM_TTL_DAYS * 864e5;
      const expired = rooms.filter(r => new Date(r.updated_at).getTime() < cutoff);
      expired.forEach(r => localStorage.removeItem(`carmen_history_${r.room_id}`));
      const alive = rooms.filter(r => new Date(r.updated_at).getTime() >= cutoff);
      if (expired.length > 0) {
        localStorage.setItem(ROOMS_KEY, JSON.stringify(alive));
      }
      _cleanOrphans(new Set(alive.map(r => r.room_id)));
    } catch { /* ไม่ block การทำงาน */ }
  }

  async function createRoom(
    _bu: string,
    _user: string,
    title = "บทสนทนาใหม่"
  ): Promise<CarmenRoom> {
    const room: CarmenRoom = {
      room_id: "loc_" + (crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 10)),
      title: title || "บทสนทนาใหม่",
      updated_at: new Date().toISOString(),
    };
    try {
      let rooms = await getRooms();
      rooms.unshift(room);
      // ถ้าเกิน MAX_ROOMS ให้ลบห้องเก่าสุดทิ้ง
      while (rooms.length > MAX_ROOMS) {
        const removed = rooms.pop()!;
        localStorage.removeItem(`carmen_history_${removed.room_id}`);
      }
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
    } catch (e) {
      console.error("createRoom Error:", e);
    }
    return room;
  }

  async function getRoomHistory(roomId: string): Promise<CarmenRoomHistory> {
    try {
      if (!roomId) return { messages: [] };
      const raw = localStorage.getItem(`carmen_history_${roomId}`);
      return raw ? JSON.parse(raw) : { messages: [] };
    } catch {
      return { messages: [] };
    }
  }

  async function _pruneOldestRoom(): Promise<boolean> {
    try {
      const rooms = await getRooms();
      if (rooms.length === 0) return false;
      const oldest = rooms.pop()!;
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
      localStorage.removeItem(`carmen_history_${oldest.room_id}`);
      return true;
    } catch {
      return false;
    }
  }

  async function saveMessage(
    roomId: string,
    msg: CarmenMessage,
    matchId?: string
  ): Promise<void> {
    if (!roomId || !msg) return;
    let saved = false;
    let attempt = 0;
    while (!saved && attempt < 10) {
      try {
        const history = await getRoomHistory(roomId);
        const searchId = matchId || msg.id;
        const existingIdx = history.messages.findIndex(m => m.id === searchId && searchId);
        const maskedMsg = { ...msg, message: maskPii(msg.message) };
        if (existingIdx !== -1) {
          history.messages[existingIdx] = maskedMsg;
        } else {
          history.messages.push(maskedMsg);
          // trim ถ้าเกิน MAX_MESSAGES — ตัด message เก่าสุดทิ้ง
          if (history.messages.length > MAX_MESSAGES) {
            history.messages = history.messages.slice(-MAX_MESSAGES);
          }
        }
        localStorage.setItem(
          `carmen_history_${roomId}`,
          JSON.stringify(history)
        );
        const rooms = await getRooms();
        const idx = rooms.findIndex((r) => r.room_id === roomId);
        if (idx !== -1) {
          const [room] = rooms.splice(idx, 1);
          room.updated_at = new Date().toISOString();
          rooms.unshift(room);
          localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
        }
        saved = true;
      } catch (e: unknown) {
        const err = e as DOMException;
        if (
          err.name === "QuotaExceededError" ||
          err.name === "NS_ERROR_DOM_QUOTA_REACHED"
        ) {
          const pruned = await _pruneOldestRoom();
          if (!pruned) break;
          attempt++;
        } else {
          break;
        }
      }
    }
  }

  async function deleteRoom(roomId: string): Promise<{ status: string }> {
    try {
      if (!roomId) return { status: "success" };
      const rooms = (await getRooms()).filter((r) => r.room_id !== roomId);
      localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
      localStorage.removeItem(`carmen_history_${roomId}`);
      await clearHistory(roomId);
      return { status: "success" };
    } catch (e) {
      console.error("deleteRoom Error:", e);
      return { status: "error" };
    }
  }

  async function deleteMessage(roomId: string, messageId: string): Promise<void> {
    try {
      if (!roomId || !messageId) return;
      const history = await getRoomHistory(roomId);
      history.messages = history.messages.filter((m) => m.id !== messageId);
      localStorage.setItem(`carmen_history_${roomId}`, JSON.stringify(history));
    } catch {
      // silent
    }
  }

  async function sendFeedback(msgId: string, score: number, bu: string, username: string): Promise<void> {
    try {
      await fetch(`${base}/api/chat/feedback/${msgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, bu, username }),
      });
    } catch (e) {
      console.error("Feedback Error:", e);
    }
  }

  async function clearHistory(roomId: string): Promise<void> {
    try {
      if (!roomId) return;
      await fetch(`${base}/api/chat/clear/${roomId}`, { method: "DELETE" });
    } catch {
      // silent
    }
  }

  return {
    getRooms,
    createRoom,
    getRoomHistory,
    saveMessage,
    deleteRoom,
    deleteMessage,
    sendFeedback,
    clearHistory,
    housekeep,
    baseUrl: base,
  };
}

export type CarmenApi = ReturnType<typeof createCarmenApi>;