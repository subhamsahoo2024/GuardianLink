const CACHE_VERSION = "guardianlink-pwa-v1";
const SHELL_CACHE = `guardianlink-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `guardianlink-runtime-${CACHE_VERSION}`;
const MAPS_CACHE = `guardianlink-maps-${CACHE_VERSION}`;

const APP_SHELL_URLS = [
  "/",
  "/staff",
  "/responder",
  "/manifest.webmanifest",
  "/guardianlink-icon.svg",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

const MAPS_MATCHERS = [
  "https://maps.googleapis.com/",
  "https://maps.gstatic.com/",
  "https://fonts.gstatic.com/",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              ![SHELL_CACHE, RUNTIME_CACHE, MAPS_CACHE].includes(key),
          )
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  return cached || (await networkPromise) || Response.error();
}

async function networkFirst(request, fallbackUrl = "/") {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const fallback = await caches.match(fallbackUrl);
    return fallback || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, "/"));
    return;
  }

  if (MAPS_MATCHERS.some((prefix) => request.url.startsWith(prefix))) {
    event.respondWith(staleWhileRevalidate(request, MAPS_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith("/_next/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".webmanifest")
    ) {
      event.respondWith(cacheFirst(request, SHELL_CACHE));
      return;
    }

    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
  }
});
