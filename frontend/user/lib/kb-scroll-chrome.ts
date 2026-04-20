/** แจ้งสถานะ “พับ header ตอนเลื่อนลง” ให้คอมโพเนนต์อื่น (เช่นแถบ Menu มือถือ) ซิงก์กับ KBHeader */

type Listener = (scrollHidden: boolean) => void;

const listeners = new Set<Listener>();

export function subscribeKbHeaderScrollHidden(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyKbHeaderScrollHidden(scrollHidden: boolean): void {
  listeners.forEach((fn) => {
    try {
      fn(scrollHidden);
    } catch {
      /* ignore subscriber errors */
    }
  });
}
