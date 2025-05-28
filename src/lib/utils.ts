import { clsx, type ClassValue } from "clsx"
import { Timestamp } from "firebase/firestore";
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
          console.log("Type: "+event.data.type);
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

export function formatDate(date: Date): string {
  const month = date.toLocaleString('default', { month: 'short' });
  const year = date.getFullYear();
  const time = date.toLocaleTimeString('default', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${month}, ${year} ${time}`;
}