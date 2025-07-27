/**
 * RevenueCat Premium Abonelik Test Rehberi
 * 
 * Bu dosya premium abonelik sistemini test etmek için gerekli adımları içerir.
 * NOT: Production ortamında bu dosyayı kaldırın!
 */

// TEST AŞAMALARI:

// 1. REVENUECAT KONFIGÜRASYONU
// - RevenueCat hesabı oluşturun: https://app.revenuecat.com
// - Yeni proje ekleyin
// - iOS ve Android uygulamalarını tanımlayın
// - API anahtarlarını alın ve PurchaseManager.ts'e ekleyin

// 2. ABONELIK ÜRÜNLERİ OLUŞTURMA
// RevenueCat Dashboard'da aşağıdaki ürünleri oluşturun:

const SUBSCRIPTION_PRODUCTS = {
  monthly: {
    identifier: 'monthly_premium',
    title: 'Aylık Premium',
    price: '$4.99' // Örnek fiyat
  },
  threeMonth: {
    identifier: 'three_month_premium', 
    title: '3 Aylık Premium',
    price: '$12.99' // %15 indirim
  },
  sixMonth: {
    identifier: 'six_month_premium',
    title: '6 Aylık Premium', 
    price: '$22.99' // %25 indirim
  },
  annual: {
    identifier: 'annual_premium',
    title: 'Yıllık Premium',
    price: '$35.99' // %40 indirim
  }
};

// 3. APPLE APP STORE CONNECT KURULUMU
// - App Store Connect'e gidin
// - Uygulamanızı oluşturun
// - In-App Purchases bölümünden yukarıdaki ürünleri ekleyin
// - Sandbox test kullanıcıları oluşturun

// 4. GOOGLE PLAY CONSOLE KURULUMU  
// - Google Play Console'a gidin
// - Uygulama oluşturun
// - Monetization > Subscriptions'dan ürünleri ekleyin
// - Test hesapları ekleyin

// 5. TEST SENARYOLARI

export const TEST_SCENARIOS = {
  // Senaryo 1: Ücretsiz plan limiti
  freePlanLimit: {
    description: 'Kullanıcı 3 ilaç ekledikten sonra premium modal gösterilmeli',
    steps: [
      '1. Yeni hesap oluşturun',
      '2. 3 ilaç ekleyin',
      '3. 4. ilacı eklemeye çalışın',
      '4. Premium modal açılmalı'
    ]
  },

  // Senaryo 2: Premium satın alma
  premiumPurchase: {
    description: 'Premium abonelik satın alma işlemi',
    steps: [
      '1. Premium modal\'ı açın',
      '2. Bir abonelik paketi seçin',
      '3. "Premium\'a Geç" butonuna basın',
      '4. Satın alma akışını tamamlayın',
      '5. Başarı mesajı görülmeli',
      '6. Sınırsız ilaç ekleyebilmeli'
    ]
  },

  // Senaryo 3: Abonelik geri yükleme
  restorePurchases: {
    description: 'Önceki satın alımları geri yükleme',
    steps: [
      '1. Premium abonelik satın alın',
      '2. Uygulamayı silin ve yeniden yükleyin',
      '3. Aynı hesapla giriş yapın',
      '4. Premium modal\'da "Geri Yükle" butonuna basın',
      '5. Abonelik geri yüklenmeli'
    ]
  },

  // Senaryo 4: Profil sayfası premium durumu
  profilePremiumStatus: {
    description: 'Profil sayfasında premium durum gösterimi',
    steps: [
      '1. Profil sayfasına gidin',
      '2. Premium durumu doğru gösterilmeli',
      '3. Bitiş tarihi (varsa) görülmeli',
      '4. Premium menü öğesine tıklandığında modal açılmalı'
    ]
  }
};

// 6. SANDBOX TEST KULLANICILARI
// Apple için: Settings > App Store > Sandbox Account
// Android için: Google Play Console > Testing > License testing

export const TESTING_TIPS = {
  ios: [
    'Xcode Simulator yerine gerçek cihaz kullanın',
    'Sandbox test hesabı ile App Store\'dan çıkış yapın',
    'Test hesabı ile giriş yapın',
    'Satın alma işlemlerinde gerçek para çekilmez'
  ],
  android: [
    'Google Play Console\'da test lisansı ekleyin',
    'Internal testing track kullanın',
    'Test hesabınızla Play Store\'da oturum açın',
    'Closed testing kullanıcı listesine eklenmiş olun'
  ],
  general: [
    'RevenueCat Dashboard\'da purchase events\'i takip edin',
    'Console loglarını kontrol edin',
    'Network bağlantısının stabil olduğundan emin olun',
    'Test sırasında birden fazla satın alma yapmayın'
  ]
};

// 7. TROUBLESHOOTING
export const COMMON_ISSUES = {
  'No products found': [
    'RevenueCat\'te ürünler doğru tanımlanmış mı?',
    'App Store Connect / Play Console\'da ürünler onaylandı mı?',
    'Bundle ID / Package name eşleşiyor mu?'
  ],
  'Purchase failed': [
    'Test hesabı ile giriş yapıldı mı?',
    'Ürün zaten satın alınmış olabilir',
    'Network bağlantısı var mı?',
    'RevenueCat API anahtarları doğru mu?'
  ],
  'Restore failed': [
    'Aynı test hesabı kullanılıyor mu?',
    'Daha önce satın alma yapılmış mı?',
    'Platform (iOS/Android) aynı mı?'
  ]
};

// 8. PRODUCTION DEPLOYMENT CHECKLİST
export const PRODUCTION_CHECKLIST = [
  '✅ RevenueCat API anahtarları production değerleri ile değiştirildi',
  '✅ App Store Connect / Play Console\'da ürünler live edildi',
  '✅ Test kodları ve log\'lar temizlendi',
  '✅ Fiyatlar ve para birimleri doğru ayarlandı',
  '✅ Kullanım şartları ve gizlilik politikası eklendi',
  '✅ Abonelik iptali ve iade politikaları belirlendi',
  '✅ RevenueCat webhook\'ları konfigüre edildi',
  '✅ Analytics ve revenue tracking aktif edildi'
];

