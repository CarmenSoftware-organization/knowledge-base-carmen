/**
 * สร้าง/ดึง Client ID สำหรับผู้ใช้ที่ไม่ล็อกอิน
 * เก็บใน localStorage เพื่อให้แต่ละ browser/device มี ID เดียวกัน
 * ใช้เป็น user_id ใน chat_history
 */
const STORAGE_KEY = "carmen_client_id";

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id =
      "anon_" +
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15) +
          Date.now().toString(36));
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
