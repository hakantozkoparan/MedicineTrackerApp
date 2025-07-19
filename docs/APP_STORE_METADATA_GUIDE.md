# App Store Connect Metadata Kılavuzu

## 🎯 Missing Metadata'ları Tamamlama

Şu anda eksik olan 3 subscription için metadata'ları tamamlamanız gerekiyor:

### 1. 3-Month Premium (com.hkntzkprn.MedicineTrackerApp.threemonth)

**Gerekli Alanlar:**
- **Display Name (Türkçe)**: "3 Aylık Premium"
- **Description (Türkçe)**: "3 aylık premium abonelik ile tüm özelliklerimizin keyfini çıkarın. %15 tasarruf edin!"
- **Review Information**: "Quarterly premium subscription for advanced features"
- **Promotional Text**: "3 ay boyunca premium deneyim!"

**Localizations:**
- Turkish (tr): Ana dil
- English (en): İkinci dil

### 2. 6-Month Premium (com.hkntzkprn.MedicineTrackerApp.sixmonth)

**Gerekli Alanlar:**
- **Display Name (Türkçe)**: "6 Aylık Premium"
- **Description (Türkçe)**: "6 aylık premium abonelik ile uzun vadeli tasarruf yapın. %25 indirim!"
- **Review Information**: "Semi-annual premium subscription for advanced features"
- **Promotional Text**: "6 ay premium, büyük tasarruf!"

### 3. Yearly Premium (com.hkntzkprn.MedicineTrackerApp.annual)

**Gerekli Alanlar:**
- **Display Name (Türkçe)**: "Yıllık Premium"
- **Description (Türkçe)**: "Yıllık premium abonelik ile en büyük tasarrufu yapın. %40 indirim!"
- **Review Information**: "Annual premium subscription for advanced features"
- **Promotional Text**: "En popüler seçim! 1 yıl premium!"

## 📝 Adım Adım Metadata Ekleme

### Her Subscription İçin:

1. **App Store Connect** → Uygulamanız → **Features** → **In-App Purchases**
2. İlgili subscription'ı seçin
3. **Metadata** sekmesine gidin
4. Aşağıdaki alanları doldurun:

#### A) Product Information
- **Display Name**: Yukarıdaki örneklerden kopyalayın
- **Description**: Detaylı açıklama

#### B) Review Information (Apple için)
- **Screenshot**: Premium özelliklerini gösteren screenshot
- **Review Notes**: İnceleyici için açıklama

#### C) App Store Promotion (Opsiyonel)
- **Promotional Text**: Pazarlama metni
- **Promotional Image**: Tanıtım görseli

#### D) Subscription Information
- **Subscription Group**: Aynı gruba koyun
- **Family Sharing**: Etkinleştirin

### 4. Localization Ekleme

Her subscription için:
1. **Add Localization** → **Turkish**
2. **Add Localization** → **English**
3. Her dil için metadata'ları girin

## ⚠️ Önemli Notlar

- **Tüm alanları doldurmak zorundasınız**
- **Screenshots eklemeyi unutmayın**
- **Review Notes açık ve net olmalı**
- **Save edip "Submit for Review" yapmayın henüz**

## 🎯 Hedef Durum

Tüm metadata'lar tamamlandıktan sonra durumunuz şöyle olmalı:

```
1. Monthly Premium - Ready to Submit ✅
2. 3-Month Premium - Ready to Submit ✅
3. 6-Month Premium - Ready to Submit ✅  
4. Yearly Premium - Ready to Submit ✅
```

Bu duruma geldikten sonra development build ile test edebilirsiniz.
