# RevenueCat Kurulum Rehberi

## 1. RevenueCat Hesabı Oluşturma

### Adım 1: RevenueCat'e Kayıt Olun
1. [RevenueCat Dashboard](https://app.revenuecat.com/login)'a gidin
2. "Sign up for free" butonuna tıklayın
3. Email ve şifre ile hesap oluşturun
4. Email doğrulamasını tamamlayın

### Adım 2: Yeni Proje Oluşturun
1. Dashboard'da "Create new project" butonuna tıklayın
2. Project adını "Medicine Tracker" olarak girin
3. "Create Project" butonuna tıklayın

## 2. Platform Konfigürasyonları

### iOS Konfigürasyonu

#### Adım 1: iOS App Oluşturun
1. RevenueCat Dashboard'da "Apps" sekmesine gidin
2. "Add new app" butonuna tıklayın
3. Platform olarak "iOS" seçin
4. App name: "Medicine Tracker iOS"
5. Bundle ID: `com.hkntzkprn.MedicineTrackerApp` (expo app.json'daki ile aynı olmalı)

#### Adım 2: App Store Connect'te Ürün Oluşturun
1. [App Store Connect](https://appstoreconnect.apple.com/)'e gidin
2. "My Apps" > "Medicine Tracker" uygulamanızı seçin
3. "Features" > "In-App Purchases" sekmesine gidin
4. Şu ürünleri oluşturun:

**Auto-Renewable Subscriptions:**
- Product ID: `com.hkntzkprn.MedicineTrackerApp.monthly`
  - Reference Name: "Monthly Premium"
  - Duration: 1 Month
  - Price: ₺29.99

- Product ID: `com.hkntzkprn.MedicineTrackerApp.threemonth`
  - Reference Name: "3 Month Premium"
  - Duration: 3 Months
  - Price: ₺74.99

- Product ID: `com.hkntzkprn.MedicineTrackerApp.sixmonth`
  - Reference Name: "6 Month Premium"
  - Duration: 6 Months
  - Price: ₺134.99

- Product ID: `com.hkntzkprn.MedicineTrackerApp.annual`
  - Reference Name: "Annual Premium"
  - Duration: 1 Year
  - Price: ₺199.99

#### Adım 3: RevenueCat'e Ürünleri Tanımlayın
1. RevenueCat Dashboard'da "Products" sekmesine gidin
2. "Add product" butonuna tıklayın
3. Her ürün için:
   - Product identifier: App Store Connect'teki Product ID ile aynı
   - Store: "App Store"
   - Type: "Subscription"

### Android Konfigürasyonu

#### Adım 1: Android App Oluşturun
1. RevenueCat Dashboard'da "Apps" sekmesine gidin
2. "Add new app" butonuna tıklayın
3. Platform olarak "Android" seçin
4. App name: "Medicine Tracker Android"
5. Package name: `com.hkntzkprn.medicinetracker`

#### Adım 2: Google Play Console'da Ürün Oluşturun
1. [Google Play Console](https://play.google.com/console/)'a gidin
2. Uygulamanızı seçin
3. "Products" > "In-app products" > "Subscriptions" sekmesine gidin
4. Aynı ürünleri Android için de oluşturun

## 3. RevenueCat Entitlements Kurulumu

### Adım 1: Entitlement Oluşturun
1. RevenueCat Dashboard'da "Entitlements" sekmesine gidin
2. "Add entitlement" butonuna tıklayın
3. Identifier: `premium`
4. Display name: "Premium Features"

### Adım 2: Ürünleri Entitlement'a Ekleyin
1. Oluşturduğunuz "premium" entitlement'ı açın
2. "Attach products" butonuna tıklayın
3. Tüm subscription ürünlerini seçin ve ekleyin

## 4. Offerings Kurulumu

### Adım 1: Offering Oluşturun
1. RevenueCat Dashboard'da "Offerings" sekmesine gidin
2. "Add offering" butonuna tıklayın
3. Identifier: `default`
4. Display name: "Premium Subscription"

### Adım 2: Packages Ekleyin
1. Oluşturduğunuz offering'i açın
2. Her abonelik için package ekleyin:

**Monthly Package:**
- Identifier: `monthly`
- Product: `com.hkntzkprn.MedicineTrackerApp.monthly`
- Position: 1

**3 Month Package:**
- Identifier: `three_month`
- Product: `com.hkntzkprn.MedicineTrackerApp.threemonth`
- Position: 2

**6 Month Package:**
- Identifier: `six_month`
- Product: `com.hkntzkprn.MedicineTrackerApp.sixmonth`
- Position: 3

**Annual Package:**
- Identifier: `annual`
- Product: `com.hkntzkprn.MedicineTrackerApp.annual`
- Position: 4

## 5. API Keys'leri Alın

### iOS API Key
1. RevenueCat Dashboard'da "Settings" > "API Keys" sekmesine gidin
2. "Apple App Store" altında iOS uygulamanızı bulun
3. "Show key" butonuna tıklayarak API key'i kopyalayın

### Android API Key
1. Aynı sayfada "Google Play Store" altında Android uygulamanızı bulun
2. "Show key" butonuna tıklayarak API key'i kopyalayın

## 6. Kodda API Keys'leri Güncelleyin

\`\`\`typescript
// src/services/PurchaseManager.ts dosyasında güncelleme yapın:

const REVENUECAT_APPLE_API_KEY = 'appl_OlDjFiFHnEiifjFTQLmjpHMsGPG';
const REVENUECAT_GOOGLE_API_KEY = 'goog_YOUR_ACTUAL_ANDROID_API_KEY_HERE';
\`\`\`

## 7. Test Kullanıcıları Ekleme

### iOS Test Kullanıcıları
1. App Store Connect'te "Users and Access" > "Sandbox Testers" sekmesine gidin
2. "Add Sandbox Tester" butonuna tıklayın
3. Test email adresi oluşturun (örn: test@example.com)

### Android Test Kullanıcıları
1. Google Play Console'da "Setup" > "License testing" sekmesine gidin
2. Test email adreslerini "License test response" bölümüne ekleyin

## 8. Test Etme

### Sandbox Environment'ta Test
1. **iOS:** Simulator veya fiziksel cihazda
   - Settings > App Store > Sandbox Account'tan test kullanıcısı ile giriş yapın
   
2. **Android:** Physical device veya emulator'da
   - Play Store'da test kullanıcısı ile giriş yapın

### Test Scenarios
1. Uygulama açıldığında premium modal'ı açın
2. Farklı abonelik paketlerini seçin
3. "Premium'a Başla" butonuna tıklayın
4. Sandbox ödeme ekranı görünmeli
5. Test kartı ile ödeme yapın
6. Premium özellikler aktif olmalı

## 9. Troubleshooting

### Yaygın Sorunlar ve Çözümleri

**Problem:** "No offerings found"
**Çözüm:** 
- Offerings'in "Current" olarak işaretlendiğinden emin olun
- Product ID'lerin App Store/Play Store ile eşleştiğinden emin olun

**Problem:** "Product not available for purchase"
**Çözüm:**
- In-app purchase'ların App Store/Play Store'da "Ready to Submit" durumunda olduğundan emin olun
- Bundle ID/Package name'lerin doğru olduğundan emin olun

**Problem:** Purchase başarısız oluyor
**Çözüm:**
- Sandbox kullanıcısı ile giriş yaptığınızdan emin olun
- RevenueCat'te user'ın doğru app'e bağlı olduğundan emin olun

## 10. Production'a Geçiş

TestFlight veya Production'a geçmek için:

1. **App Store:** Uygulamanızı App Store'a submit edin
2. **Play Store:** Uygulamanızı Google Play'e upload edin
3. **RevenueCat:** Settings'ten sandbox mode'u kapatın
4. Real kullanıcılarla test edin

## Önemli Notlar

- ⚠️ **Sandbox environment'ta test etmek için real device kullanmanız önerilir**
- ⚠️ **API keys'leri asla public repository'lerde paylaşmayın**
- ⚠️ **Production'da mutlaka real payment test edin**
- ⚠️ **App Store ve Play Store review süreçlerini dikkate alın**

## Faydalı Linkler

- [RevenueCat Documentation](https://docs.revenuecat.com/)
- [iOS In-App Purchase Guide](https://developer.apple.com/in-app-purchase/)
- [Android Billing Guide](https://developer.android.com/google/play/billing)
- [RevenueCat React Native SDK](https://docs.revenuecat.com/docs/react-native)
