# TestFlight Build Kılavuzu

## 🎯 RevenueCat ile TestFlight Build

Expo Go'da preview mode çalışıyor, TestFlight'ta gerçek RevenueCat verileri gelecek.

## 1. App Store Connect Hazırlık

### Missing Metadata'ları Tamamlayın:

**3-Month Premium (threemonth):**
- Display Name: "3 Aylık Premium"
- Description: "3 aylık premium abonelik ile %15 tasarruf edin"

**6-Month Premium (sixmonth):**
- Display Name: "6 Aylık Premium"  
- Description: "6 aylık premium abonelik ile %25 tasarruf edin"

**Yearly Premium (annual):**
- Display Name: "Yıllık Premium"
- Description: "Yıllık premium abonelik ile %40 tasarruf edin"

Tüm subscription'lar **"Ready to Submit"** durumunda olmalı.

## 2. EAS Build Konfigürasyonu

### EAS CLI Kurulum:
```bash
npm install -g @expo/eas-cli
eas login
```

### Build Konfigürasyonu:
```bash
eas build:configure
```

Bu komut `eas.json` oluşturur. İçeriği kontrol edin:

```json
{
  "cli": {
    "version": ">= 7.8.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "simulator": false
      }
    }
  }
}
```

## 3. TestFlight Build Alma

### iOS TestFlight Build:
```bash
eas build --platform ios --profile preview
```

**Build Process:**
1. Build 15-20 dakika sürer
2. Build tamamlanınca App Store Connect'e otomatik upload edilir
3. TestFlight'ta görünmesi 5-10 dakika alır

### Build Status Kontrolü:
```bash
eas build:list
```

## 4. TestFlight'ta Test

### a) TestFlight'ta Görüntüleme
1. App Store Connect → TestFlight
2. Yeni build'i seçin
3. "External Testing" için hazırlayın

### b) Test Kullanıcısı Ekleme
1. TestFlight → External Groups
2. Test kullanıcılarını ekleyin
3. Build'i test grubuna assign edin

### c) RevenueCat Test
1. TestFlight uygulamasını iPhone'a kurun
2. Premium modal'ı açın
3. **4 gerçek subscription görmelisiniz:**
   - Aylık Premium - ₺29,99
   - 3 Aylık Premium - ₺74,99
   - 6 Aylık Premium - ₺134,99
   - Yıllık Premium - ₺199,99

### d) Sandbox Test
1. iOS Settings → App Store → Sandbox Account
2. Test kullanıcısı ile giriş yapın
3. Premium satın alma test edin

## 5. Beklenen Sonuçlar

### ✅ Başarılı Test:
- Preview mode yok
- 4 gerçek subscription görünür
- Fiyatlar App Store'dan gelir
- Sandbox satın alma çalışır
- RevenueCat debug logları gerçek veri gösterir

### ❌ Sorun Göstergeleri:
- Hala preview mode
- Mock data görünüyor
- "No offerings found" hatası

## 6. Sorun Giderme

### Problem: Hala Preview Mode
**Çözüm:** 
- EAS build profile'ini kontrol edin
- Development client kullandığınızdan emin olun
- Cache temizleyin

### Problem: No Offerings Found
**Çözüm:**
- RevenueCat Dashboard → Offerings → "Make Current"
- Bundle ID kontrolü
- API key kontrolü

### Problem: Subscription Not Available
**Çözüm:**
- App Store Connect'te "Ready to Submit" olmalı
- Sandbox kullanıcısı ile test edin

## 7. Production'a Hazırlık

TestFlight test başarılı olduktan sonra:

1. **App Store Review:** Subscription'ları Apple review'ına gönderin
2. **Production Build:** `eas build --platform ios --profile production`
3. **App Store Release:** Uygulamayı store'da yayınlayın

## 8. Test Senaryoları

### Temel Test:
- [ ] Premium modal açılıyor
- [ ] 4 subscription görünüyor
- [ ] Fiyatlar doğru
- [ ] Satın alma butonu çalışıyor

### Sandbox Test:
- [ ] Sandbox ödeme ekranı açılıyor
- [ ] Test satın alma yapılabiliyor
- [ ] Premium özellikler aktif oluyor
- [ ] Restore purchases çalışıyor

Bu adımları takip ettikten sonra RevenueCat entegrasyonunuz TestFlight'ta mükemmel çalışacaktır!
