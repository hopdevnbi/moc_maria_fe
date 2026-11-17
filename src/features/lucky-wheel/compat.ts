/** Safari-compatible UUID/deadlines: no AbortSignal.any/timeout dependency. */
export function newRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 15) | 64;
  bytes[8] = (bytes[8]! & 63) | 128;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export function checkAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
}
export async function withDeadline<T>(
  task: (signal: AbortSignal) => Promise<T>,
  parent: AbortSignal,
  ms: number,
): Promise<T> {
  checkAborted(parent);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: () => void = () => {};
  const deadline = new Promise<never>((_, reject) => {
    abort = () => {
      controller.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };
    parent.addEventListener("abort", abort, { once: true });
    timer = setTimeout(abort, ms);
  });
  try {
    return await Promise.race([task(controller.signal), deadline]);
  } finally {
    clearTimeout(timer);
    parent.removeEventListener("abort", abort);
  }
}
