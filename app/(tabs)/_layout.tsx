import { COLORS } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Kullanıcı var, email doğrulanmış mı kontrol et
        await user.reload();
        
        let isEmailVerified = user.emailVerified;
        
        // Firestore'dan manuel doğrulama durumunu kontrol et
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/api/firebase');
          
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Manuel doğrulanmış kullanıcıları kontrol et
            const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
            isEmailVerified = user.emailVerified || isManuallyVerified;
            
            console.log('📱 Tabs layout verification check:', {
              firebaseEmailVerified: user.emailVerified,
              firestoreEmailVerified: userData.emailVerified,
              manuallyVerified: isManuallyVerified,
              finalEmailVerified: isEmailVerified,
              userEmail: user.email
            });
          }
        } catch (firestoreError) {
          console.log('Tabs layout Firestore okuma hatası, Firebase Auth kullanılacak:', firestoreError);
          // Firestore okuma hatası, sadece Firebase Auth durumunu kullan
          isEmailVerified = user.emailVerified;
        }
        
        if (isEmailVerified) {
          setIsAuthenticated(true);
        } else {
          // Email doğrulanmamış, login'e yönlendir
          console.log('📱 Tabs: Email not verified, redirecting to login');
          setIsAuthenticated(false);
          router.replace('/login');
        }
      } else {
        // Kullanıcı yok, login'e yönlendir
        console.log('📱 Tabs: No user, redirecting to login');
        setIsAuthenticated(false);
        router.replace('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Loading göster
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Authenticate olmamışsa boş döndür (zaten yönlendirme yapıldı)
  if (!isAuthenticated) {
    return null;
  }
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Tabs
        screenOptions={({ route }) => ({
          // Hide all headers by default, we will use custom ones
          headerShown: false, 
          
          tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.darkGray,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.lightGray,
          height: 90,
          paddingBottom: 30,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-SemiBold',
          fontSize: 12,
        },
        tabBarIcon: ({ color, size, focused }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'] = 'alert-circle-outline';
          if (route.name === 'index') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'medicines') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
        title: 'Ana sayfa'  // No options needed here as header is hidden globally
        }}
      />
      <Tabs.Screen
        name="medicines"
        options={{
          // We need to define the title for the tab bar label
          title: 'İlaçlarım',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          // We need to define the title for the tab bar label
          title: 'Profil',
        }}
      />
    </Tabs>
    </>
  );
}
