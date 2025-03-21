const CACHE_NAME = 'ora-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './editor.html',
  './editor.js',
  './editor.css',
  './script.js',
  './style.css',
  './preview.html',
  './manifest.json',
  './ora.png',
  './'
];

// Install event - caching app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch event - serve from cache first, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});
