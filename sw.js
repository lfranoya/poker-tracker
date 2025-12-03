// Service Worker Poker Tracker v2.5
// Lê a versão a partir da query string (sw.js?v=v2.5)
const VERSION = new URL(self.location).searchParams.get("v") || "v1";
const CACHE_NAME = "poker-tracker-cache-" + VERSION;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
  // ícones entram em cache quando usados
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Estratégia:
// - HTML (navegação): rede primeiro, cache de fallback
// - Restante (CSS/JS/img): cache primeiro, rede de fallback
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";
  const isHTML =
    req.mode === "navigate" ||
    accept.includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", copy);
          });
          return networkResp;
        })
        .catch(() => caches.match("./index.html"))
    );
  } else {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).catch(() => caches.match("./index.html"));
      })
    );
  }
});
