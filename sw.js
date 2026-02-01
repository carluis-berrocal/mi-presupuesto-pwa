const CACHE_NAME = "mi-presupuesto-cache-v2";
const urlsToCache = ["/", "/index.html", "/manifest.json"];

// Instalar el service worker
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Cacheando archivos");
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log("Service Worker: Instalación completa");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("Service Worker: Error durante la instalación", error);
      })
  );
});

// Activar el service worker
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activando...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(
                "Service Worker: Eliminando cache antigua",
                cacheName
              );
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker: Activación completa");
        return self.clients.claim();
      })
  );
});

// Interceptar solicitudes de red
self.addEventListener("fetch", (event) => {
  // Solo cachear solicitudes GET
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Si encontramos el recurso en cache, lo devolvemos
      if (response) {
        console.log("Service Worker: Sirviendo desde cache", event.request.url);
        return response;
      }

      // Si no está en cache, lo pedimos a la red
      console.log("Service Worker: Solicitando desde red", event.request.url);
      return fetch(event.request)
        .then((response) => {
          // Verificar si recibimos una respuesta válida
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }

          // Clonar la respuesta porque es un stream
          const responseToCache = response.clone();

          // Agregar al cache
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch((error) => {
          console.error("Service Worker: Error en fetch", error);

          // Si es el archivo principal y estamos offline, devolver una página de fallback
          if (event.request.destination === "document") {
            return caches.match("/");
          }

          throw error;
        });
    })
  );
});

// Manejar mensajes del cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Manejar actualizaciones del service worker
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

// Sincronización en segundo plano (para cuando vuelva la conexión)
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("Service Worker: Sincronización en segundo plano");
    // Aquí podrías sincronizar datos como puntuaciones altas
  }
});

// Notificaciones push (opcional para futuras características)
self.addEventListener("push", (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Manejar clicks en notificaciones
self.addEventListener("notificationclick", (event) => {
  console.log("Service Worker: Click en notificación");
  event.notification.close();

  event.waitUntil(clients.openWindow("/"));
});
