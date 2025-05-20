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
    //console.log(process.env.MESSAGING_APPLICATION_SERVER_KEY)
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: "BG2l6SHlAlY0y2-VScR3WEMuOgvZfoXrvqFTNMVqdSCh7I-fZN4LPezazfebEtmvmjDRc9QG6ItXhGVTuFwGhqY"
    }).then((subscription) => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          // Send the subscription back to the client
          client.postMessage({
            type: 'push-subscription',
            payload: {
              endpoint: subscription.endpoint,
              keys: subscription.toJSON().keys
            }
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
        //body: JSON.stringify(subscription),
        body: JSON.stringify({
          pushSubscription: subscription,
          userId: 'Patrick Enaholo'
        }),
      }).catch(error => {
        console.error('Error sending push subscription to server:', error);
      });
    }).catch(error => {
      console.error('Error subscribing for push notifications:', error);
    }); 
  }
})
// public/service-worker.js