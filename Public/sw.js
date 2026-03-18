/* ─────────────────────────────────────────
   CVtools Service Worker — Mode hors ligne
   Cache-first pour les assets statiques
───────────────────────────────────────── */

const CACHE_NAME = "cvtools-v9";
const URLS_TO_CACHE = [
  "/",
  "/index.html",
  "/assets/index.js",   // remplacé par Vite au build
  "/assets/index.css",  // remplacé par Vite au build
  // Polices Google (mises en cache au premier chargement)
  "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap",
  // Librairies PDF
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
];

/* Installation — mise en cache initiale */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // On tente de mettre en cache, sans bloquer si une ressource externe échoue
      return Promise.allSettled(
        URLS_TO_CACHE.map(url =>
          cache.add(url).catch(() => console.warn("SW: cache miss →", url))
        )
      );
    })
  );
  self.skipWaiting();
});

/* Activation — nettoyage des anciens caches */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* Fetch — stratégie Cache First, Network Fallback */
self.addEventListener("fetch", (event) => {
  // Ne pas intercepter les requêtes non-GET
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // On ne cache que les réponses valides
          if (!response || response.status !== 200 || response.type === "error") {
            return response;
          }
          const toCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          // Fallback hors ligne : retourner la page principale
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }
        });
    })
  );
});
