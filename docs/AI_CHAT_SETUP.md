# AI Chat Setup Guide

## Google Gemini API Key Kurulumu

### 1. Google AI Studio'da API Key Alma
1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. Google hesabınızla giriş yapın
3. "Create API Key" butonuna tıklayın
4. API key'inizi kopyalayın

### 2. API Key'i Uygulamaya Ekleme
`app/(tabs)/ai-chat.tsx` dosyasındaki şu satırı güncelleyin:

```typescript
// Eski
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY_HERE';

// Yeni (sizin API key'inizle)
const GEMINI_API_KEY = 'AIzaSyC...'; // Gerçek API key'inizi buraya yazın
```

### 3. Ücretsiz Kullanım Limitleri
- **Günlük**: 1500 istek
- **Dakika başı**: 60 istek
- **Model**: Gemini Pro (ücretsiz)

### 4. API Özellikleri
- ✅ Türkçe destek
- ✅ Sağlık ve ilaç konularında uzmanlaşmış
- ✅ 6 dilde localization
- ✅ Güvenlik önlemleri (sadece sağlık konuları)
- ✅ Chat geçmişi

### 5. Test Etme
1. Uygulamayı başlatın
2. "AI Chat" sekmesine gidin
3. Sağlık veya ilaç hakkında soru sorun
4. AI'dan yanıt geldiğini kontrol edin

### 6. Alternatif API'ler (İsteğe bağlı)
Eğer Gemini API çalışmazsa, şu alternatifleri kullanabilirsiniz:

#### A) Hugging Face (Ücretsiz)
- Model: microsoft/DialoGPT-medium
- Limit: Sınırsız ama yavaş

#### B) OpenAI GPT-3.5 Turbo
- $5 başlangıç kredisi
- Sonrası ücretli

### 7. Güvenlik Notları
- API key'inizi asla public repository'de paylaşmayın
- Production'da environment variable kullanın
- Rate limiting implemented (dakika başı max istek)

### 8. Sorun Giderme
- API key doğru mu kontrol edin
- Internet bağlantısını test edin
- Console log'larını inceleyin
- Rate limit aşıldı mı kontrol edin

### 9. Özellik Listesi ✅
- [x] 6 dilde chat desteği
- [x] Sağlık/ilaç odaklı AI
- [x] Chat geçmişi
- [x] Mesaj silme
- [x] Loading durumu
- [x] Error handling
- [x] Responsive design
- [x] Accessibility
- [x] Rate limiting koruması

Bu rehberi takip ederek AI Chat özelliğiniz hazır!
