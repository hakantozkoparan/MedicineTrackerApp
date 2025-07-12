import { useEffect, useState } from 'react';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SplashScreen, useRouter, Stack, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/api/firebase';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);
  // Correctly type the user state
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // Effect for handling authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthReady(true);
    });
    return unsubscribe;
  }, []);

  // Effect for handling navigation after auth and fonts are ready
  useEffect(() => {
    if (!authReady || !fontsLoaded) return;

    // Check if the current route is inside the main app (tabs group)
    const inTabsGroup = segments[0] === '(tabs)';

    if (fontError) {
      console.error('Font loading error:', fontError);
    }

    // Navigation logic
    if (user && !inTabsGroup) {
      // User is authenticated but not in the main app area, redirect to home.
      router.replace('/(tabs)');
    } else if (!user && inTabsGroup) {
      // User is not authenticated but is in the main app area, redirect to login.
      router.replace('/login');
    } else if (!user && !inTabsGroup) {
      // A failsafe for when the user is not logged in and not on a specific auth screen.
      // This can happen on initial load before navigation is fully resolved.
      // We ensure they are on the login screen.
      if (segments[0] !== 'login' && segments[0] !== 'register') {
        router.replace('/login');
      }
    }

    // Hide the splash screen once everything is ready and navigation has been handled.
    SplashScreen.hideAsync();

  }, [user, authReady, fontsLoaded, segments, fontError]);

  // While loading auth and fonts, return null. The splash screen will be visible.
  if (!authReady || !fontsLoaded) {
    return null;
  }

  // Once everything is loaded, render the main navigation stack
  return <Stack screenOptions={{ headerShown: false }} />;
}
