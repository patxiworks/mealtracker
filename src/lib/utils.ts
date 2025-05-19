import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function registerForPushNotifications() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      if (registration.active) {
        registration.active.postMessage({ type: 'register-push' });

        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data.type === 'push-subscription') {
            console.log("push subscription:", event.data.subscription);
          }
        });
      }
      
    }).catch(error => {
      console.error("Error registering for push notifications:", error);
    });
  }
}
