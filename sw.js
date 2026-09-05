/* App shell cached for instant launch; API responses cached as a fallback so a
   player page you already opened still works without a connection. */
const SHELL = "nbafs-shell-v1";
const DATA = "nbafs-data-v1";
const ASSETS = ["./", "./manifest.webmanifest", "./icon-192.png",
                "./icon-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((k) => k !== SHELL && k !== DATA).map((k) => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    // Network first: stats must be fresh when the phone is online.
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(DATA).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }
  e.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
});
