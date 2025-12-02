// A versão vem da query string: sw.js?v=v1.0
// Se por algum motivo não vier, cai no fallback "v1.0"
const VERSION = new URL(self.location).searchParams.get("v") || "v1.0";
const CACHE_NAME = "poker-tracker-cache-" + VERSION;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest"
  // os ícones entram em cache quando forem usados
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  // força esse SW a ir para o estado "waiting" imediatamente
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          // só mexe nos caches deste app
          .filter((key) => key.startsWith("poker-tracker-cache-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Regra:
// - para páginas HTML (navegação), tenta REDE primeiro, cache só de fallback
// - para o resto (CSS, JS, imagens), usa cache-then-network básico
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const acceptHeader = req.headers.get("accept") || "";

  const isHTMLRequest =
    req.mode === "navigate" ||
    acceptHeader.includes("text/html");

  if (isHTMLRequest) {
    // HTML: sempre tentar buscar a versão nova no servidor
    event.respondWith(
      fetch(req)
        .then((networkResp) => {
          const copy = networkResp.clone();
          caches.open(CACHE_NAME).then((cache) => {
            // garante que o index.html da nova versão está no cache correto
            cache.put("./index.html", copy);
          });
          return networkResp;
        })
        .catch(() => caches.match("./index.html"))
    );
  } else {
    // Outros arquivos: cache primeiro, depois rede
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).catch(() => {
          // fallback genérico
          return caches.match("./index.html");
        });
      })
    );
  }
});
