import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCxwbY2GdDlmXubUkcauiHvtP1T9SQzphg",
  authDomain: "medicinetrackerapp-18a49.firebaseapp.com",
  projectId: "medicinetrackerapp-18a49",
  storageBucket: "medicinetrackerapp-18a49.appspot.com",
  messagingSenderId: "1088488586567",
  appId: "1:1088488586567:web:71fdb438848ad4132ed824"
};

// Firebase configuration check
const checkFirebaseConfig = () => {
  const apiKey = firebaseConfig.apiKey;
  if (!firebaseConfig.apiKey) {
    console.error('❌ Firebase API anahtarı eksik!');
    return false;
  }
  return true;
};

const configCheckResult = checkFirebaseConfig();

// Initialize Firebase App
let app;
let auth;
let db;

try {
  if (!configCheckResult) {
    throw new Error('Firebase configuration missing');
  }
  
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize Auth with persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (authError) {
    // Eğer auth zaten başlatılmışsa, mevcut olanı kullan
    if (authError.code === 'auth/already-initialized') {
      const { getAuth } = require('firebase/auth');
      auth = getAuth(app);
    } else {
      throw authError;
    }
  }

  // Initialize Firestore
  try {
    db = getFirestore(app);
  } catch (firestoreError) {
    throw firestoreError;
  }
  
} catch (error) {
  // Production'da crash yerine, hata objesi olarak tanımla
  app = null;
  auth = null;
  db = null;
  
  // Dev modda hataları yeniden fırlat
  if (__DEV__) {
    throw error;
  }
}
export { app, auth, db };
