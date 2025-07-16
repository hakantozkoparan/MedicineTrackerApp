# Medicine Tracker App (İlaç Takip Uygulaması)

Bu proje, kullanıcıların günlük ilaç takibini kolaylaştırmak, ilaç saatlerini hatırlatmak ve ilaç geçmişini yönetmek amacıyla geliştirilmiş güvenli bir mobil uygulamadır. React Native ve Expo kullanılarak oluşturulmuş, kapsamlı güvenlik önlemleri ve admin yönetim sistemi ile donatılmıştır.

## ✨ Temel Özellikler

### 👤 Kullanıcı Yönetimi
- **Güvenli Kayıt/Giriş:** Email doğrulama ile hesap oluşturma
- **Multi-Factor Authentication:** SimpleCaptcha ile bot koruması
- **Manuel Email Doğrulama:** Admin tarafından kullanıcı onayı
- **Rol Tabanlı Erişim:** Member ve Admin rolleri

### 💊 İlaç Takibi
- **İlaç Ekleme/Düzenleme:** İlaç adı, dozu, sıklığı gibi bilgileri yönetme
- **Hatırlatıcılar:** Belirlenen ilaç saatleri için anlık bildirimler
- **İlaç Geçmişi:** Alınan veya atlanan dozların takvimi
- **Kişisel İlaç Profili:** Kullanıcıya özel ilaç listesi

### 🛡️ Gelişmiş Güvenlik Sistemi
- **Cihaz Parmak İzi:** Benzersiz cihaz kimlik takibi
- **Rate Limiting:** Saatlik/günlük deneme limitleri
- **Otomatik Engelleme:** Şüpheli aktivite tespitinde geçici erişim kısıtı
- **Güvenlik Raporlama:** Admin panelinde detaylı güvenlik logları
- **Bot Koruması:** Matematiksel captcha sistemi

### 🎯 Destek Sistemi
- **Çift Kanallı Destek:** Giriş yapmış ve misafir kullanıcılar için ayrı sistemler
- **Günlük Limit Kontrolü:** Misafir kullanıcılar için günde 3 talep limiti
- **Admin Talep Yönetimi:** Tab bazlı açık/kapalı talep organizasyonu
- **Otomatik Kaynak Etiketleme:** Taleplerin nereden geldiğinin takibi

### 👨‍💼 Kapsamlı Admin Paneli
- **Kullanıcı Yönetimi:** Email doğrulama, admin yetkisi verme
- **Güvenlik Monitörü:** Şüpheli cihaz ve aktivite takibi
- **Destek Talep Yönetimi:** Tüm kanallardan gelen talepleri merkezi yönetim
- **Debug Araçları:** Geliştirici ve test araçları

## 🚀 Kullanılan Teknolojiler

### Frontend & Mobile
- **Framework:** [React Native](https://reactnative.dev/) 0.79.5 & [Expo](https://expo.dev/) 53.0.17
- **Navigasyon:** [Expo Router](https://docs.expo.dev/router/introduction/) 5.1.3
- **UI Components:** @expo/vector-icons, expo-linear-gradient
- **State Management:** React Hooks & Context
- **Dil:** [TypeScript](https://www.typescriptlang.org/) & JavaScript

### Backend & Database
- **Database:** [Firebase Firestore](https://firebase.google.com/products/firestore)
- **Authentication:** [Firebase Auth](https://firebase.google.com/products/auth)
- **Security Rules:** Rol tabanlı Firestore güvenlik kuralları
- **Real-time Updates:** Firebase onSnapshot listeners

### Güvenlik & Storage
- **Local Storage:** [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) 2.1.2
- **Device Info:** [expo-device](https://docs.expo.dev/versions/latest/sdk/device/) 7.1.4
- **Security Manager:** Özel güvenlik yönetim sistemi
- **Captcha System:** Matematik tabanlı SimpleCaptcha bileşeni

### Notifications & UX
- **Push Notifications:** [Expo Notifications](https://docs.expo.dev/push-notifications/overview/) 0.31.4
- **Haptic Feedback:** [expo-haptics](https://docs.expo.dev/versions/latest/sdk/haptics/) 14.1.4
- **Icons:** [Ionicons](https://ionic.io/ionicons) (@expo/vector-icons)

## 🔐 Güvenlik Özellikleri

### Cihaz Tabanlı Güvenlik
```typescript
// SecurityManager singleton pattern ile güvenlik yönetimi
class SecurityManager {
  - Benzersiz cihaz ID oluşturma ve kalıcı saklama
  - Cihaz bilgileri (OS, versiyon, model) kaydetme
  - Deneme geçmişi ve başarısızlık oranı takibi
}
```

### Rate Limiting Sistemi
- **Giriş Denemeleri:** Saatte 100, günde 500 deneme limiti
- **Kayıt Denemeleri:** Saatte 100, günde 100 deneme limiti
- **Destek Talepleri:** Günde 3 talep limiti (misafir kullanıcılar)
- **Otomatik Engelleme:** 15 başarısız denemede 1 saat blok

### Captcha Koruması
```typescript
// SimpleCaptcha bileşeni
- Toplama, çıkarma, çarpma işlemleri
- Gerçek zamanlı doğrulama
- Reset mekanizması
- Görsel geri bildirim (başarı/hata)
```

### Firebase Güvenlik Kuralları
```javascript
// Rol tabanlı erişim kontrolü
- Kullanıcılar sadece kendi verilerine erişebilir
- Admin rolü tüm verilere erişim sahibi
- Misafir kullanıcılar sadece destek talebi oluşturabilir
- Güvenlik logları herkes tarafından yazılabilir (bot koruması)
```

## 📊 Database Yapısı

### Ana Koleksiyonlar
```
/users/{uid}
├── name, surname, email
├── role: 'member' | 'admin'
├── emailVerified: boolean
├── emailVerifiedBy: 'admin' | 'firebase'
├── deviceInfo: {osName, osVersion, deviceName}
└── /medicines/{medicineId} (subcollection)

/supportTickets/{ticketId}
├── userId, userEmail
├── subject, description
├── status: 'open' | 'closed'
└── createdAt

/support_tickets/{ticketId}
├── email, subject, message
├── deviceId (for rate limiting)
├── priority, status
└── source: 'login_page'

/security_attempts/{deviceId}
├── deviceInfo: {osName, osVersion, deviceName, modelName}
├── attempts: [{timestamp, type, email, success}]
├── totalAttempts: number
├── blockedUntil?: Date
└── createdAt, updatedAt
```

## 🏗️ Proje Yapısı

```
MedicineTrackerApp/
├── app/                          # Expo Router sayfaları
│   ├── (tabs)/                   # Ana tab navigasyonu
│   │   ├── index.tsx             # Ana sayfa
│   │   ├── medicines.tsx         # İlaç listesi
│   │   └── profile.tsx           # Kullanıcı profili
│   ├── admin/                    # Admin panel sayfaları
│   │   ├── debug.tsx             # Debug araçları
│   │   ├── manage-users.tsx      # Kullanıcı yönetimi
│   │   ├── security-report.tsx   # Güvenlik raporu
│   │   ├── send-notification.tsx # Bildirim gönderme
│   │   └── tickets.tsx           # Destek talep yönetimi
│   ├── edit-medicine/            # İlaç düzenleme
│   │   └── [id].tsx             # Dinamik ID ile düzenleme
│   ├── _layout.tsx              # Ana layout ve auth kontrolü
│   ├── login.js                 # Giriş sayfası + destek modal
│   ├── register.js              # Kayıt sayfası
│   ├── edit-profile.tsx         # Profil düzenleme
│   ├── add-medicine.tsx         # İlaç ekleme
│   └── support-ticket.tsx       # Destek talebi (authenticated)
├── src/
│   ├── components/              # Yeniden kullanılabilir bileşenler
│   │   ├── SimpleCaptcha.tsx    # Matematik captcha bileşeni
│   │   ├── ScreenHeader.tsx     # Sayfa başlığı bileşeni
│   │   ├── UserInfoCard.tsx     # Kullanıcı bilgi kartı
│   │   └── ui/                  # UI bileşenleri
│   ├── constants/               # Sabitler ve tema
│   │   ├── Colors.ts            # Renk paleti
│   │   └── theme.js             # Tipografi ve boyutlar
│   ├── utils/                   # Yardımcı araçlar
│   │   └── SecurityManager.ts   # Güvenlik yönetim sistemi
│   └── api/
│       └── firebase.js          # Firebase yapılandırması
├── assets/                      # Statik dosyalar
│   └── images/
│       └── medicinetrackerlogo.png
├── firestore.rules             # Firebase güvenlik kuralları
├── package.json                # Proje bağımlılıkları
└── README.md                   # Bu dosya
```

## ⚙️ Kurulum

### Önkoşullar
- Node.js 18+
- Expo CLI (`npm install -g @expo/cli`)
- Firebase projesi ve yapılandırması

### Kurulum Adımları

**1. Projeyi Klonlayın:**
```bash
git clone <proje-repo-adresi>
cd MedicineTrackerApp
```

**2. Bağımlılıkları Yükleyin:**
```bash
npm install
# veya
yarn install
```

**3. Firebase Yapılandırması:**
`src/api/firebase.js` dosyasını kendi Firebase proje bilgilerinizle güncelleyin:
```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  // ... diğer ayarlar
};
```

**4. Firestore Güvenlik Kurallarını Uygulayın:**
Firebase Console'da `firestore.rules` dosyasındaki kuralları uygulayın.

## 📱 Uygulamayı Çalıştırma

**Geliştirme Sunucusunu Başlatın:**
```bash
npm start
# veya
expo start
```

**Platform Seçenekleri:**
- **Android:** Terminalde `a` tuşu
- **iOS:** Terminalde `i` tuşu  
- **Web:** Terminalde `w` tuşu
- **QR Code:** Expo Go uygulaması ile QR kod okutma

## 🔧 Özel Özellikler

### SimpleCaptcha Bileşeni
```typescript
<SimpleCaptcha 
  onVerified={setIsCaptchaVerified}
  resetTrigger={captchaResetTrigger}
/>
```
- Matematik problemleri (toplama, çıkarma, çarpma)
- Gerçek zamanlı doğrulama
- Görsel durum geri bildirimi
- Parent bileşenden reset kontrolü

### SecurityManager Kullanımı
```typescript
const securityManager = SecurityManager.getInstance();

// Güvenlik limiti kontrolü
const check = await securityManager.checkSecurityLimits('login', email);
if (!check.allowed) {
  Alert.alert('Güvenlik Uyarısı', check.reason);
  return;
}

// Deneme kaydı
await securityManager.recordAttempt('login', success, email);
```

### Admin Panel Özellikleri
- **Kullanıcı Arama:** Email, ad, soyad ile filtreleme
- **Manuel Email Doğrulama:** Firebase bypass ile admin onayı
- **Güvenlik Raporu:** Şüpheli cihaz ve aktivite listesi
- **Destek Talep Yönetimi:** Tab bazlı açık/kapalı talep görünümü
- **Real-time Updates:** Firebase listeners ile anlık güncellemeler

## 🔒 Güvenlik En İyi Uygulamaları

### Implemented Security Measures
- ✅ Cihaz parmak izi tabanlı takip
- ✅ Rate limiting ve otomatik engelleme
- ✅ Captcha doğrulama
- ✅ Rol tabanlı erişim kontrolü
- ✅ Real-time güvenlik monitoring
- ✅ Misafir kullanıcı için günlük limit
- ✅ Güvenlik logları ve raporlama

### Firestore Security Rules
```javascript
// Kullanıcılar sadece kendi verilerine erişebilir
match /users/{uid} {
  allow read, update: if request.auth != null && request.auth.uid == uid;
  allow read, update: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

// Destek talepleri - misafir erişimi
match /support_tickets/{ticketId} {
  allow create: if true; // Misafir kullanıcılar talep oluşturabilir
  allow read: if true; // Rate limiting için gerekli
  allow update, delete: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

## � Test ve Debug

### Admin Debug Panel
- Cihaz güvenlik verilerini temizleme
- Test verisi oluşturma
- Güvenlik raporu görüntüleme
- Şüpheli cihaz engelini kaldırma

### Development Tools
```bash
# Lint kontrolü
npm run lint

# Platform specific başlatma
npm run android
npm run ios
npm run web
```

## 🤝 Katkıda Bulunma

1. Projeyi fork'layın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Değişikliklerinizi commit'leyin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push'layın (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

### Kod Standartları
- TypeScript kullanımını tercih edin
- Güvenlik best practices'lerini takip edin
- Component'leri küçük ve yeniden kullanılabilir tutun
- Proper error handling implementasyonu yapın

## 📋 Lisans

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakınız.

## 📞 İletişim

Proje ile ilgili sorularınız için:
- Issue açabilirsiniz
- Pull request gönderebilirsiniz
- Uygulama içi destek sistemi kullanabilirsiniz

---

**Not:** Bu uygulama, modern güvenlik standartlarına uygun olarak geliştirilmiştir. Production ortamında kullanmadan önce güvenlik testlerini tamamlayınız.