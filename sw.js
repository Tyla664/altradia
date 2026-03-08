// sw.js - Service Worker for Push Notifications in TradeWatch

self.addEventListener('push', event => {
  let data = {
    title: 'TradeWatch Alert',
    body: 'Price target reached!'
  };

  try {
    data = event.data.json();
  } catch (e) {
    // If no JSON payload, use defaults
  }

  const options = {
    body: data.body || 'A price alert has triggered on your watchlist.',
    icon: '/icon-192.png',           // Optional: replace with your own 192x192 PNG if you add one later
    badge: '/icon-96.png',           // Optional: 96x96 badge icon
    vibrate: [200, 100, 200],        // Vibration pattern for mobile
    tag: 'tradewatch-alert-' + Date.now(), // Unique tag to prevent stacking same alert
    renotify: true                   // Bring attention even if notification exists
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

  // Open the app when user clicks the notification
  event.waitUntil(
    clients.openWindow('/')
  );
});