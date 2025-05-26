import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../lib/firebase/firebase'; // Your Firebase config

export default function useFCM(username: string | null) {
  useEffect(() => {
    if (!username) return;
    console.log(username)

    const setupFCM = async () => {
      try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {

          // Get existing registration first
          let registration = await navigator.serviceWorker.getRegistration('/');

          // Register only if not already exists
          if (!registration) {
            registration = await navigator.serviceWorker.register('/service-worker.js', {
              scope: '/'
            });
          }
          console.log(username)
          // Initiate the messaging variable
          const messaging = getMessaging(app);
          
          // Request notification permission
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            console.log('Notification permission granted.')
            const currentToken = await getToken(messaging, { 
              vapidKey: "BG2l6SHlAlY0y2-VScR3WEMuOgvZfoXrvqFTNMVqdSCh7I-fZN4LPezazfebEtmvmjDRc9QG6ItXhGVTuFwGhqY",
              serviceWorkerRegistration: registration
            });
            
            if (currentToken) {
              console.log(currentToken)
              // Send token to your backend
              await fetch('https://us-central1-mealtime-tracker.cloudfunctions.net/subscribe', {
                method: 'POST',
                body: JSON.stringify({ 
                    pushSubscription: currentToken,
                    userId: username
                }),
                headers: {
                  'Content-Type': 'application/json'
                }
              });
            }

            // Handle incoming messages
            //onMessage(messaging, (payload) => {
              //console.log('Message received:', payload);
              // Display notification or update UI
            //});
          } else {
            console.log('Notification permission denied.');
            console.log(permission)
          }
        }
      } catch (error) {
        console.error('FCM error:', error);
      }
    };

    setupFCM();
  }, [username]);
}