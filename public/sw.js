/* Mộc Maria: do not cache customer information, authenticated routes or API responses. */
const OFFLINE_CACHE = "moc-maria-pwa-offline-v1";
const OFFLINE_FILES = ["/pwa/offline.html", "/pwa/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.addAll(OFFLINE_FILES)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("moc-maria-pwa-offline-") && key !== OFFLINE_CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Serve only the generic icon from cache; never store personal HTML or API responses.
  if (url.pathname === "/pwa/icon-192.png") {
    event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
    return;
  }
  if (event.request.mode !== "navigate") return;

  // Network-only navigation; offline fallback contains no cached personal data.
  event.respondWith(
    fetch(event.request).catch(async () => {
      const cached = await caches.match("/pwa/offline.html");
      return cached ?? Response.error();
    }),
  );
});

// Privacy-safe Web Push for KTV; preserve existing offline navigation/caching.
const CHAT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload;
    try {
      payload = event.data && event.data.json();
    } catch {
      return;
    }
    if (!payload || !CHAT_UUID.test(payload.messageId) || !CHAT_UUID.test(payload.threadId)) return;
    const url = "/tin-nhan?thread=" + encodeURIComponent(payload.threadId);
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const focused = windows.find((client) => client.focused);
    if (focused) {
      focused.postMessage({
        type: "moc-maria:chat:push",
        messageId: payload.messageId,
        threadId: payload.threadId,
      });
      return;
    }
    await self.registration.showNotification("Mộc Maria", {
      body: "Bạn có tin nhắn mới từ khách hàng",
      icon: "/pwa/icon-192.png",
      badge: "/pwa/icon-192.png",
      tag: "mocmaria-chat-" + payload.messageId,
      data: { url },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const raw = event.notification.data && event.notification.data.url;
    const url = typeof raw === "string" ? new URL(raw, self.location.origin) : null;
    if (!url || url.origin !== self.location.origin ||
      url.pathname !== "/tin-nhan" || !CHAT_UUID.test(url.searchParams.get("thread") || "")) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const target = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (target) {
      await target.navigate(url.href);
      await target.focus();
    } else {
      await self.clients.openWindow(url.href);
    }
  })());
});
