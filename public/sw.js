/* Mega.Market service worker - Web Push notifications for new orders */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }

  const title = data.title || "طلب جديد";
  const body = data.body || "وصلك طلب جديد";
  const orderId = data.orderId || null;
  const url = data.url || (orderId ? `/orders?order=${orderId}` : "/orders");

  event.waitUntil(
    (async () => {
      // Show the notification. tag = order id => the same order never duplicates,
      // a re-send just replaces the previous notification.
      await self.registration.showNotification(title, {
        body,
        tag: orderId ? `order-${orderId}` : "new-order",
        renotify: true,
        requireInteraction: true,
        vibrate: [250, 120, 250, 120, 400],
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        dir: "rtl",
        lang: "ar",
        data: { url },
      });

      // Tell open pages about it so the in-app poller doesn't notify twice
      try {
        const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        clients.forEach((c) => {
          try {
            c.postMessage({ type: "push-shown", orderId });
          } catch { /* ignore */ }
        });
      } catch { /* ignore */ }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/orders";

  event.waitUntil(
    (async () => {
      try {
        const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        for (const w of wins) {
          if ("focus" in w) {
            try {
              await w.focus();
            } catch { /* ignore */ }
            try {
              if ("navigate" in w) await w.navigate(url);
            } catch { /* ignore */ }
            return;
          }
        }
      } catch { /* ignore */ }
      try {
        await self.clients.openWindow(url);
      } catch { /* ignore */ }
    })()
  );
});
