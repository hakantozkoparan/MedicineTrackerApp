import { useEffect, useState } from 'react';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SplashScreen, useRouter, Stack, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/api/firebase';
import ScreenHeader from '@/components/ScreenHeader';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '@/constants/theme';

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

    if (fontError) {
      console.error('Font loading error:', fontError);
      // You might want to show a user-facing error message here
    }

    const inAuthGroup = segments[0] === 'login' || segments[0] === 'register';

    if (user && inAuthGroup) {
      // User is logged in but on an auth screen, redirect to home.
      router.replace('/(tabs)');
    } else if (!user && !inAuthGroup) {
      // User is not logged in and not on an auth screen, redirect to login.
      router.replace('/login');
    }

    // Hide the splash screen once everything is ready.
    SplashScreen.hideAsync();

  }, [user, authReady, fontsLoaded, segments, fontError, router]);

  // While loading auth and fonts, return null. The splash screen will be visible.
  if (!authReady || !fontsLoaded) {
    return null;
  }

  // Once everything is loaded, render the main navigation stack
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen
        name="add-medicine"
        options={{
          presentation: 'modal',
          headerShown: true,
          title: 'Yeni İlaç Ekle',
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTitleStyle: {
            fontFamily: FONTS.bold,
            color: COLORS.primary,
            fontSize: SIZES.large,
          },
          headerTintColor: COLORS.primary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: SIZES.base }}>
              <MaterialCommunityIcons name="arrow-left" size={28} color={COLORS.primary} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
