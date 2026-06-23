/** Anonymous chat user id: persisted in localStorage per browser */
const STORAGE_KEY = "carmen_client_id";

export function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = "anon_" + secureRandomId();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Cryptographically secure random id (Web Crypto is standard in all supported browsers). */
function secureRandomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
