export class ChatService {
    constructor(baseUrl) {
        // ทำความสะอาด URL ลบ / ต่อท้ายออก
        this.baseUrl = baseUrl.replace(/\/$/, '');
    }

    // 🆕 1. ดึงรายชื่อห้องทั้งหมดของผู้ใช้
    async getRooms(bu, username) {
        return []; // No persistent rooms anymore
    }

    // 🆕 2. สร้างห้องแชทใหม่
    async createRoom(bu, username, title = "บทสนทนาใหม่") {
        // Generate a random local room ID
        const roomId = 'loc_' + Math.random().toString(36).substring(2, 10);
        return { room_id: roomId, title: title };
    }

    // 🆕 3. ดึงประวัติแชทเฉพาะห้องที่เลือก
    async getRoomHistory(roomId) {
        return { messages: [] }; // No persistent history fetched on load
    }

    // 🆕 4. ลบห้องแชท
    async deleteRoom(roomId) {
        return { status: 'success' };
    }

    // 5. ส่งข้อความแชท (รองรับ room_id ใน payload)
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

    // 6. ส่ง Feedback (Like/Dislike)
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

    // 7. ล้างประวัติ (สั่งให้ Backend ลบ in-memory history ของห้องนั้น)
    async clearHistory(roomId) {
        try {
            if (!roomId) return;
            await fetch(`${this.baseUrl}/api/chat/clear/${roomId}`, { method: 'DELETE' });
        } catch (e) {
            console.warn("ClearHistory Error:", e);
        }
    }

    // (คงไว้สำหรับกรณีใช้แบบไม่มีห้อง - Legacy Support)
    async getHistory(bu, username, sessionId) {
        try {
            const params = new URLSearchParams({
                bu: bu,
                username: username,
                session_id: sessionId || ''
            });
            const res = await fetch(`${this.baseUrl}/chat/history?${params.toString()}`, {
                method: 'GET'
            });
            return res.ok ? await res.json() : [];
        } catch (e) {
            console.warn("API Error:", e);
            return [];
        }
    }
}