'use client'

import { useEffect } from 'react';

export function RegisterSW() {
    useEffect(() => {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker
            //.register('/service-worker.js')
            .register('/api/sw', { scope: '/' })
            .then(
              function (registration) {
                console.log("Service Worker registration successful with scope: ", registration.scope);
              },
              function (err) {
                console.log("Service Worker registration failed: ", err);
              }
            );
        }
      }, []);

      return null
}