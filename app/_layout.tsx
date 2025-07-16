import { auth, db } from '@/api/firebase';
import { Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold, useFonts } from '@expo-google-fonts/poppins';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const navigationDone = useRef(false);
  const router = useRouter();
  const segments = useSegments();

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      
      setUser(user);
      
      if (user) {
        try {
          // En güncel durumu al
          await user.reload();
          
          let isEmailVerified = user.emailVerified;
          
          // Firestore'dan manuel doğrulama durumunu kontrol et
          try {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Manuel doğrulanmış kullanıcıları kontrol et - admin tarafından onaylanmış ve emailVerified true olmalı
              const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
              isEmailVerified = user.emailVerified || isManuallyVerified;
              
              console.log('🔍 Layout verification check:', {
                firebaseEmailVerified: user.emailVerified,
                firestoreEmailVerified: userData.emailVerified,
                manuallyVerified: isManuallyVerified,
                emailVerifiedBy: userData.emailVerifiedBy,
                emailVerifiedAt: userData.emailVerifiedAt,
                finalEmailVerified: isEmailVerified,
                userEmail: user.email
              });
            }
          } catch (firestoreReadError: any) {
            console.log('Firestore okuma hatası, Firebase Auth kullanılacak:', firestoreReadError);
            // Firestore okuma hatası, sadece Firebase Auth durumunu kullan
            isEmailVerified = user.emailVerified;
          }
          
          setEmailVerified(isEmailVerified);
          
          // Firestore'u senkronize et (sadece yazma işlemi başarısız olursa, okuma işlemi sonucunu koru)
          try {
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, {
              emailVerified: isEmailVerified,
              lastSeenAt: new Date()
            });
          } catch (updateError: any) {
            // Firestore güncelleme hatası, ama okuma başarılıysa email doğrulama durumunu koru
            console.log('Firestore güncelleme hatası (email durumu korunacak):', updateError);
          }
        } catch (error: any) {
          // Genel auth hatası
          console.log('Auth genel hatası:', error);
          setEmailVerified(false);
        }
      } else {
        setEmailVerified(false);
      }
      
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // User değiştiğinde navigation guard'ı reset et
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  useEffect(() => {
    const newUserId = user?.uid || null;
    if (currentUserId !== newUserId) {
      console.log('🔄 User changed, navigation guard reset:', { 
        oldUserId: currentUserId, 
        newUserId: newUserId,
        emailVerified: !!emailVerified
      });
      
      // Reset navigation guard for new user
      navigationDone.current = false;
      setCurrentUserId(newUserId);
    }
  }, [user?.uid, currentUserId]);

  // Effect for handling navigation after auth and fonts are ready
  useEffect(() => {
    if (!authReady || !fontsLoaded) return;

    if (fontError) {
      console.error('Font loading error:', fontError);
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';
    
    console.log('🧭 Navigation decision:', {
      user: !!user,
      emailVerified: !!emailVerified,
      inAuthGroup,
      currentSegments: segments,
      userEmail: user?.email,
      navigationDone: navigationDone.current
    });

    // Navigation guard - tek sefer yapılması için
    if (navigationDone.current) {
      console.log('🛑 Navigation already completed, skipping');
      return;
    }

    // Timeout ile navigation'ı sarmalayalım
    const navigationTimeout = setTimeout(() => {
      // Double check navigation guard
      if (navigationDone.current) {
        console.log('🛑 Navigation already done in timeout, skipping');
        return;
      }

      // Navigation logic: Doğrulanmış kullanıcılar ana uygulamaya, diğerleri login'e
      if (user && emailVerified) { 
        // Kullanıcı giriş yapmış VE email doğrulanmış
        const isInTabs = segments.some(segment => segment === '(tabs)');
        
        if (!isInTabs) {
          console.log('🚀 Navigating verified user to main app');
          navigationDone.current = true; // Set BEFORE navigation to prevent loops
          router.replace('/(tabs)');
        } else {
          console.log('✅ Verified user already in main app');
          navigationDone.current = true;
        }
      } else {
        // Kullanıcı giriş yapmamış VEYA email doğrulanmamış - login'e yönlendir
        if (!inAuthGroup) {
          console.log('❌ Redirecting to login (no verified user)');
          navigationDone.current = true; // Set BEFORE navigation to prevent loops
          router.replace('/login');
        } else {
          console.log('❌ Already on login page');
          navigationDone.current = true;
        }
      }
    }, 100); // 100ms timeout

    return () => clearTimeout(navigationTimeout);
  }, [authReady, fontsLoaded, user, emailVerified]); // segments kaldırıldı

  // Hide the splash screen once everything is ready.
  useEffect(() => {
    if (authReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [authReady, fontsLoaded]);

  // While loading auth and fonts, return null. The splash screen will be visible.
  if (!authReady || !fontsLoaded) {
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
