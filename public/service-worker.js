// This service worker is used to manage push messages
self.addEventListener('push', (event) => {
  const title = 'New Notification';
  const body = 'You have a new notification!';
  event.waitUntil(
    self.registration.showNotification(title, { body })
  );
}); 

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'register-push') {
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: "BDXf9wP75wX-i6fH349g4v9xQ0sYp89l6_71pTqZcM4z289gR9Q84dD017e46Gq5lGzI804hF16r69G9tI"
    }).then((subscription) => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          // Send the subscription back to the client
          client.postMessage({
            type: 'push-subscription',
            payload: subscription
          });
        })
      })

      // Send the subscription to your server
      //fetch('/api/subscribe', {
      fetch('https://us-central1-mealtime-tracker.cloudfunctions.net/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      }).catch(error => {
        console.error('Error sending push subscription to server:', error);
      });
    }).catch(error => {
      console.error('Error subscribing for push notifications:', error);
    }); 
  }
})
// public/service-worker.js