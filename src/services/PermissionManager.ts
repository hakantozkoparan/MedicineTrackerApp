import * as Notifications from 'expo-notifications';
import { getTrackingPermissionsAsync, requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import { Platform } from 'react-native';

// Notifications konfigürasyonu
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface LocalizationContext {
  t: (key: string) => string;
}

class PermissionManager {
  private static localizationContext: LocalizationContext | null = null;

  // Localization context'i set et
  static setLocalizationContext(context: LocalizationContext) {
    this.localizationContext = context;
  }

  // Localized string al
  private static getLocalizedString(key: string, fallback: string): string {
    if (this.localizationContext) {
      return this.localizationContext.t(key);
    }
    return fallback;
  }

  // Push notification izni iste
  static async requestNotificationPermissions() {
    try {
      if (Platform.OS === 'ios') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          console.log('✅ Notification permission granted');
          return true;
        } else {
          console.log('❌ Notification permission denied');
          return false;
        }
      }
      return true; // Android için otomatik true
    } catch (error) {
      console.error('Notification permission error:', error);
      return false;
    }
  }

  // App tracking transparency izni iste (iOS 14.5+)
  static async requestTrackingPermission() {
    try {
      if (Platform.OS === 'ios') {
        const { status: existingStatus } = await getTrackingPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await requestTrackingPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus === 'granted') {
          console.log('✅ Tracking permission granted');
          return true;
        } else {
          console.log('❌ Tracking permission denied');
          return false;
        }
      }
      return true; // Android için otomatik true
    } catch (error) {
      console.error('Tracking permission error:', error);
      return false;
    }
  }

  // Tüm izinleri sırayla iste - sadece consent vermiş kullanıcılar için tracking
  static async requestAllPermissions(userTrackingConsent = false) {
    try {
      console.log('🔔 Requesting permissions...');
      
      // Önce notification izni
      const notificationGranted = await this.requestNotificationPermissions();
      
      // Tracking izni sadece kullanıcı consent vermişse iste
      let trackingGranted = true; // Default true, çünkü consent yoksa tracking yok
      if (userTrackingConsent) {
        trackingGranted = await this.requestTrackingPermission();
      } else {
        console.log('⏭️ Tracking permission skipped - user did not consent');
      }
      
      console.log('📋 Permission results:', {
        notifications: notificationGranted,
        tracking: trackingGranted
      });
      
      return {
        notifications: notificationGranted,
        tracking: trackingGranted
      };
    } catch (error) {
      console.error('Permission request error:', error);
      return {
        notifications: false,
        tracking: false
      };
    }
  }

  // İzin durumlarını kontrol et
  static async checkPermissions() {
    try {
      const notificationStatus = await Notifications.getPermissionsAsync();
      let trackingStatus = { status: 'granted' };
      
      if (Platform.OS === 'ios') {
        trackingStatus = await getTrackingPermissionsAsync();
      }
      
      return {
        notifications: notificationStatus.status === 'granted',
        tracking: trackingStatus.status === 'granted'
      };
    } catch (error) {
      console.error('Permission check error:', error);
      return {
        notifications: false,
        tracking: false
      };
    }
  }
}

export default PermissionManager;
