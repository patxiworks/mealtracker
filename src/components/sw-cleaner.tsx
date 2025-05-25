'use client';

import { useEffect } from 'react';

export default function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const cleanUpServiceWorkers = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          // Unregister all except the current one
          if (registration.active?.scriptURL !== window.location.origin + '/service-worker.js') {
            await registration.unregister();
            console.log('Unregistered old service worker:', registration.scope);
          }
        }
      } catch (error) {
        console.error('Service worker cleanup failed:', error);
      }
    };

    cleanUpServiceWorkers();
  }, []);

  return null;
}