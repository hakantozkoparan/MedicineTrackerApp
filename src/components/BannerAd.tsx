import { COLORS } from '@/constants/theme';
import { usePremiumLimit } from '@/hooks/usePremiumLimit';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getAuth } from 'firebase/auth';

// Google Mobile Ads'ı güvenli şekilde import et
let GoogleBannerAd: any = null;
let BannerAdSize: any = null;
try {
  const googleAdsModule = require('react-native-google-mobile-ads');
  GoogleBannerAd = googleAdsModule.BannerAd;
  BannerAdSize = googleAdsModule.BannerAdSize;
} catch (error) {
  console.log('Google Mobile Ads not available in Expo Go');
}

interface BannerAdComponentProps {
  style?: any;
}

const BannerAdComponent: React.FC<BannerAdComponentProps> = ({ style }) => {
  const { isPremium } = usePremiumLimit();
  const [hasTrackingConsent, setHasTrackingConsent] = useState(false);
  const auth = getAuth();

  // Kullanıcının tracking consent'ini kontrol et
  useEffect(() => {
    const checkTrackingConsent = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('@/api/firebase');
          if (db) {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setHasTrackingConsent(userData.trackingConsent || false);
            }
          }
        }
      } catch (error) {
        console.error('Error checking tracking consent:', error);
        setHasTrackingConsent(false);
      }
    };

    checkTrackingConsent();
  }, [auth]);

  // Premium kullanıcılarda banner gösterme
  if (isPremium) {
    return null;
  }

  return (
    <View style={[{
      height: 50,
      backgroundColor: COLORS.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: COLORS.gray,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.gray
    }, style]}>
      {GoogleBannerAd ? (
        <GoogleBannerAd
          unitId="ca-app-pub-3940256099942544/6300978111" // Google Test Banner ID
          size={BannerAdSize.BANNER}
          requestOptions={{
            requestNonPersonalizedAdsOnly: !hasTrackingConsent, // Consent yoksa non-personalized ads
          }}
          onAdLoaded={() => {
            console.log('✅ Test Banner Ad loaded successfully!');
          }}
          onAdFailedToLoad={(error: any) => {
            console.log('❌ Test Banner Ad error:', error);
          }}
        />
      ) : (
        // Expo Go'da AdMob mevcut değilse placeholder göster
        <>
          <Text style={{ color: COLORS.darkGray, fontSize: 12 }}>
            📱 Banner Reklam Alanı
          </Text>
          <Text style={{ color: COLORS.gray, fontSize: 10 }}>
            (Development Build'de gerçek reklam görünür)
          </Text>
        </>
      )}
    </View>
  );
};

export default BannerAdComponent;
