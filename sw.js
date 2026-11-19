'use strict';

const scope = self.registration.scope;
const cachePrefix = `puttakt:${scope}:`;
// Bump the version when publishing changes to the precached app or icons.
const cacheName = `${cachePrefix}1`;
const entry = new URL('index.html', scope).href;
const appFiles = [entry, ...['manifest.webmanifest', 'icon-192.png', 'icon-512.png'].map((file) => new URL(file, scope).href)];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(appFiles.map((url) => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const outdated = keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName);
    await Promise.all(outdated.map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function offlineFirst(file, request) {
  const cache = await caches.open(cacheName);
  const stored = await cache.match(file);
  if (stored) return stored;
  const response = await fetch(request);
  if (response.ok) await cache.put(file, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  url.search = '';
  if (request.mode === 'navigate' && (url.href === scope || url.href === entry)) {
    event.respondWith(offlineFirst(entry, request));
  } else if (appFiles.includes(url.href)) {
    event.respondWith(offlineFirst(url.href, request));
  }
});
