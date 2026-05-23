// Firebase Messaging — handles background push when app tab is closed or hidden
importScripts("https://www.gstatic.com/firebasejs/10.7.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC_5ZamGzFwZcVJFQn_pLwpUtfinWp_2_U",
  authDomain: "tfc-orders-tracker.firebaseapp.com",
  projectId: "tfc-orders-tracker",
  storageBucket: "tfc-orders-tracker.firebasestorage.app",
  messagingSenderId: "676492094770",
  appId: "1:676492094770:web:53d93adfdcc9ff6301bb2b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  // Read from webpush.notification (via payload.notification) first, fall back to data fields
  const title = payload.notification?.title || payload.data?.title || "TFC Orders";
  const body  = payload.notification?.body  || payload.data?.body  || "";
  // Use unique tag so rapid-fire notifications don't collapse into one
  const tag   = payload.data?.tag || payload.notification?.tag || ("tfc-" + Date.now());
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag,
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: { url: "/" },
  });
});

// Tap notification → open / focus the app
self.addEventListener("notificationclick", function(e) {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function(cs) {
      for (const c of cs) {
        if (c.url.includes(self.location.origin) && "focus" in c) return c.focus();
      }
      return clients.openWindow("/");
    })
  );
});

// ─── Asset caching ───────────────────────────────────────────────────────────
const CACHE = "tfc-v7";
// Only precache the small icon — the 512px one is for WebAPK/homescreen only,
// no need to download it in the SW install step.
const PRECACHE = ["/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("google.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("identitytoolkit") ||
    url.hostname.includes("securetoken")
  ) {
    return;
  }

  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  if (url.pathname.match(/\/static\/.+\.(js|css|woff2?)$/)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }))
    );
    return;
  }
});
