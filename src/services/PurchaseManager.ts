import Constants from 'expo-constants';
import { Alert, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE
} from 'react-native-purchases';

// RevenueCat API anahtarları - gerçek anahtarları buraya ekleyeceğiz
const REVENUECAT_APPLE_API_KEY = 'appl_OlDjFiFHnEiifjFTQLmjpHMsGPG';
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

      // Expo Go'da RevenueCat'i sessizce başlat
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        // Expo Go'da hiç log gösterme
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE); // Paradox ama VERBOSE bazen daha az log verir
      } else {
        // Production'da sadece error'ları göster
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      // Platform'a göre API anahtarı seç
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_API_KEY : REVENUECAT_GOOGLE_API_KEY;
      
      await Purchases.configure({ 
        apiKey
      });

      // RevenueCat log seviyesini tekrar ayarla (configure'dan sonra)
      if (isExpoGo) {
        // Expo Go için minimum log
        try {
          Purchases.setLogLevel(LOG_LEVEL.ERROR);
        } catch (e) {
          // Eğer set edilemezse sessizce devam et
        }
      } else {
        Purchases.setLogLevel(LOG_LEVEL.ERROR);
      }

      // Kullanıcı giriş yapmışsa kullanıcı ID'sini ayarla
      try {
        const { auth } = require('@/api/firebase');
        const user = auth?.currentUser;
        if (user) {
          await Purchases.logIn(user.uid);
        }
      } catch (error) {
      }

      this.isInitialized = true;
      return true;

    } catch (error) {
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
    } catch (error) {
    }
  }

  // Kullanıcı çıkış yaptığında çağrılacak
  async logoutUser(): Promise<void> {
    try {
      await Purchases.logOut();
    } catch (error) {
    }
  }

  // Mevcut abonelik paketlerini getir
  async getAvailablePackages(): Promise<SubscriptionPackage[]> {
    try {
      
      if (!this.isInitialized) {
        await this.initialize();
      }

      const offerings = await Purchases.getOfferings();
      
      
      // ÖZEL DEBUG: Tüm offering'leri detaylı incele
      
      // Önce current offering'i dene, sonra default'u dene, sonra herhangi birini al
      let currentOffering = offerings.current;
      
      
      // Current offering yoksa default'u dene
      if (!currentOffering) {
        currentOffering = offerings.all['default'];
        if (currentOffering) {
        }
      }
      
      // Default da yoksa ilk offering'i al
      if (!currentOffering) {
        const firstOfferingKey = Object.keys(offerings.all)[0];
        if (firstOfferingKey) {
          currentOffering = offerings.all[firstOfferingKey];
        }
      }
      
      if (!currentOffering) {
        return [];
      }


      // Eğer hiç paket yoksa, tüm mevcut paketleri listele
      if (currentOffering.availablePackages.length === 0) {
        return [];
      }

      const packages: SubscriptionPackage[] = [];
      
      // Eğer preview offering ise, preview package'ı ekle
      if (currentOffering.identifier === 'preview-offering') {
        
        currentOffering.availablePackages.forEach(pkg => {
          packages.push({
            identifier: pkg.identifier,
            packageType: 'monthly', // Preview için monthly olarak ayarla
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
        });
        
        return packages;
      }
      
      // RevenueCat paket identifier'larını map et - RevenueCat Dashboard'unuzla tam uyumlu
      const packageMapping = [
        // RevenueCat Dashboard'unuzda tanımlı olan identifierlar
        { identifier: '$rc_monthly', type: 'monthly' },
        { identifier: '$rc_three_month', type: 'three_month' },
        { identifier: '$rc_six_month', type: 'six_month' },
        { identifier: '$rc_annual', type: 'annual' }
      ];
      
      packageMapping.forEach(mapping => {
        const pkg = currentOffering.availablePackages.find(p => 
          p.identifier === mapping.identifier
        );
        if (pkg) {
          // ...paket ekleme kodu...
          const existingPackage = packages.find(existingPkg => existingPkg.packageType === mapping.type);
          if (!existingPackage) {
            packages.push({
              identifier: pkg.identifier,
              packageType: mapping.type as any,
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
        }
      });
      return packages;

    } catch (error) {
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
        return true;
      } else {
        return false;
      }

    } catch (error: any) {
      
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

  // RevenueCat test fonksiyonu (debug için)
  async testRevenueCat(): Promise<void> {
    try {
      console.log('🧪 RevenueCat Test Starting...');
      
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      const offerings = await Purchases.getOfferings();
      console.log('📦 All offerings:', Object.keys(offerings.all));
      console.log('📦 Current offering:', offerings.current?.identifier || 'null');
      
      if (offerings.current) {
        console.log('📦 Current offering packages:', 
          offerings.current.availablePackages.map(p => ({
            id: p.identifier,
            type: p.packageType,
            productId: p.product.identifier,
            title: p.product.title,
            price: p.product.priceString
          }))
        );
      }
      
      const customerInfo = await Purchases.getCustomerInfo();
      console.log('👤 Customer info:', {
        userId: customerInfo.originalAppUserId,
        activeEntitlements: Object.keys(customerInfo.entitlements.active)
      });
      
      console.log('✅ RevenueCat Test Completed');
      
    } catch (error) {
      console.error('❌ RevenueCat test error:', error);
    }
  }
}

export default PurchaseManager;
