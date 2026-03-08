// sw.js - Service Worker for TradeWatch Push Notifications

self.addEventListener('push', event => {
  let data = {
    title: 'TradeWatch Alert',
    body: 'Price target reached!'
  };

  try {
    data = event.data.json();
  } catch (e) {
    // fallback to defaults if no JSON payload
  }

  const options = {
    body: data.body || 'A price alert has triggered on your watchlist.',
    icon: '/icon-192.png',          // optional – add your icon later
    badge: '/icon-96.png',          // optional
    vibrate: [200, 100, 200],
    tag: 'tradewatch-alert-' + Date.now(),
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'TradeWatch Alert',
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});