import { COLORS } from '@/constants/theme';
import { usePremiumLimit } from '@/hooks/usePremiumLimit';
import React from 'react';
import { Text, View } from 'react-native';

// AdMob'u güvenli şekilde import et
let AdMobBanner: any = null;
try {
  const adMobModule = require('expo-ads-admob');
  AdMobBanner = adMobModule.AdMobBanner;
} catch (error) {
  console.log('AdMob not available in Expo Go');
}

interface BannerAdProps {
  style?: any;
}

const BannerAd: React.FC<BannerAdProps> = ({ style }) => {
  const { isPremium } = usePremiumLimit();

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
      {AdMobBanner ? (
        <AdMobBanner
          bannerSize="smartBannerPortrait"
          adUnitID="ca-app-pub-3940256099942544/6300978111" // TEST BANNER ID
          servePersonalizedAds={false}
          onDidFailToReceiveAdWithError={(err: any) => {
            console.log('AdMob Banner error:', err);
          }}
          onAdViewDidReceiveAd={() => {
            console.log('AdMob Banner loaded successfully!');
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

export default BannerAd;
