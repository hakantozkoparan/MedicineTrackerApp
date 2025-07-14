# Medicine Tracker App (İlaç Takip Uygulaması)

Bu proje, kullanıcıların günlük ilaç takibini kolaylaştırmak, ilaç saatlerini hatırlatmak ve ilaç geçmişini yönetmek amacıyla geliştirilmiş bir mobil uygulamadır. React Native ve Expo kullanılarak oluşturulmuştur.

## ✨ Temel Özellikler

- **İlaç Ekleme/Düzenleme:** İlaç adı, dozu, sıklığı gibi bilgileri ekleme ve güncelleme.
- **Hatırlatıcılar:** Belirlenen ilaç saatleri için anlık bildirimler.
- **İlaç Geçmişi:** Alınan veya atlanan dozların takvimi.
- **Kullanıcı Dostu Arayüz:** Kolay ve anlaşılır bir kullanım deneyimi.

## 🚀 Kullanılan Teknolojiler

- **Framework:** [React Native](https://reactnative.dev/) & [Expo](https://expo.dev/)
- **Navigasyon:** [Expo Router](https://docs.expo.dev/router/introduction/)
- **Lokal Depolama:** [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- **Backend & Veritabanı:** [Firebase](https://firebase.google.com/)
- **Bildirimler:** [Expo Notifications](https://docs.expo.dev/push-notifications/overview/)
- **Dil:** [TypeScript](https://www.typescriptlang.org/)

## ⚙️ Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

**1. Projeyi Klonlayın:**
```bash
git clone <proje-repo-adresi>
cd MedicineTrackerApp
```

**2. Gerekli Bağımlılıkları Yükleyin:**
Proje ana dizinindeyken aşağıdaki komutu çalıştırın. `npm` veya `yarn` kullanabilirsiniz.
```bash
npm install
```
veya
```bash
yarn install
```

**3. Firebase Yapılandırması:**
Projenin Firebase ile entegre çalışabilmesi için kendi Firebase projenizi oluşturmanız ve yapılandırma bilgilerinizi projeye eklemeniz gerekmektedir. Genellikle bu bilgiler `.env` gibi bir dosyada saklanır.

## 📱 Uygulamayı Çalıştırma

Kurulum tamamlandıktan sonra uygulamayı başlatmak için aşağıdaki komutları kullanabilirsiniz.

**1. Expo Sunucusunu Başlatın:**
```bash
npm start
```
veya
```bash
yarn start
```

**2. Simülatörde veya Cihazda Açın:**
- **Android:** Sunucu başladıktan sonra terminalde `a` tuşuna basın.
- **iOS:** Sunucu başladıktan sonra terminalde `i` tuşuna basın.
- **Web:** Sunucu başladıktan sonra terminalde `w` tuşuna basın.

Alternatif olarak, Expo Go uygulamasını mobil cihazınıza indirip terminalde görünen QR kodunu okutarak da uygulamayı çalıştırabilirsiniz.

## 📂 Proje Yapısı

Projenin ana dizinleri ve açıklamaları aşağıda verilmiştir:

```
MedicineTrackerApp/
├── app/              # Expo Router tabanlı ekranlar ve navigasyon yapısı
├── src/              # Yeniden kullanılabilir bileşenler, yardımcı fonksiyonlar, hook'lar vb.
├── assets/           # Resimler, fontlar ve diğer statik varlıklar
├── .env              # Ortam değişkenleri (Firebase anahtarları vb.)
└── package.json      # Proje bağımlılıkları ve script'leri
```

## 🤝 Katkıda Bulunma

Katkılarınız projeyi daha iyi hale getirecektir! Lütfen pull request açmaktan veya issue oluşturmaktan çekinmeyin.

1. Projeyi fork'layın.
2. Yeni bir branch oluşturun (`git checkout -b feature/yeni-ozellik`).
3. Değişikliklerinizi commit'leyin (`git commit -m 'Yeni özellik eklendi'`).
4. Branch'inizi push'layın (`git push origin feature/yeni-ozellik`).
5. Bir Pull Request açın.