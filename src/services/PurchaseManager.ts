import { Alert, Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
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

      // Platform'a göre API anahtarı seç
      const apiKey = Platform.OS === 'ios' ? REVENUECAT_APPLE_API_KEY : REVENUECAT_GOOGLE_API_KEY;
      
      console.log('🔧 RevenueCat configuring with:', {
        platform: Platform.OS,
        apiKey: apiKey.substring(0, 10) + '...',
        environment: 'production'
      });
      
      await Purchases.configure({ 
        apiKey
      });

      // Kullanıcı giriş yapmışsa kullanıcı ID'sini ayarla
      try {
        const { auth } = require('@/api/firebase');
        const user = auth?.currentUser;
        if (user) {
          await Purchases.logIn(user.uid);
        }
      } catch (error) {
        console.warn('Auth user check failed:', error);
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
      console.log('🔄 PurchaseManager: getAvailablePackages started');
      
      if (!this.isInitialized) {
        console.log('🔄 PurchaseManager: Not initialized, calling initialize()');
        await this.initialize();
      }

      console.log('🔄 PurchaseManager: Getting offerings from RevenueCat');
      const offerings = await Purchases.getOfferings();
      
      console.log('📦 PurchaseManager: Offerings received:', {
        all: Object.keys(offerings.all).length,
        current: offerings.current ? 'exists' : 'null',
        currentId: offerings.current?.identifier || 'none',
        allOfferingIds: Object.keys(offerings.all),
        allOfferingsDetails: Object.keys(offerings.all).map(key => ({
          id: key,
          packagesCount: offerings.all[key].availablePackages.length,
          packages: offerings.all[key].availablePackages.map(p => p.identifier)
        }))
      });
      
      // ÖZEL DEBUG: Tüm offering'leri detaylı incele
      console.log('🔍 DETAILED OFFERINGS ANALYSIS:');
      Object.keys(offerings.all).forEach(offeringKey => {
        const offering = offerings.all[offeringKey];
        console.log(`  📋 Offering: ${offeringKey}`);
        console.log(`     - Description: ${offering.serverDescription}`);
        console.log(`     - Package Count: ${offering.availablePackages.length}`);
        offering.availablePackages.forEach(pkg => {
          console.log(`     - Package: ${pkg.identifier} | Product: ${pkg.product.identifier} | Price: ${pkg.product.priceString}`);
        });
      });
      
      // Önce current offering'i dene, sonra default'u dene, sonra herhangi birini al
      let currentOffering = offerings.current;
      
      console.log('🎯 Current offering status:', {
        exists: !!currentOffering,
        identifier: currentOffering?.identifier,
        isPreview: currentOffering?.identifier === 'preview-offering'
      });
      
      // Current offering yoksa default'u dene
      if (!currentOffering) {
        console.log('🔄 No current offering, trying default...');
        currentOffering = offerings.all['default'];
        if (currentOffering) {
          console.log('✅ Found default offering');
        }
      }
      
      // Default da yoksa ilk offering'i al
      if (!currentOffering) {
        console.log('🔄 No default offering, trying first available...');
        const firstOfferingKey = Object.keys(offerings.all)[0];
        if (firstOfferingKey) {
          currentOffering = offerings.all[firstOfferingKey];
          console.log(`✅ Using first offering: ${firstOfferingKey}`);
        }
      }
      
      if (!currentOffering) {
        console.warn('⚠️ PurchaseManager: No current or default offering found');
        console.log('Available offerings:', Object.keys(offerings.all));
        return [];
      }

      console.log('📦 PurchaseManager: Current offering details:', {
        identifier: currentOffering.identifier,
        description: currentOffering.serverDescription,
        packagesCount: currentOffering.availablePackages.length,
        packages: currentOffering.availablePackages.map(p => ({
          id: p.identifier,
          type: p.packageType,
          productId: p.product.identifier,
          title: p.product.title,
          price: p.product.priceString
        }))
      });

      // Eğer hiç paket yoksa, tüm mevcut paketleri listele
      if (currentOffering.availablePackages.length === 0) {
        console.warn('⚠️ PurchaseManager: No packages in current offering');
        return [];
      }

      const packages: SubscriptionPackage[] = [];
      
      // Eğer preview offering ise, preview package'ı ekle
      if (currentOffering.identifier === 'preview-offering') {
        console.log('🧪 PurchaseManager: Using preview offering for testing');
        
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
        
        console.log('✅ PurchaseManager: Added preview packages:', packages.length);
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
          console.log(`✅ PurchaseManager: Found package ${mapping.identifier} (${mapping.type}):`, {
            identifier: pkg.identifier,
            productId: pkg.product.identifier,
            title: pkg.product.title,
            price: pkg.product.priceString
          });
          
          // Aynı tip için birden fazla package eklememek için kontrol et
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
        } else {
          console.warn(`⚠️ PurchaseManager: Package ${mapping.identifier} (${mapping.type}) not found in offering`);
        }
      });

      console.log(`✅ PurchaseManager: Returning ${packages.length} packages`);
      return packages;

    } catch (error) {
      console.error('❌ PurchaseManager: Error getting packages:', error);
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
