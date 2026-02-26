export class ChatService {
    constructor(baseUrl) {
        // ทำความสะอาด URL ลบ / ต่อท้ายออก
        this.baseUrl = baseUrl.replace(/\/$/, '');
        this.ROOMS_KEY = 'carmen_rooms';
    }

    // 1. ดึงรายชื่อห้องทั้งหมดของผู้ใช้จาก LocalStorage
    async getRooms(bu, username) { // Keep bu, username params for backward compatibility but ignore them
        try {
            const data = localStorage.getItem(this.ROOMS_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.warn("getRooms Error:", e);
            return [];
        }
    }

    // 2. สร้างห้องแชทใหม่ใน LocalStorage
    async createRoom(bu, username, title = "บทสนทนาใหม่") {
        const roomId = 'loc_' + Math.random().toString(36).substring(2, 10);
        const newRoom = {
            room_id: roomId,
            title: title || "บทสนทนาใหม่",
            updated_at: new Date().toISOString()
        };

        try {
            const rooms = await this.getRooms();
            rooms.unshift(newRoom); // Add to top
            localStorage.setItem(this.ROOMS_KEY, JSON.stringify(rooms));
            return newRoom;
        } catch (e) {
            console.error("createRoom Error:", e);
            return newRoom;
        }
    }

    // 3. ดึงประวัติแชทของห้องจาก LocalStorage
    async getRoomHistory(roomId) {
        try {
            if (!roomId) return { messages: [] };
            const data = localStorage.getItem(`carmen_history_${roomId}`);
            return data ? JSON.parse(data) : { messages: [] };
        } catch (e) {
            console.warn("getRoomHistory Error:", e);
            return { messages: [] };
        }
    }

    // Helper: ลบห้องแชทที่เก่าที่สุดทิ้งเวลา LocalStorage เต็ม
    async _pruneOldestRoom() {
        try {
            const rooms = await this.getRooms();
            if (rooms.length === 0) return false; // Nothing left to prune

            // Sort to ensure we get the oldest (oldest updated_at or fallback to array end)
            // Default rooms array is sorted newest first (via unshift), so the last item is typically the oldest.
            const oldestRoom = rooms.pop();
            localStorage.setItem(this.ROOMS_KEY, JSON.stringify(rooms));
            localStorage.removeItem(`carmen_history_${oldestRoom.room_id}`);
            return true;
        } catch (e) {
            console.error("Prune error", e);
            return false;
        }
    }

    // 4. บันทึกข้อความลงในห้องแชท
    async saveMessage(roomId, msgData) {
        if (!roomId || !msgData) return;

        let success = false;
        let attempts = 0;
        const maxAttempts = 10; // Prevent infinite loop if something goes horribly wrong

        while (!success && attempts < maxAttempts) {
            try {
                // Update message history
                const history = await this.getRoomHistory(roomId);
                history.messages.push(msgData);
                localStorage.setItem(`carmen_history_${roomId}`, JSON.stringify(history));

                // Update room's updated_at
                const rooms = await this.getRooms();
                const roomIndex = rooms.findIndex(r => r.room_id === roomId);
                if (roomIndex !== -1) {
                    const room = rooms.splice(roomIndex, 1)[0];
                    room.updated_at = new Date().toISOString();
                    rooms.unshift(room);
                    localStorage.setItem(this.ROOMS_KEY, JSON.stringify(rooms));
                }

                success = true; // Save successful
            } catch (e) {
                // Check if it is a QuotaExceeded error (common names depending on browser)
                if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    console.warn(`LocalStorage is full. Auto-pruning oldest room (Attempt ${attempts + 1})...`);
                    const pruned = await this._pruneOldestRoom();
                    if (!pruned) {
                        console.error("LocalStorage full and cannot prune any more rooms.");
                        break; // Stop if there's nothing left to delete
                    }
                    attempts++;
                } else {
                    console.warn("saveMessage Error:", e);
                    break; // Other unexpected error
                }
            }
        }
    }

    // 5. ลบห้องแชททั้งข้อมูลห้องและประวัติ
    async deleteRoom(roomId) {
        try {
            if (!roomId) return { status: 'success' };
            // Remove from list
            const rooms = await this.getRooms();
            const updatedRooms = rooms.filter(r => r.room_id !== roomId);
            localStorage.setItem(this.ROOMS_KEY, JSON.stringify(updatedRooms));

            // Remove history
            localStorage.removeItem(`carmen_history_${roomId}`);

            // Clear backed in-memory history
            await this.clearHistory(roomId);
            return { status: 'success' };
        } catch (e) {
            console.error("deleteRoom Error:", e);
            return { status: 'error' };
        }
    }

    // 6. ส่งข้อความแชทไป backend (รอ response ก้อนเดียว)
    async sendMessage(payload) {
        const res = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            let errorMsg = "Unknown Error";
            try {
                const errBody = await res.json();
                errorMsg = errBody.detail || JSON.stringify(errBody);
            } catch (e) {
                errorMsg = await res.text();
            }
            throw new Error(`API Error ${res.status}: ${errorMsg}`);
        }

        return await res.json();
    }

    // 7. ส่ง Feedback (Like/Dislike)
    async sendFeedback(msgId, score) {
        try {
            await fetch(`${this.baseUrl}/api/chat/feedback/${msgId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score })
            });
        } catch (e) {
            console.error("Feedback Error:", e);
        }
    }

    // 8. ล้างประวัติ (สั่งให้ Backend ลบ in-memory history ของห้องนั้น)
    async clearHistory(roomId) {
        try {
            if (!roomId) return;
            await fetch(`${this.baseUrl}/api/chat/clear/${roomId}`, { method: 'DELETE' });
        } catch (e) {
            console.warn("ClearHistory API Error:", e);
        }
    }

    // 9. (Legacy) ดึงประวัติแบบเก่า
    async getHistory(bu, username, sessionId) {
        try {
            const params = new URLSearchParams({ bu, username, session_id: sessionId || '' });
            const res = await fetch(`${this.baseUrl}/chat/history?${params.toString()}`);
            return res.ok ? await res.json() : [];
        } catch (e) {
            console.warn("Legacy getHistory Error:", e);
            return [];
        }
    }
}