// Kill stale service worker — unregisters itself immediately
// This file exists to remove any previously cached service worker
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => {
  self.registration
    .unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
});
