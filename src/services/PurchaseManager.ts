import { auth } from '@/api/firebase';
import { Alert, Platform } from 'react-native';
import Purchases, {
    CustomerInfo,
    PURCHASES_ERROR_CODE
} from 'react-native-purchases';

// RevenueCat API anahtarları - gerçek anahtarları buraya ekleyeceğiz
const REVENUECAT_APPLE_API_KEY = 'appl_YOUR_API_KEY_HERE';
const REVENUECAT_GOOGLE_API_KEY = 'goog_YOUR_API_KEY_HERE';

export interface SubscriptionPackage {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    description: string;
    price: number;
    priceString: string;
    currencyCode: string;
  };
  localizedPriceString: string;
  localizedIntroductoryPriceString?: string;
}

export interface PremiumStatus {
  isPremium: boolean;
  expirationDate?: Date;
  activeSubscriptions: string[];
  originalAppUserId: string;
}

class PurchaseManager {
  private static instance: PurchaseManager;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): PurchaseManager {
    if (!PurchaseManager.instance) {
      PurchaseManager.instance = new PurchaseManager();
    }
    return PurchaseManager.instance;
  }

  // RevenueCat'i başlat
  async initialize(): Promise<boolean> {
    try {
      if (this.isInitialized) {
        return true;
      }

      // Platform'a göre API anahtarı seç
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_API_KEY : REVENUECAT_GOOGLE_API_KEY;
      
      await Purchases.configure({ apiKey });

      // Kullanıcı giriş yapmışsa kullanıcı ID'sini ayarla
      const user = auth.currentUser;
      if (user) {
        await Purchases.logIn(user.uid);
      }

      this.isInitialized = true;
      console.log('✅ RevenueCat başarıyla başlatıldı');
      return true;

    } catch (error) {
      console.error('❌ RevenueCat başlatma hatası:', error);
      return false;
    }
  }

  // Kullanıcı giriş yaptığında çağrılacak
  async loginUser(userId: string): Promise<void> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      await Purchases.logIn(userId);
      console.log('✅ RevenueCat kullanıcı girişi:', userId);
    } catch (error) {
      console.error('❌ RevenueCat kullanıcı giriş hatası:', error);
    }
  }

  // Kullanıcı çıkış yaptığında çağrılacak
  async logoutUser(): Promise<void> {
    try {
      await Purchases.logOut();
      console.log('✅ RevenueCat kullanıcı çıkışı');
    } catch (error) {
      console.error('❌ RevenueCat kullanıcı çıkış hatası:', error);
    }
  }

  // Mevcut abonelik paketlerini getir
  async getAvailablePackages(): Promise<SubscriptionPackage[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering) {
        console.warn('⚠️ Aktif abonelik teklifi bulunamadı');
        return [];
      }

      const packages: SubscriptionPackage[] = [];
      
      // Paketleri sırala: Aylık, 3 Aylık, 6 Aylık, Yıllık
      const packageOrder = ['monthly', 'three_month', 'six_month', 'annual'];
      
      packageOrder.forEach(packageType => {
        const pkg = currentOffering.availablePackages.find(p => 
          p.packageType === packageType || 
          p.identifier.toLowerCase().includes(packageType.replace('_', ''))
        );
        
        if (pkg) {
          packages.push({
            identifier: pkg.identifier,
            packageType: pkg.packageType,
            product: {
              identifier: pkg.product.identifier,
              title: pkg.product.title,
              description: pkg.product.description,
              price: pkg.product.price,
              priceString: pkg.product.priceString,
              currencyCode: pkg.product.currencyCode,
            },
            localizedPriceString: pkg.product.priceString,
            localizedIntroductoryPriceString: undefined,
          });
        }
      });

      return packages;

    } catch (error) {
      console.error('❌ Abonelik paketleri alma hatası:', error);
      return [];
    }
  }

  // Abonelik satın al
  async purchaseSubscription(packageToPurchase: SubscriptionPackage): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Paket nesnesini oluştur (RevenueCat formatında)
      const offerings = await Purchases.getOfferings();
      const currentOffering = offerings.current;
      
      if (!currentOffering) {
        throw new Error('Aktif abonelik teklifi bulunamadı');
      }

      const packageObj = currentOffering.availablePackages.find(
        p => p.identifier === packageToPurchase.identifier
      );

      if (!packageObj) {
        throw new Error('Seçili paket bulunamadı');
      }

      const { customerInfo } = await Purchases.purchasePackage(packageObj);
      
      // Satın alma başarılı mı kontrol et
      const isPremium = this.checkPremiumStatus(customerInfo).isPremium;
      
      if (isPremium) {
        console.log('✅ Abonelik başarıyla satın alındı');
        return true;
      } else {
        console.warn('⚠️ Satın alma tamamlandı ama premium durumu aktif değil');
        return false;
      }

    } catch (error: any) {
      console.error('❌ Satın alma hatası:', error);
      
      if (error?.code) {
        switch (error.code) {
          case PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR:
            // Kullanıcı satın almayı iptal etti, hata gösterme
            return false;
          case PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR:
            Alert.alert(
              'Ödeme Beklemede',
              'Ödemeniz işlem görmeyi bekliyor. Onaylandığında premium özellikleriniz aktif olacak.'
            );
            return false;
          case PURCHASES_ERROR_CODE.PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR:
            Alert.alert(
              'Ürün Mevcut Değil',
              'Bu abonelik şu anda satın alınamıyor. Lütfen daha sonra tekrar deneyin.'
            );
            return false;
          default:
            Alert.alert(
              'Satın Alma Hatası',
              'Abonelik satın alınırken bir hata oluştu. Lütfen tekrar deneyin.'
            );
            return false;
        }
      } else {
        Alert.alert(
          'Beklenmeyen Hata',
          'Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.'
        );
        return false;
      }
    }
  }

  // Premium durumunu kontrol et
  async getCurrentPremiumStatus(): Promise<PremiumStatus> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const customerInfo = await Purchases.getCustomerInfo();
      return this.checkPremiumStatus(customerInfo);

    } catch (error) {
      console.error('❌ Premium durum kontrolü hatası:', error);
      return {
        isPremium: false,
        activeSubscriptions: [],
        originalAppUserId: '',
      };
    }
  }

  // CustomerInfo'dan premium durumu çıkar
  private checkPremiumStatus(customerInfo: CustomerInfo): PremiumStatus {
    const activeSubscriptions: string[] = [];
    let expirationDate: Date | undefined;

    // Aktif abonelikleri kontrol et
    const entitlements = customerInfo.entitlements.active;
    const isPremium = Object.keys(entitlements).length > 0;

    if (isPremium) {
      Object.keys(entitlements).forEach(key => {
        const entitlement = entitlements[key];
        activeSubscriptions.push(entitlement.productIdentifier);
        
        // En son bitiş tarihini al
        if (entitlement.expirationDate) {
          const expDate = new Date(entitlement.expirationDate);
          if (!expirationDate || expDate > expirationDate) {
            expirationDate = expDate;
          }
        }
      });
    }

    return {
      isPremium,
      expirationDate,
      activeSubscriptions,
      originalAppUserId: customerInfo.originalAppUserId,
    };
  }

  // Aboneliği geri yükle
  async restorePurchases(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const customerInfo = await Purchases.restorePurchases();
      const premiumStatus = this.checkPremiumStatus(customerInfo);
      
      if (premiumStatus.isPremium) {
        Alert.alert(
          'Abonelik Geri Yüklendi',
          'Premium aboneliğiniz başarıyla geri yüklendi.'
        );
        return true;
      } else {
        Alert.alert(
          'Abonelik Bulunamadı',
          'Bu cihazda daha önce satın alınmış bir abonelik bulunamadı.'
        );
        return false;
      }

    } catch (error) {
      console.error('❌ Abonelik geri yükleme hatası:', error);
      Alert.alert(
        'Geri Yükleme Hatası',
        'Abonelik geri yüklenirken bir hata oluştu. Lütfen tekrar deneyin.'
      );
      return false;
    }
  }

  // Fiyat localization için yardımcı fonksiyon
  static formatSubscriptionPrice(packageInfo: SubscriptionPackage): string {
    const { packageType, localizedPriceString } = packageInfo;
    
    switch (packageType) {
      case 'monthly':
        return `${localizedPriceString}/ay`;
      case 'three_month':
        return `${localizedPriceString}/3 ay`;
      case 'six_month':
        return `${localizedPriceString}/6 ay`;
      case 'annual':
        return `${localizedPriceString}/yıl`;
      default:
        return localizedPriceString;
    }
  }

  // Paket türüne göre Türkçe isim
  static getSubscriptionTitle(packageType: string): string {
    switch (packageType) {
      case 'monthly':
        return 'Aylık Premium';
      case 'three_month':
        return '3 Aylık Premium';
      case 'six_month':
        return '6 Aylık Premium';
      case 'annual':
        return 'Yıllık Premium';
      default:
        return 'Premium Abonelik';
    }
  }

  // Paket türüne göre avantaj açıklaması
  static getSubscriptionBenefit(packageType: string): string {
    switch (packageType) {
      case 'monthly':
        return 'Aylık faturalandırma';
      case 'three_month':
        return '%15 tasarruf';
      case 'six_month':
        return '%25 tasarruf';
      case 'annual':
        return '%40 tasarruf - En popüler';
      default:
        return '';
    }
  }
}

export default PurchaseManager;
