# RevenueCat Hızlı Test Rehberi

## Hızlı Başlangıç (15 dakikada test etmek için)

### 1. RevenueCat Hesabı Oluşturun (5 dakika)
```bash
1. https://app.revenuecat.com/login adresine gidin
2. "Sign up" ile hesap açın
3. Email doğrulamasını yapın
4. "Create new project" -> "Medicine Tracker" adıyla proje oluşturun
```

### 2. iOS App Ekleyin (3 dakika)
```bash
1. Dashboard'da "Apps" -> "Add new app"
2. Platform: iOS
3. App name: Medicine Tracker iOS
4. Bundle ID: com.hkntzkprn.medicinetracker
5. "Add app" butonuna tıklayın
```

### 3. API Key'i Alın (1 dakika)
```bash
1. Settings -> API Keys
2. iOS uygulamanızın yanındaki "Show key" butonuna tıklayın
3. API key'i kopyalayın (appl_ ile başlar)
```

### 4. Test Products Oluşturun (5 dakika)
```bash
1. "Products" sekmesine gidin
2. Her biri için "Add product" butonuna tıklayın:

Product 1:
- Identifier: test_monthly
- Store: App Store
- Type: Subscription

Product 2:
- Identifier: test_annual
- Store: App Store  
- Type: Subscription
```

### 5. Entitlement Oluşturun (2 dakika)
```bash
1. "Entitlements" sekmesine gidin
2. "Add entitlement"
3. Identifier: premium
4. Display name: Premium Features
5. "Attach products" ile yukarıdaki ürünleri ekleyin
```

### 6. Offering Oluşturun (3 dakika)
```bash
1. "Offerings" sekmesine gidin
2. "Add offering"
3. Identifier: default
4. Display name: Premium Plans
5. Packages ekleyin:
   - monthly: test_monthly
   - annual: test_annual
6. "Make current" butonuna tıklayın
```

### 7. Kodda API Key'i Güncelleyin (1 dakika)
```typescript
// src/services/PurchaseManager.ts
const REVENUECAT_APPLE_API_KEY = 'appl_YOUR_COPIED_API_KEY';
const REVENUECAT_GOOGLE_API_KEY = 'goog_YOUR_API_KEY_HERE'; // Şimdilik boş bırakabilirsiniz
```

### 8. Test Edin! (2 dakika)
```bash
1. npm start ile uygulamayı başlatın
2. iOS simulator'da açın
3. İlaçlarım sayfasında premium kartına tıklayın
4. Premium modal açılacak ve test ürünlerinizi gösterecek
```

## Hızlı Test Senaryoları

### ✅ Mock Data Testi (API key olmadan)
- Uygulama otomatik olarak mock data gösterecek
- 4 abonelik seçeneği görünecek
- UI ve akış test edilebilir

### ✅ RevenueCat Entegrasyon Testi (API key ile)
- RevenueCat'ten gerçek ürünler gelecek
- Sandbox satın alma test edilebilir

### ⚠️ Önemli Notlar
- **TestFlight'a atmanıza gerek YOK** - sandbox environment yeterli
- **Real device kullanın** - simulator'da satın alma çalışmayabilir
- **Sandbox kullanıcısı** oluşturmayı unutmayın (App Store Connect)

## Sorun Giderme

### "No offerings found" hatası
```bash
Çözüm:
1. Offering'in "current" olarak işaretlendiğini kontrol edin
2. API key'in doğru olduğunu kontrol edin
3. Bundle ID'nin doğru olduğunu kontrol edin
```

### Mock data görünüyor ama RevenueCat'ten gelmiyor
```bash
Çözüm:
1. Internet bağlantısını kontrol edin
2. API key'in appl_ ile başladığını kontrol edin
3. Console loglarını kontrol edin
```

### Purchase button'ı çalışmıyor
```bash
Bu normal:
- App Store Connect'te real products oluşturmadığınız için
- Şimdilik UI testi için yeterli
- Real products ekledikten sonra çalışacak
```

## Bir Sonraki Adımlar

Temel test tamamlandıktan sonra:
1. App Store Connect'te real products oluşturun
2. Android support ekleyin
3. Sandbox kullanıcıları ile real purchase test edin
4. Production'a geçin

## Yardım

Sorun yaşarsanız:
- Console loglarını kontrol edin
- RevenueCat debugger kullanın
- REVENUECAT_SETUP_GUIDE.md'deki detaylı rehberi takip edin
