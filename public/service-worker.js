// This service worker is used to manage push messages
// It acts as an intermediary to receive push messages from the server (via Firebase), display notifications to the user, and manage the process of subscribing users to receive these notifications. 
// It also communicates the subscription details back to the client-side of the application so they can be sent to the backend.

// Import Firebase and Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.7.1/firebase-messaging-compat.js');

// Initialize Firebase (use your actual config)
const firebaseConfig = {
  apiKey: "AIzaSyA5f-G8LXvQtskk-wswEawmgHswkaw8TFA",
  projectId: "mealtime-tracker",
  messagingSenderId: "329350250908",
  appId: "1:329350250908:web:fb304732f6976a78fa4859"
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();


// self.addEventListener('push', (event) => {
//   console.log(e)
//   const title = 'New Notification';
//   const body = 'You have a new notification!';
//   event.waitUntil(
//     self.registration.showNotification(title, { body })
//   );
// }); 

// Message Listener for Push Subscription: Listens for message events. 
// When a message with the type 'register-push' is received (likely from the client-side of the application), it triggers the process of subscribing the user to push notifications
// self.addEventListener('message', (event) => {
//   console.log(event, 'listened to push subscription')
//   if (event.data && event.data.type === 'register-push') {
//     // Push Subscription: 
//     // Subscribes the user to push notifications. 
//     // It sets userVisibleOnly to true (meaning notifications will always be shown to the user) and provides an applicationServerKey. 
//     // This key is essential for identifying your application to the push service.
//     self.registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: "BG2l6SHlAlY0y2-VScR3WEMuOgvZfoXrvqFTNMVqdSCh7I-fZN4LPezazfebEtmvmjDRc9QG6ItXhGVTuFwGhqY"
//     }).then((subscription) => {
//       // Send the subscription to the client: 
//       // After a successful subscription, find all active clients (browser windows/tabs) and send a message back to them containing the subscription details (endpoint, keys, and date). 
//       // This allows the client-side code to then send this subscription information to the backend server.
//       self.clients.matchAll().then(clients => {
//         console.log(subscription, clients, 'sending to clients')
//         clients.forEach(client => {
//           // Send the subscription back to the client
//           client.postMessage({
//             type: 'push-subscription',
//             payload: {
//               endpoint: subscription.endpoint,
//               keys: subscription.toJSON().keys,
//               date: new Date()
//             }
//           });
//         })
//       })

//       // Send the subscription to your server
//       //fetch('/api/subscribe', {
//       fetch('https://us-central1-mealtime-tracker.cloudfunctions.net/subscribe', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         //body: JSON.stringify(subscription),
//         body: JSON.stringify({
//           pushSubscription: subscription,
//           userId: 'Patrick Enaholo'
//         }),
//       }).catch(error => {
//         console.error('Error sending push subscription to server:', error);
//       });
//     }).catch(error => {
//       console.error('Error subscribing for push notifications:', error);
//     }); 
//   }
// })

// Handle token refresh
// messaging.onTokenRefresh(() => {
//   messaging.getToken().then((refreshedToken) => {
//     console.log('Token refreshed: '+refreshedToken);

//     // Get the updated subscription
//     self.registration.pushManager.getSubscription().then(subscription => {
//       if (subscription) {
//         // Send the updated subscription to your backend
//         fetch('https://us-central1-mealtime-tracker.cloudfunctions.net/subscribe', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             pushSubscription: subscription, // Send the updated subscription
//             userId: 'Patrick Enaholo' // Make sure to include the user ID
//           }),
//         }).catch(error => {
//           console.error('Error sending refreshed subscription to server:', error);
//         });
//       }
//     });

//   }).catch((err) => {
//     console.error('Unable to retrieve refreshed token ', err);
//   });
// });

messaging.onMessage((payload) => {
  console.log('[SW] Received message', payload)
  alert('Please tick for the next two days (at least)!')
});

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Received background message', payload);
  // Customize notification
  const notificationTitle = payload.notification?.title || 'Mealtracker Reminder';
  const notificationOptions = {
    body: payload.notification?.body || 'Please tick for the next two days',
    icon: '/mealtracker.png',
    //data: { url: payload.data?.url } // For handling clicks
  };
  
  self.registration.showNotification(notificationTitle, notificationOptions);
});