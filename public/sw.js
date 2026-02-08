const CACHE_NAME = 'openwatch-v1';

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => {
				return cache.addAll(['/', '/icon-192.png', '/icon-512.png', '/manifest.json']);
			})
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						return caches.delete(cacheName);
					}
				})
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	// Simple Network First strategy for now to avoid stale content issues without hash-versioning
	event.respondWith(
		fetch(event.request)
			.catch(() => {
				return caches.match(event.request);
			})
	);
});
