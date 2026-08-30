// ==========================================================================
// Service Worker for ENDEAVOR OS
// Network-First with Instant Cache Invalidation & Auto-Update
// ==========================================================================

const CACHE_VERSION = 'endeavor-v' + Date.now();
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/endeavor-e.png',
  '/favicon.svg'
];

// Install: Cache initial shell and activate immediately
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('SW pre-cache warning:', err);
      });
    })
  );
});

// Activate: Purge all old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_VERSION)
          .map(cacheName => {
            console.log('[SW] Deleting obsolete cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for HTML/Navigation, Stale-While-Revalidate for static assets
self.addEventListener('fetch', event => {
  const request = event.request;

  // Ignore non-GET or chrome-extension/firebase requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  const isNavigation = request.mode === 'navigate' || request.destination === 'document' || request.url.endsWith('.html');

  if (isNavigation) {
    // Network-First for HTML to ensure latest deployment is ALWAYS loaded
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          // Offline fallback
          const cached = await caches.match(request);
          if (cached) return cached;
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Stale-While-Revalidate for hashed static assets
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
