import { COLORS } from '@/constants/theme';
import { usePremiumLimit } from '@/hooks/usePremiumLimit';
import React, { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';

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

  // ATT permission durumunu kontrol et
  useEffect(() => {
    const checkTrackingPermission = async () => {
      try {
        // iOS'ta ATT permission status'ını kontrol et
        if (Platform.OS === 'ios') {
          const { getTrackingPermissionsAsync } = await import('expo-tracking-transparency');
          const { status } = await getTrackingPermissionsAsync();
          setHasTrackingConsent(status === 'granted');
        } else {
          // Android'de tracking her zaman izinli
          setHasTrackingConsent(true);
        }
      } catch (error) {
        console.error('Error checking tracking permission:', error);
        setHasTrackingConsent(false);
      }
    };

    checkTrackingPermission();
  }, []);

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
