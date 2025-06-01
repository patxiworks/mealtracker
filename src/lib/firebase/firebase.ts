// Import the functions you need from the SDKs you need
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined = undefined;
let db: Firestore;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error(
    "Firebase Core Configuration Error: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing. " +
    "Firebase will not be initialized. Please set these in your environment variables or .env file."
  );
} else {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    // Enable offline persistence only in the browser and if db is successfully initialized
    if (typeof window !== 'undefined' && db) {
      enableIndexedDbPersistence(db)
        .catch((err: any) => { // Added :any to err type for err.code
          if (err.code === 'failed-precondition') {
            // This can happen if multiple tabs are open, persistence can only be enabled in one.
            console.warn('Firebase offline persistence: Failed to acquire lock. This usually means another tab has it. Offline features might be limited.');
          } else if (err.code === 'unimplemented') {
            // The current browser does not support IndexedDB or it's disabled.
            console.warn('Firebase offline persistence: The browser environment does not support IndexedDB. Offline features will not be available.');
          } else {
            console.error("Firebase offline persistence: An unexpected error occurred:", err);
          }
        });
    }
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    // app and db will remain undefined, functions using them should handle this.
  }
}

export { app, db };
