# RevenueCat Sorun Giderme Kılavuzu

## 🚨 Mevcut Sorun
App Store Connect'te 4 subscription türü var:
- 1 tanesi "Ready to Submit" durumunda ✅
- 3 tanesi "Missing Metadata" durumunda ❌

RevenueCat uygulamadan subscription'ları çekemiyor.

## 🔍 Kontrol Edilmesi Gerekenler

### 1. App Store Connect Kontrolleri

#### a) Subscription Metadata'larını Tamamlayın
1. [App Store Connect](https://appstoreconnect.apple.com/) → Uygulamanız → Features → In-App Purchases
2. Her subscription için:
   - **Display Name** (Türkçe): "Aylık Premium", "3 Aylık Premium", vb.
   - **Description** (Türkçe): Detaylı açıklama
   - **Review Information**: Apple için açıklama
   - **Promotional Text**: Pazarlama metni
   - **Review Screenshots**: Test için screenshot'lar

#### b) Product ID'leri Kontrol Edin
Aşağıdaki Product ID'ler olmalı:
- `com.hkntzkprn.MedicineTrackerApp.monthly`
- `com.hkntzkprn.MedicineTrackerApp.threemonth`
- `com.hkntzkprn.MedicineTrackerApp.sixmonth`
- `com.hkntzkprn.MedicineTrackerApp.annual`

#### c) Bundle ID Kontrolü
- App Store Connect Bundle ID: `com.hkntzkprn.MedicineTrackerApp`
- app.json Bundle ID: `com.hkntzkprn.MedicineTrackerApp` ✅

### 2. RevenueCat Dashboard Kontrolleri

#### a) Apps Konfigürasyonu
1. [RevenueCat Dashboard](https://app.revenuecat.com/) → Apps
2. iOS App:
   - Name: "Medicine Tracker iOS"
   - Bundle ID: `com.hkntzkprn.MedicineTrackerApp`
   - Store: App Store

#### b) Products Konfigürasyonu
1. Dashboard → Products
2. Her bir subscription için product oluşturun:
   - Product Identifier: App Store Connect'teki Product ID ile aynı
   - Store: App Store
   - Type: Subscription

#### c) Entitlements Konfigürasyonu
1. Dashboard → Entitlements
2. "premium" entitlement oluşturun
3. Tüm subscription ürünlerini bu entitlement'a ekleyin

#### d) Offerings Konfigürasyonu
1. Dashboard → Offerings
2. "default" offering oluşturun
3. Packages ekleyin:
   - `$rc_monthly` → monthly product
   - `$rc_three_month` → threemonth product
   - `$rc_six_month` → sixmonth product
   - `$rc_annual` → annual product
4. **"Make Current" butonuna tıklayın** ⚠️

### 3. API Key Kontrolü

Mevcut API Key: `appl_OlDjFiFHnEiifjFTQLmjpHMsGPG`

1. RevenueCat Dashboard → Settings → API Keys
2. iOS uygulamanız için API key'i kontrol edin
3. Key'in `appl_` ile başladığından emin olun

### 4. Test Adımları

#### a) Console Log Kontrolü
1. Uygulamayı başlatın: `npm start`
2. Premium modal'ı açın
3. Metro console'da şu logları arayın:
   ```
   🔄 PurchaseManager: Getting offerings from RevenueCat
   📦 PurchaseManager: Offerings received
   ```

#### b) Debug Çıktıları
Aşağıdaki bilgileri kontrol edin:
- Offerings count: 0'dan büyük olmalı
- Current offering: "null" olmamalı
- Packages count: Her offering'de paket olmalı

#### c) Test Kullanıcısı
1. App Store Connect → Users and Access → Sandbox Testers
2. Test kullanıcısı oluşturun
3. iOS Settings → App Store → Sandbox Account ile giriş yapın

### 5. Hızlı Çözümler

#### Çözüm 1: Offering "Current" Yapın
En yaygın sorun: Offering "current" olarak işaretlenmemiş
1. RevenueCat → Offerings → default
2. "Make Current" butonuna tıklayın

#### Çözüm 2: Product Sync Problemi
1. RevenueCat → Products
2. Her product'ı tekrar kontrol edin
3. App Store Connect'teki Product ID'ler ile tam eşleştiğinden emin olun

#### Çözüm 3: Bundle ID Sync
1. RevenueCat → Apps → iOS App → Settings
2. Bundle ID'yi kontrol edin: `com.hkntzkprn.MedicineTrackerApp`

#### Çözüm 4: Cache Temizleme
1. Metro bundler'ı restart edin: `r` tuşuna basın
2. Simulator'ı reset edin
3. RevenueCat cache: Purchases.invalidateCustomerInfoCache()

### 6. Test Komutu

Detaylı debug için şu kodu PurchaseManager'a ekleyebilirsiniz:

```typescript
// Test fonksiyonu ekleyin
async testRevenueCat(): Promise<void> {
  try {
    console.log('🧪 RevenueCat Test Starting...');
    
    const offerings = await Purchases.getOfferings();
    console.log('📦 All offerings:', Object.keys(offerings.all));
    console.log('📦 Current offering:', offerings.current?.identifier);
    
    if (offerings.current) {
      console.log('📦 Current offering packages:', 
        offerings.current.availablePackages.map(p => ({
          id: p.identifier,
          type: p.packageType,
          productId: p.product.identifier
        }))
      );
    }
    
    const customerInfo = await Purchases.getCustomerInfo();
    console.log('👤 Customer info:', {
      userId: customerInfo.originalAppUserId,
      activeEntitlements: Object.keys(customerInfo.entitlements.active)
    });
    
  } catch (error) {
    console.error('❌ RevenueCat test error:', error);
  }
}
```

### 7. Beklenen Başarılı Log Çıktısı

```
🔧 RevenueCat configuring with: { platform: 'ios', apiKey: 'appl_OlDj...', environment: 'production' }
✅ RevenueCat başarıyla başlatıldı
📦 PurchaseManager: Offerings received: { all: 1, current: 'exists', currentId: 'default' }
✅ PurchaseManager: Found package for monthly: { identifier: '$rc_monthly', productId: 'com.hkntzkprn.MedicineTrackerApp.monthly' }
✅ RevenueCat packages loaded successfully! 4 packages found
```

### 8. Yaygın Hatalar ve Çözümleri

| Hata | Sebep | Çözüm |
|------|-------|-------|
| "No offerings found" | Offering current değil | RevenueCat'te "Make Current" yapın |
| "No packages in offering" | Products entitlement'a eklenmemiş | Products'ı entitlement'a attach edin |
| "Product not available" | App Store'da Ready to Submit değil | Metadata'ları tamamlayın |
| "Invalid API key" | Yanlış key | Dashboard'dan doğru key'i alın |
| "Bundle ID mismatch" | RevenueCat'te farklı Bundle ID | Bundle ID'leri eşleştirin |

## ✅ Checklist

- [ ] App Store Connect'te 4 subscription'ın metadata'sı tamamlandı
- [ ] Tüm subscription'lar "Ready to Submit" durumunda
- [ ] RevenueCat'te 4 product oluşturuldu
- [ ] Products, "premium" entitlement'a eklendi
- [ ] "default" offering oluşturuldu ve current yapıldı
- [ ] Offering'e 4 package eklendi
- [ ] API key doğru ve güncel
- [ ] Bundle ID'ler eşleşiyor
- [ ] Test kullanıcısı oluşturuldu
- [ ] Console'da başarılı loglar görünüyor

Bu adımları takip ettikten sonra RevenueCat entegrasyonunuz düzgün çalışmalıdır.
