# Development Build Kılavuzu

## 🚀 Expo Go'dan Development Build'e Geçiş

RevenueCat'in gerçek çalışması için development build gerekiyor.

## 1. EAS Build Kurulumu

### a) EAS CLI Yükleyin
```bash
npm install -g @expo/eas-cli
```

### b) EAS Account'a Login
```bash
eas login
```

### c) EAS Build Configure
```bash
eas build:configure
```

## 2. Build Oluşturma

### iOS Development Build
```bash
# Development build (internal testing için)
eas build --platform ios --profile development

# TestFlight build (daha sonra)
eas build --platform ios --profile preview
```

### Build Process
1. Build başlatılır (~15-20 dakika)
2. Build tamamlanınca download linki gelir
3. iPhone'a kurun (TestFlight yerine direkt kurulum)

## 3. Development Build'de Test

### a) Build'i Telefonunuza Kurun
- Build linkini iPhone'da açın
- "Install" butonuna tıklayın
- Ayarlar → Genel → VPN & Device Management → Developer App
- Trust edin

### b) RevenueCat Test
1. Uygulamayı açın
2. Premium modal'ı açın
3. Console loglarında şunları görmeli:
   ```
   ✅ RevenueCat packages loaded successfully! 4 packages found
   ```

## 4. TestFlight'a Yükleme (Sonraki Adım)

Metadata'lar hazır olduktan sonra:

```bash
# TestFlight için build
eas build --platform ios --profile preview
```

### TestFlight Upload
1. Build tamamlanınca .ipa dosyasını indirin
2. Xcode → Window → Organizer
3. .ipa'yı drag & drop edin
4. "Distribute App" → "App Store Connect" → "Upload"

## 5. Test Senaryoları

### Development Build'de Test Edin:
- [ ] Premium modal açılıyor mu?
- [ ] 4 subscription görünüyor mu?
- [ ] Fiyatlar doğru mu?
- [ ] Satın alma butonu çalışıyor mu?
- [ ] Sandbox ödeme ekranı açılıyor mu?

### Sandbox Test Kullanıcısı
1. App Store Connect → Users and Access → Sandbox Testers
2. Test kullanıcısı oluşturun: `test@example.com`
3. iPhone Settings → App Store → Sandbox Account
4. Test kullanıcısı ile giriş yapın

## 6. Sorun Giderme

### "No offerings found" Hatası
- RevenueCat Dashboard → Offerings → "Make Current"
- Bundle ID kontrolü
- API key kontrolü

### "Product not available" Hatası
- App Store Connect'te "Ready to Submit" olmalı
- Sandbox kullanıcısı ile giriş yapın

### Build Hataları
```bash
# Cache temizleyin
npm start -- --clear
expo r --clear

# Dependencies güncelleyin
npm install
```

## 7. Başarı Kriterleri

✅ **Development Build Başarılı Olduğunda:**
- RevenueCat gerçek API'den veri çekiyor
- 4 subscription paketinin hepsi görünüyor
- Fiyatlar App Store'dan geliyor
- Sandbox satın alma çalışıyor

✅ **TestFlight Ready Olduğunda:**
- Metadata'lar tamam
- Build upload edildi
- External tester'larla test edilebilir

Bu adımları takip ettikten sonra RevenueCat entegrasyonunuz tam olarak çalışacaktır.
