// config/firebase.js - Enhanced with initialization checks
import { getApps, initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence, getAuth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDtqRBueOvvlQWwp1RHzaOttym6J8N35t0",
  authDomain: "teddys-cleaning-app.firebaseapp.com",
  projectId: "teddys-cleaning-app",
  storageBucket: "teddys-cleaning-app.firebasestorage.app",
  messagingSenderId: "850328543204",
  appId: "1:850328543204:web:4cda1fff092e047a75b1f1"
};

let app;
let auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Firebase initialized successfully');
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    console.log('✅ Firebase app already initialized');
  }
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.error('🔧 Check the following:');
  console.error('  - Verify firebaseConfig object is correct');
  console.error('  - Ensure google-services.json is in android/app/ for FCM');
  console.error('  - Check that all Firebase dependencies are installed');
  throw error;
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);

// Import and run initialization check in development
if (__DEV__) {
  import('../utils/firebaseInit').then(({ logFirebaseStatus }) => {
    logFirebaseStatus();
  }).catch(() => {
    // Ignore import errors in case utils don't exist yet
  });
}