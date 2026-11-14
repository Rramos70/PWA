const CACHE_NAME = "piratas-sbc-v1";

// Recursos críticos que se guardarán en caché durante la instalación
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/maskable-icon-512x512.png",
  "/icons/apple-touch-icon.png",
  // Agrega aquí tus archivos CSS o JS adicionales si los tienes separados:
  // '/css/styles.css',
  // '/js/app.js'
];

// 1. Evento Install: Descarga y guarda en caché la shell de la aplicación
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Instalando SW...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Guardando archivos estáticos en caché");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting()),
  );
});

// 2. Evento Activate: Limpia cachés antiguas de versiones anteriores del equipo
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activando SW y limpiando cachés obsoletas...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log("[Service Worker] Eliminando caché antigua:", cache);
              return caches.delete(cache);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 3. Evento Fetch: Intercepta peticiones para responder desde la caché o la red
self.addEventListener("fetch", (event) => {
  // Ignoramos peticiones no GET o de extensiones/herramientas externas
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Estrategia: Si está en caché, la devuelve de inmediato...
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          // ... y en segundo plano actualiza la caché si la respuesta es válida
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si falla la red (offline) y no hay caché, muestra fallback si es necesario
          console.log(
            "[Service Worker] Sin conexión a internet y recurso no en caché.",
          );
        });

      return cachedResponse || fetchPromise;
    }),
  );
});
