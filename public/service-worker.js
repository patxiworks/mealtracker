self.addEventListener('push', (event) => {
  const title = 'New Notification';
  const body = 'You have a new notification!';
  event.waitUntil(
    self.registration.showNotification(title, { body })
  );
});
// public/service-worker.js