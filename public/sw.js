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
