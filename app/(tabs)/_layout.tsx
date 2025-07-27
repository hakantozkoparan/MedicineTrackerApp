import BannerAd from '@/components/BannerAd';
import { COLORS } from '@/constants/theme.js';
import { useLocalization } from '@/hooks/useLocalization';
import { usePremiumLimit } from '@/hooks/usePremiumLimit';
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
  const { isPremium } = usePremiumLimit();
  const { t, currentLanguage, languageVersion } = useLocalization();

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
          if (db) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Manuel doğrulanmış kullanıcıları kontrol et
              const isManuallyVerified = userData.emailVerifiedBy === 'admin' && userData.emailVerifiedAt && userData.emailVerified === true;
              isEmailVerified = user.emailVerified || isManuallyVerified;
            }
          }
        } catch (firestoreError) {
          // Firestore okuma hatası, sadece Firebase Auth durumunu kullan
          isEmailVerified = user.emailVerified;
        }
        
        if (isEmailVerified) {
          setIsAuthenticated(true);
        } else {
          // Email doğrulanmamış, login'e yönlendir
          setIsAuthenticated(false);
          router.replace('/login');
        }
      } else {
        // Kullanıcı yok, login'e yönlendir
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: 50 }}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <View style={{ flex: 1 }}>
        {/* Sayfa içerikleri */}
        <View style={{ flex: 1 }}>
          <Tabs
            key={`${currentLanguage}-${languageVersion}`} // Dil değiştiğinde tüm tabları yeniden render et
            screenOptions={({ route }) => ({
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
                } else if (route.name === 'ai-chat') {
                  iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
                } else if (route.name === 'profile') {
                  iconName = focused ? 'person' : 'person-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tabs.Screen name="index" options={{ title: t('home') }} />
            <Tabs.Screen name="medicines" options={{ title: t('medicines') }} />
            <Tabs.Screen name="ai-chat" options={{ title: t('aiChat') }} />
            <Tabs.Screen name="profile" options={{ title: t('profile') }} />
          </Tabs>
        </View>
        {/* Banner Reklam - Premium kullanıcılarda gösterilmez */}
        {!isPremium && (
          <View style={{ position: 'absolute', bottom: 90, left: 0, right: 0 }}>
            <BannerAd />
          </View>
        )}
      </View>
    </View>
  );
}
