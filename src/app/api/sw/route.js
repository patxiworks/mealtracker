import { NextResponse } from 'next/server';

export const dynamic = 'force-static'; // Ensure this is treated as static

export function GET() {
  const serviceWorkerContent = `
// Import Firebase and Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase (use your actual config)
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();


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
          console.log(subscription)
          // Send the subscription back to the client
          client.postMessage({
            type: 'push-subscription',
            payload: {
              endpoint: subscription.endpoint,
              keys: subscription.toJSON().keys,
              date: new Date()
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

// Handle token refresh
messaging.onTokenRefresh(() => {
  messaging.getToken().then((refreshedToken) => {
    console.log('Token refreshed: '+refreshedToken);

    // Get the updated subscription
    self.registration.pushManager.getSubscription().then(subscription => {
      if (subscription) {
        // Send the updated subscription to your backend
        fetch('https://us-central1-mealtime-tracker.cloudfunctions.net/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pushSubscription: subscription, // Send the updated subscription
            userId: 'Patrick Enaholo' // Make sure to include the user ID
          }),
        }).catch(error => {
          console.error('Error sending refreshed subscription to server:', error);
        });
      }
    });

  }).catch((err) => {
    console.error('Unable to retrieve refreshed token ', err);
  });
});
  `;

  return new NextResponse(serviceWorkerContent, {
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/'
    }
  });
}