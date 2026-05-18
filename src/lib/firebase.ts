import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  doc, 
  getDocFromServer, 
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore instead of getFirestore to enable long-polling
// This is often required for connectivity in restricted iframe environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Connectivity Test
async function testConnection() {
  try {
    // Try to fetch a dummy doc from server to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connected successfully.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline') || error.message.includes('unavailable')) {
        console.error("Firebase Connectivity Error: The Firestore backend is unavailable. This may be due to browser restrictions in the iframe or an invalid configuration.", error);
      }
    }
  }
}

testConnection();

// Analytics is only available in browser environments
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
