import { COLORS } from '@/constants/theme.js';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { usePremiumLimit } from '@/hooks/usePremiumLimit';

// AdMob'u güvenli şekilde import et
let AdMobBanner: any = null;
try {
  const adMobModule = require('expo-ads-admob');
  AdMobBanner = adMobModule.AdMobBanner;
} catch (error) {
  console.log('AdMob not available in Expo Go');
}

export default function TabLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const auth = getAuth();
  const { isPremium } = usePremiumLimit();

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
                } else if (route.name === 'profile') {
                  iconName = focused ? 'person' : 'person-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tabs.Screen name="index" options={{ title: 'Ana sayfa' }} />
            <Tabs.Screen name="medicines" options={{ title: 'İlaçlarım' }} />
            <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
          </Tabs>
        </View>
        {/* AdMob Banner - Premium kullanıcılarda gösterilmez */}
        {!isPremium && (
          <View style={{ position: 'absolute', bottom: 90, left: 0, right: 0 }}>
            {AdMobBanner ? (
              <AdMobBanner
                bannerSize="smartBannerPortrait"
                adUnitID="ca-app-pub-3940256099942544/6300978111" // TEST BANNER ID
                servePersonalizedAds={false}
                onDidFailToReceiveAdWithError={(err: any) => {
                  console.log('AdMob Test Banner error:', err);
                }}
                onAdViewDidReceiveAd={() => {
                  console.log('AdMob Test Banner loaded successfully!');
                }}
              />
            ) : (
              // Expo Go'da AdMob mevcut değilse placeholder göster (sadece free kullanıcılarda)
              <View style={{
                height: 50,
                backgroundColor: COLORS.lightGray,
                justifyContent: 'center',
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: COLORS.gray,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.gray
              }}>
                <Text style={{ color: COLORS.darkGray, fontSize: 12 }}>
                  📱 Banner Reklam Alanı
                </Text>
                <Text style={{ color: COLORS.gray, fontSize: 10 }}>
                  (Development Build'de gerçek reklam görünür)
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
