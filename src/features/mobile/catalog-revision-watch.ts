"use client";

import { io } from "socket.io-client";

type RevisionPayload = { revision: string; pollAfterMs?: number };
const listeners = new Map<() => void, number>();
let stop: (() => void) | undefined;
let lastRevision: string | null = null;

// One watcher per tab, including pages whose header and body both subscribe.
export function subscribeCatalogRevision(refresh: () => void): () => void {
  listeners.set(refresh, (listeners.get(refresh) ?? 0) + 1);
  stop ??= startWatcher();
  return () => {
    const count = listeners.get(refresh) ?? 0;
    if (count > 1) listeners.set(refresh, count - 1);
    else listeners.delete(refresh);
    if (!listeners.size) {
      stop?.();
      stop = undefined;
    }
  };
}

function startWatcher() {
  let active = true;
  let inFlight = false;
  let pollAfterMs = 90_000;
  let timer: ReturnType<typeof setTimeout>;
  const controller = new AbortController();
  async function checkRevision() {
    if (!active || inFlight || document.visibilityState === "hidden") return;
    inFlight = true;
    try {
      const response = await fetch("/api/mobile/public-revision", {
        cache: "no-store",
        credentials: "omit",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
      });
      if (!response.ok) return;
      const body = (await response.json()) as RevisionPayload;
      if (!active || !/^[0-9a-f]{24}$/.test(body.revision)) return;
      pollAfterMs = body.pollAfterMs === 5000 ? 5000 : 90_000;
      const previous = lastRevision;
      lastRevision = body.revision;
      // The first enabled check also closes the SSR-to-subscription commit window.
      if ((previous && previous !== body.revision) || (!previous && pollAfterMs === 5000))
        for (const refresh of listeners.keys()) refresh();
    } catch {
      // Keep the current view; reconnect, visibility and polling retry the live gate.
    } finally {
      inFlight = false;
    }
  }
  async function poll() {
    await checkRevision();
    if (active) timer = setTimeout(() => void poll(), pollAfterMs);
  }
  const socket = io("https://chat.giangxa.com/moc-maria-updates", {
    transports: ["websocket", "polling"],
    withCredentials: false,
    reconnection: true,
    reconnectionDelayMax: 15_000,
    timeout: 7_000,
  });
  socket.on("connect", () => void checkRevision());
  socket.on("moc-maria:catalog-changed", (message: RevisionPayload) => {
    // Legacy relay hashes are hints; only an origin revision can invalidate this view.
    if (/^[0-9a-f]{24}$/.test(message?.revision) && lastRevision !== message.revision)
      void checkRevision();
  });
  const onVisible = () => {
    if (document.visibilityState === "visible") void checkRevision();
  };
  document.addEventListener("visibilitychange", onVisible);
  void poll();
  return () => {
    active = false;
    clearTimeout(timer);
    controller.abort();
    document.removeEventListener("visibilitychange", onVisible);
    socket.disconnect();
  };
}
