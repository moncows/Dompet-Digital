import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

function readFirebaseConfig(): FirebaseOptions | null {
  const {
    VITE_FIREBASE_API_KEY,
    VITE_FIREBASE_AUTH_DOMAIN,
    VITE_FIREBASE_PROJECT_ID,
    VITE_FIREBASE_STORAGE_BUCKET,
    VITE_FIREBASE_MESSAGING_SENDER_ID,
    VITE_FIREBASE_APP_ID,
    VITE_FIREBASE_MEASUREMENT_ID,
  } = import.meta.env;

  if (
    !VITE_FIREBASE_API_KEY ||
    !VITE_FIREBASE_AUTH_DOMAIN ||
    !VITE_FIREBASE_PROJECT_ID ||
    !VITE_FIREBASE_STORAGE_BUCKET ||
    !VITE_FIREBASE_MESSAGING_SENDER_ID ||
    !VITE_FIREBASE_APP_ID
  ) {
    return null;
  }

  return {
    apiKey: VITE_FIREBASE_API_KEY,
    authDomain: VITE_FIREBASE_AUTH_DOMAIN,
    projectId: VITE_FIREBASE_PROJECT_ID,
    storageBucket: VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: VITE_FIREBASE_APP_ID,
    measurementId: VITE_FIREBASE_MEASUREMENT_ID,
  };
}

const firebaseConfig = readFirebaseConfig();

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;

export function isFirebaseConfigured() {
  return Boolean(firebaseConfig);
}

export function getFirebaseAppInstance() {
  if (!firebaseConfig) {
    return null;
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return firebaseApp;
}

export function getFirebaseAuthInstance() {
  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  if (!firebaseAuth) {
    firebaseAuth = getAuth(app);
  }

  return firebaseAuth;
}

export function getFirestoreInstance() {
  const app = getFirebaseAppInstance();
  if (!app) {
    return null;
  }

  if (!firestoreDb) {
    firestoreDb = getFirestore(app);
  }

  return firestoreDb;
}
