export interface CarmenRoom {
  room_id: string;
  title: string;
  updated_at: string;
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

  async function createRoom(
    _bu: string,
    _user: string,
    title = "บทสนทนาใหม่"
  ): Promise<CarmenRoom> {
    const room: CarmenRoom = {
      room_id: "loc_" + Math.random().toString(36).substring(2, 10),
      title: title || "บทสนทนาใหม่",
      updated_at: new Date().toISOString(),
    };
    try {
      const rooms = await getRooms();
      rooms.unshift(room);
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
    msg: CarmenMessage
  ): Promise<void> {
    if (!roomId || !msg) return;
    let saved = false;
    let attempt = 0;
    while (!saved && attempt < 10) {
      try {
        const history = await getRoomHistory(roomId);
        history.messages.push(msg);
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

  async function sendFeedback(msgId: string, score: number): Promise<void> {
    try {
      await fetch(`${base}/api/chat/feedback/${msgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
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
    sendFeedback,
    clearHistory,
    baseUrl: base,
  };
}

export type CarmenApi = ReturnType<typeof createCarmenApi>;