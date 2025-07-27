import PremiumModal from '@/components/PremiumModal';
import { COLORS, FONTS, SIZES } from '@/constants/theme';
import { useLocalization } from '@/hooks/useLocalization';
import usePremiumLimit from '@/hooks/usePremiumLimit';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function AIChatScreen() {
  const { t, currentLanguage } = useLocalization();
  const { isPremium, medicineCount } = usePremiumLimit();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      text: t('aiWelcomeMessage'),
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // API anahtarını buraya ekleyeceksiniz
  const GEMINI_API_KEY = 'AIzaSyBjXdLDop89Zs5Us8gGRLMkRl6C5YSPbRg'; // Gemini API Key
  const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

  const sendMessage = async () => {

    if (!inputText.trim()) return;

    // Sağlık dışı konuları filtrele
    const forbiddenKeywords = [
      'futbol', 'spor', 'oyun', 'film', 'müzik', 'sanat', 'teknoloji', 'yapay zeka', 'futbolcu', 'takım', 'maç', 'gol', 'basketbol', 'voleybol', 'sinema', 'dizi', 'oyuncu', 'şarkı', 'albüm', 'konser', 'bilgisayar', 'programlama', 'kod', 'yazılım', 'robot', 'otomobil', 'araba', 'uçak', 'uzay', 'bilim', 'matematik', 'fizik', 'kimya', 'biyoloji', 'tarih', 'coğrafya', 'siyaset', 'ekonomi', 'finans', 'borsa', 'yatırım', 'kripto', 'bitcoin', 'ethereum', 'blockchain', 'internet', 'web', 'sosyal medya', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'discord', 'oyun', 'game', 'play', 'movie', 'music', 'art', 'technology', 'ai', 'football', 'team', 'match', 'goal', 'basketball', 'volleyball', 'cinema', 'series', 'actor', 'song', 'album', 'concert', 'computer', 'programming', 'code', 'software', 'robot', 'car', 'automobile', 'plane', 'space', 'science', 'math', 'physics', 'chemistry', 'biology', 'history', 'geography', 'politics', 'economy', 'finance', 'stock', 'investment', 'crypto', 'bitcoin', 'ethereum', 'blockchain', 'internet', 'web', 'social media', 'instagram', 'twitter', 'facebook', 'youtube', 'tiktok', 'snapchat', 'whatsapp', 'telegram', 'discord'
    ];
    const lowerInput = inputText.trim().toLowerCase();
    if (forbiddenKeywords.some(word => lowerInput.includes(word))) {
      Alert.alert(
        t('error'),
        'Bu sohbet sadece ilaç ve sağlık konularında bilgi vermektedir. Lütfen sağlıkla ilgili bir soru sorun.'
      );
      return;
    }

    // API key kontrolü
    if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 30) {
      Alert.alert(
        t('error'),
        'AI API anahtarı geçersiz. Lütfen geliştiriciyle iletişime geçin.'
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Kullanıcının diline göre AI prompt'u hazırla
      let aiPrompt = '';
      switch (currentLanguage) {
        case 'tr':
          aiPrompt = `Sen bir sağlık asistanısın. Sadece ilaç ve sağlık konularında genel bilgi ver, kesin teşhis koyma. Her yanıtının sonunda mutlaka 'Sağlık sorunlarınız için mutlaka doktora danışınız.' cümlesini ekle. Soru: ${userMessage.text}`;
          break;
        case 'en':
          aiPrompt = `You are a health assistant. Only provide general information about medicine and health, do not make definitive diagnoses. Always end your answer with: 'For any health issues, please consult a doctor.' Question: ${userMessage.text}`;
          break;
        case 'es':
          aiPrompt = `Eres un asistente de salud. Solo proporciona información general sobre medicina y salud, no hagas diagnósticos definitivos. Termina siempre tu respuesta con: 'Para cualquier problema de salud, consulte a un médico.' Pregunta: ${userMessage.text}`;
          break;
        case 'zh':
          aiPrompt = `你是一个健康助手。只提供医学和健康方面的一般信息，不要做出明确诊断。每次回答最后都要加上：'如有健康问题，请务必咨询医生。' 问题：${userMessage.text}`;
          break;
        case 'ru':
          aiPrompt = `Вы - помощник по здоровью. Предоставляйте только общую информацию о медицине и здоровье, не ставьте окончательные диагнозы. Всегда заканчивайте свой ответ фразой: 'По всем вопросам здоровья обязательно проконсультируйтесь с врачом.' Вопрос: ${userMessage.text}`;
          break;
        case 'hi':
          aiPrompt = `आप एक स्वास्थ्य सहायक हैं। केवल दवा और स्वास्थ्य के बारे में सामान्य जानकारी दें, निश्चित निदान न करें। हर उत्तर के अंत में जरूर लिखें: 'किसी भी स्वास्थ्य समस्या के लिए कृपया डॉक्टर से सलाह लें।' प्रश्न: ${userMessage.text}`;
          break;
        default:
          aiPrompt = `You are a health assistant. Only provide general information about medicine and health, do not make definitive diagnoses. Always end your answer with: 'For any health issues, please consult a doctor.' Question: ${userMessage.text}`;
      }

      // Gemini AI API çağrısı
      const response = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: aiPrompt
            }]
          }]
        })
      });
      
      const data = await response.json();
      
      // HTTP status kontrolü
      if (!response.ok) {
        console.error('❌ HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${data.error?.message || response.statusText}`);
      }
      
      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          text: data.candidates[0].content.parts[0].text,
          isUser: false,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiResponse]);
      } else {
        throw new Error('AI yanıt alınamadı');
      }
    } catch (error) {
      console.error('🚨 AI API Error:', error);
      console.error('🚨 Error details:', JSON.stringify(error, null, 2));
      
      let errorText = t('aiErrorMessage');
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Ağ hatası kontrolü
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        errorText = 'İnternet bağlantınızı kontrol edin.';
      }
      // API quota hatası kontrolü  
      else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        errorText = 'API limiti aşıldı. Lütfen daha sonra tekrar deneyin.';
      }
      // API key hatası kontrolü
      else if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        errorText = 'API anahtarı geçersiz.';
      }
      
      const chatErrorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: errorText,
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, chatErrorMessage]);
    } finally {
      setIsLoading(false);
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const clearChat = () => {
    Alert.alert(
      t('clearChat'),
      t('clearChatConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clear'),
          style: 'destructive',
          onPress: () => {
            setMessages([{
              id: '1',
              text: t('aiWelcomeMessage'),
              isUser: false,
              timestamp: new Date()
            }]);
          }
        }
      ]
    );
  };

  const renderMessage = (message: ChatMessage) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.aiMessage
      ]}
    >
      <View style={styles.messageHeader}>
        <MaterialCommunityIcons
          name={message.isUser ? 'account' : 'robot'}
          size={20}
          color={message.isUser ? COLORS.white : COLORS.primary}
        />
        <Text style={[
          styles.messageSender,
          { color: message.isUser ? COLORS.white : COLORS.primary }
        ]}>
          {message.isUser ? t('you') : 'AI Assistant'}
        </Text>
      </View>
      <Text style={[
        styles.messageText,
        { color: message.isUser ? COLORS.white : COLORS.darkGray }
      ]}>
        {message.text}
      </Text>
      <Text style={[
        styles.messageTime,
        { color: message.isUser ? COLORS.lightGray : COLORS.gray }
      ]}>
        {message.timestamp.toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons name="robot" size={28} color={COLORS.primary} />
            <Text style={styles.headerTitle}>{t('aiChat')}</Text>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.clearButton}>
            <MaterialCommunityIcons name="delete-outline" size={24} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingText}>{t('aiThinking')}</Text>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder={t('aiInputPlaceholder')}
            placeholderTextColor={COLORS.gray}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!isLoading && isPremium}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || !isPremium) && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading || !isPremium}
          >
            <MaterialCommunityIcons
              name="send"
              size={24}
              color={(!inputText.trim() || isLoading || !isPremium) ? COLORS.gray : COLORS.white}
            />
          </TouchableOpacity>
        </View>
        {/* Premium olmayanlar için uyarı */}
        {!isPremium && (
          <View style={{padding: SIZES.large, alignItems: 'center'}}>
            <View style={{
              backgroundColor: COLORS.white,
              borderRadius: SIZES.large,
              borderWidth: 2,
              borderColor: COLORS.primary,
              padding: SIZES.large,
              shadowColor: COLORS.primary,
              shadowOpacity: 0.15,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
              alignItems: 'center',
              maxWidth: 340
            }}>
              <MaterialCommunityIcons name="crown" size={32} color={COLORS.primary} style={{marginBottom: SIZES.small}} />
              <Text style={{
                color: COLORS.primary,
                fontFamily: FONTS.bold,
                fontSize: SIZES.large,
                marginBottom: SIZES.small,
                textAlign: 'center'
              }}>
                {t('premiumRequiredMessage')}
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: SIZES.large,
                  paddingVertical: SIZES.small,
                  paddingHorizontal: SIZES.large,
                  marginTop: SIZES.small
                }}
                onPress={() => setPremiumModalVisible(true)}
              >
                <Text style={{
                  color: COLORS.white,
                  fontFamily: FONTS.bold,
                  fontSize: SIZES.font,
                  textAlign: 'center'
                }}>
                  {t('goPremium')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        <PremiumModal visible={premiumModalVisible} onClose={() => setPremiumModalVisible(false)} currentMedicineCount={medicineCount} />

        {/* Disclaimer */}
        <View style={styles.disclaimerContainer}>
          <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.gray} />
          <Text style={styles.disclaimerText}>{t('aiDisclaimer')}</Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.large,
    paddingVertical: SIZES.medium,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: SIZES.large,
    fontFamily: FONTS.bold,
    color: COLORS.darkGray,
    marginLeft: SIZES.small,
  },
  clearButton: {
    padding: SIZES.small,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: SIZES.medium,
    paddingBottom: SIZES.large,
  },
  messageContainer: {
    marginBottom: SIZES.medium,
    padding: SIZES.medium,
    borderRadius: SIZES.medium,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: COLORS.primary,
    alignSelf: 'flex-end',
  },
  aiMessage: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.small,
  },
  messageSender: {
    fontSize: SIZES.font,
    fontFamily: FONTS.semiBold,
    marginLeft: SIZES.small,
  },
  messageText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    lineHeight: 20,
    marginBottom: SIZES.small,
  },
  messageTime: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.medium,
    backgroundColor: COLORS.lightGray,
    borderRadius: SIZES.medium,
    alignSelf: 'flex-start',
    marginBottom: SIZES.medium,
  },
  loadingText: {
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
    marginLeft: SIZES.small,
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: SIZES.large,
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    fontSize: SIZES.font,
    fontFamily: FONTS.regular,
    color: COLORS.darkGray,
    maxHeight: 100,
    marginRight: SIZES.small,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.large,
    padding: SIZES.small,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.lightGray,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SIZES.medium,
    paddingVertical: SIZES.small,
    backgroundColor: COLORS.lightGray,
  },
  disclaimerText: {
    fontSize: SIZES.small,
    fontFamily: FONTS.regular,
    color: COLORS.gray,
    marginLeft: SIZES.small,
    flex: 1,
    lineHeight: 16,
  },
});
