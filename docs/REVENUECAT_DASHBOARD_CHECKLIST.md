# RevenueCat Dashboard Kontrol Listesi

## 🔍 RevenueCat Konfigürasyon Kontrolü

Terminal loglarında "preview-offering" görünüyor, bu da RevenueCat'te henüz gerçek offering oluşturulmadığını gösteriyor.

## 1. RevenueCat Dashboard Kontrolleri

### a) Products Kontrolü
1. [RevenueCat Dashboard](https://app.revenuecat.com/) → **Products**
2. Şu 4 product'ın olması gerekiyor:

```
✅ com.hkntzkprn.MedicineTrackerApp.monthly (Monthly)
✅ com.hkntzkprn.MedicineTrackerApp.threemonth (3-Month) 
✅ com.hkntzkprn.MedicineTrackerApp.sixmonth (6-Month)
✅ com.hkntzkprn.MedicineTrackerApp.annual (Annual)
```

**Eğer yoksa:**
- "Add Product" butonuna tıklayın
- Product Identifier: App Store'daki Product ID ile aynı
- Store: App Store
- Type: Subscription

### b) Entitlements Kontrolü
1. Dashboard → **Entitlements**
2. "premium" entitlement olmalı
3. **Tüm 4 product'ı entitlement'a attach edin**

**Entitlement Oluşturma:**
- Identifier: `premium`
- Display Name: `Premium Features`
- Attach Products: 4 subscription'ı da ekleyin

### c) Offerings Kontrolü ⚠️ KRITIK
1. Dashboard → **Offerings**
2. "default" offering oluşturun (şu anda sadece preview var)
3. **4 package ekleyin:**

```
Package 1:
- Identifier: $rc_monthly
- Product: com.hkntzkprn.MedicineTrackerApp.monthly

Package 2:  
- Identifier: $rc_three_month
- Product: com.hkntzkprn.MedicineTrackerApp.threemonth

Package 3:
- Identifier: $rc_six_month  
- Product: com.hkntzkprn.MedicineTrackerApp.sixmonth

Package 4:
- Identifier: $rc_annual
- Product: com.hkntzkprn.MedicineTrackerApp.annual
```

4. **"Make Current" butonuna tıklayın** ⚠️

## 2. API Key Kontrolü

Mevcut API Key: `appl_OlDjFiFHnEiifjFTQLmjpHMsGPG`

1. Dashboard → **Settings** → **API Keys**
2. iOS uygulamanız için API key'i kontrol edin
3. Key'in doğru olduğundan emin olun

## 3. Bundle ID Kontrolü

**RevenueCat'teki Bundle ID:** `com.hkntzkprn.MedicineTrackerApp`
**app.json'daki Bundle ID:** `com.hkntzkprn.MedicineTrackerApp` ✅

Eşleşiyor, bu kısım tamam.

## 4. Test Komutu

Offering'leri oluşturduktan sonra test edin:

1. Premium modal'ı açın
2. "🧪 RevenueCat Debug Test" butonuna tıklayın
3. Console'da şu logları görmelisiniz:

```
✅ Başarılı Durum:
📦 All offerings: ["default"]
📦 Current offering: default
📦 Current offering packages: [4 packages]
✅ RevenueCat packages loaded successfully! 4 packages found
```

```
❌ Hala Hatalı Durum:
📦 All offerings: ["preview-offering"] 
📦 Current offering: preview-offering
⚠️ No RevenueCat packages found! Using mock data.
```

## 5. Adım Adım Çözüm

### Adım 1: App Store Metadata'ları Tamamla
- 3 subscription'ın "Missing Metadata" durumunu "Ready to Submit"e çevir

### Adım 2: RevenueCat Offerings Oluştur  
- "default" offering oluştur
- 4 package ekle
- "Make Current" yap

### Adım 3: Development Build Al
- `eas build --platform ios --profile development`
- Expo Go yerine development build kullan

### Adım 4: Test Et
- Development build'de premium modal'ı aç
- 4 subscription görünüyor mu kontrol et
- Sandbox satın alma test et

## 6. Beklenen Sonuç

Tüm adımlar tamamlandıktan sonra:

✅ **Terminal Logları:**
```
📦 PurchaseManager: Offerings received: {"all": 1, "currentId": "default"}
✅ PurchaseManager: Found package for monthly
✅ PurchaseManager: Found package for three_month  
✅ PurchaseManager: Found package for six_month
✅ PurchaseManager: Found package for annual
✅ RevenueCat packages loaded successfully! 4 packages found
```

✅ **Premium Modal:**
- 4 farklı abonelik seçeneği
- Gerçek fiyatlar (₺29,99, ₺74,99, vb.)
- "Premium'a Başla" butonu çalışıyor
- Sandbox ödeme ekranı açılıyor

Bu adımları takip ettikten sonra RevenueCat entegrasyonunuz mükemmel çalışacaktır!
