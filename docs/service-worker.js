"use strict";

const CACHE_NAME = "catatan-keuangan-shell-v3";
const APP_BASE = self.registration.scope;
const APP_ROOT = new URL("./", APP_BASE).href;
const APP_SHELL = [
  APP_ROOT,
  new URL("manifest.webmanifest", APP_BASE).href,
  new URL("style.css", APP_BASE).href,
  new URL("app.js", APP_BASE).href,
  new URL("icon.svg", APP_BASE).href,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith("catatan-keuangan-shell-") && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )),
    self.clients.claim(),
  ]));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_ROOT, copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(APP_ROOT);
          if (cachedPage) {
            return cachedPage;
          }
          throw new Error("Halaman aplikasi tidak tersedia offline.");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => cachedResponse || fetch(request)),
  );
});
