import { auth, db } from '@/api/firebase';
import { LocalizationProvider, useLocalization } from '@/contexts/LocalizationContext';
import PermissionManager from '@/services/PermissionManager';
import PurchaseManager from '@/services/PurchaseManager';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { Auth } from 'firebase/auth';
import { onAuthStateChanged, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Console warning filtresi - RevenueCat ve Expo Notifications warning'larını engelle
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args.join(' ');
  // RevenueCat ve expo-notifications warning'larını filtrele
  if (message.includes('[RevenueCat]') || 
      message.includes('expo-notifications') || 
      message.includes('shouldShowAlert is deprecated')) {
    return; // Bu warning'ları gösterme
  }
  originalWarn(...args); // Diğer warning'ları normal göster
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Inner component that uses the localization context
function AppContent() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const navigationDone = useRef(false);
  const router = useRouter();
  const segments = useSegments();
  // Tip eklemesi
  const typedAuth: Auth | null = auth;
  const typedDb: Firestore | null = db;
  
  // Localization context'i kullan
  const { isLoading: languageLoading, t } = useLocalization();

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // Navigation guard reset - sadece user ID değiştiğinde
  useEffect(() => {
    navigationDone.current = false;
  }, [user?.uid]);

  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(typedAuth as Auth, async (user) => {
      
      setUser(user);
      
      if (user) {
        try {
          // RevenueCat'i initialize et ve kullanıcı login et
          const purchaseManager = PurchaseManager.getInstance();
          await purchaseManager.initialize();
          await purchaseManager.loginUser(user.uid);
          
          // En güncel durumu al
          await user.reload();
          
          let isEmailVerified = user.emailVerified;
          
          // Firestore'dan manuel doğrulama durumunu kontrol et
          try {
            const userDocRef = doc(typedDb as Firestore, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Manuel doğrulanmış kullanıcıları kontrol et - admin tarafından onaylanmış ve emailVerified true olmalı
              const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
              isEmailVerified = user.emailVerified || isManuallyVerified;
              
              // Log satırı kaldırıldı, anahtar-değerler gereksiz yere bırakılmadı.
            }
          } catch (firestoreReadError: any) {
            // Firestore okuma hatası, sadece Firebase Auth durumunu kullan
            isEmailVerified = user.emailVerified;
          }
          
          setEmailVerified(isEmailVerified);
          
          // Firestore'u senkronize et (sadece yazma işlemi başarısız olursa, okuma işlemi sonucunu koru)
          try {
            const userDocRef = doc(typedDb as Firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
              emailVerified: isEmailVerified,
              lastSeenAt: new Date()
            });
          } catch (updateError: any) {
            // Firestore güncelleme hatası, ama okuma başarılıysa email doğrulama durumunu koru
            // ...existing code...
          }
        } catch (error: any) {
          // Genel auth hatası
          // ...existing code...
          setEmailVerified(false);
        }
      } else {
        // RevenueCat logout
        try {
          const purchaseManager = PurchaseManager.getInstance();
          await purchaseManager.logoutUser();
        } catch (error) {
          // ...existing code...
        }
        setEmailVerified(false);
      }
      
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Sıralı permissions request - authenticated user için
  useEffect(() => {
    if (authReady && user && emailVerified) {
      const requestAllPermissionsSequentially = async () => {
        try {
          PermissionManager.setLocalizationContext({ t: t as (key: string) => string });
          
          // 1. Önce ATT permission status kontrol et ve gerekirse iste (iOS)
          if (Platform.OS === 'ios') {
            try {
              const { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } = await import('expo-tracking-transparency');
              
              // Önce mevcut status'ı kontrol et
              const { status: currentStatus } = await getTrackingPermissionsAsync();
              console.log('🔍 Current ATT status:', currentStatus);
              
              // Sadece henüz sorulmamışsa iste
              if (currentStatus === 'undetermined') {
                await requestTrackingPermissionsAsync();
                console.log('✅ ATT permission requested (was undetermined)');
              } else {
                console.log('ℹ️ ATT permission already determined:', currentStatus);
              }
            } catch (error) {
              console.error('ATT permission request failed:', error);
            }
          }
          
          // 2. ATT tamamlandıktan sonra notification permission iste
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms bekle
          await PermissionManager.requestNotificationPermissions();
          console.log('✅ Notification permission requested');
          
        } catch (error) {
          console.error('Sequential permissions request failed:', error);
        }
      };
      
      const timeoutId = setTimeout(requestAllPermissionsSequentially, 1000); // 1 saniye gecikme
      return () => clearTimeout(timeoutId);
    }
  }, [authReady, user, emailVerified, t]);

  // User değiştiğinde navigation guard'ı reset et
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const newUserId = user?.uid || null;
    if (currentUserId !== newUserId) {
      // Reset navigation guard for new user
      navigationDone.current = false;
      setCurrentUserId(newUserId);
    }
  }, [user?.uid, currentUserId]);

  // Effect for handling navigation after auth and fonts are ready
  useEffect(() => {
    if (!authReady || !fontsLoaded || languageLoading) return;

    if (fontError) {
      console.error('Font loading error:', fontError);
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
    
    // Log satırı kaldırıldı, anahtar-değerler gereksiz yere bırakılmadı.

    // Navigation guard - tek sefer yapılması için
    if (navigationDone.current) {
      // ...existing code...
      return;
    }

    // Timeout ile navigation'ı sarmalayalım
    const navigationTimeout = setTimeout(() => {
      // Double check navigation guard
      if (navigationDone.current) {
        // ...existing code...
        return;
      }

      // Navigation logic: Doğrulanmış kullanıcılar ana uygulamaya, diğerleri login'e
      if (user && emailVerified) { 
        // Kullanıcı giriş yapmış VE email doğrulanmış
        const isInTabs = segments.some(segment => segment === '(tabs)');
        
        if (!isInTabs) {
          // ...existing code...
          navigationDone.current = true; // Set BEFORE navigation to prevent loops
          router.replace('/(tabs)');
        } else {
          // ...existing code...
          navigationDone.current = true;
        }
      } else {
        // Kullanıcı giriş yapmamış VEYA email doğrulanmamış - login'e yönlendir
        if (!inAuthGroup) {
          // ...existing code...
          navigationDone.current = true; // Set BEFORE navigation to prevent loops
          router.replace('/login');
        } else {
          // ...existing code...
          navigationDone.current = true;
        }
      }
    }, 100); // 100ms timeout

    return () => clearTimeout(navigationTimeout);
  }, [authReady, fontsLoaded, languageLoading, user, emailVerified]); // languageLoading eklendi

  // Hide the splash screen once everything is ready.
  useEffect(() => {
    if (authReady && fontsLoaded && !languageLoading) {
      SplashScreen.hideAsync();
    }
  }, [authReady, fontsLoaded, languageLoading]);

  // While loading auth, fonts, or language, return null. The splash screen will be visible.
  if (!authReady || !fontsLoaded || languageLoading) {
    return null;
  }

  // Once everything is loaded, render the main navigation stack
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
    </>
  );
}

// Main root component that provides the localization context
export default function RootLayout() {
  return (
    <LocalizationProvider>
      <AppContent />
    </LocalizationProvider>
  );
}
