import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
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
  if (!apiKey) {
    console.error('❌ Firebase API anahtarı eksik!');
    return false;
  }
  console.log('✅ Firebase API anahtarı mevcut');
  return true;
};

const configCheckResult = checkFirebaseConfig();

console.log('🔧 Firebase konfigürasyonu:', {
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyStart: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 5)}...` : 'yok',
  projectId: firebaseConfig.projectId,
  environment: __DEV__ ? 'development' : 'production',
  expoConstantsAvailable: !!Constants?.expoConfig,
  appVersion: Constants?.expoConfig?.version || 'bilinmiyor',
  buildProfile: Constants?.expoConfig?.extra?.eas?.buildProfile || 'bilinmiyor'
});

// Initialize Firebase App
let app;
let auth;
let db;

try {
  if (!configCheckResult) {
    throw new Error('Firebase configuration missing');
  }
  
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  console.log('✅ Firebase app başlatıldı');
  
  // Initialize Auth with persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
    console.log('✅ Firebase auth başlatıldı');
  } catch (authError) {
    console.error('❌ Firebase auth başlatma hatası:', authError);
    // Eğer auth zaten başlatılmışsa, mevcut olanı kullan
    if (authError.code === 'auth/already-initialized') {
      const { getAuth } = require('firebase/auth');
      auth = getAuth(app);
      console.log('✅ Mevcut Firebase auth kullanılıyor');
    } else {
      throw authError;
    }
  }

  // Initialize Firestore
  try {
    db = getFirestore(app);
    console.log('✅ Firestore başlatıldı');
  } catch (firestoreError) {
    console.error('❌ Firestore başlatma hatası:', firestoreError);
    throw firestoreError;
  }
  
} catch (error) {
  console.error('❌ Firebase servisleri başlatılamadı:', error);
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
