/** Anonymous chat user id: persisted in localStorage per browser */
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
