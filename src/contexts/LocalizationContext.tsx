import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import en from '../locales/en';
import es from '../locales/es';
import hi from '../locales/hi';
import ru from '../locales/ru';
import tr from '../locales/tr';
import zh from '../locales/zh';

type Language = 'tr' | 'en' | 'es' | 'zh' | 'ru' | 'hi';
type Translations = typeof tr;

const translations: Record<Language, Translations> = {
  tr,
  en,
  es,
  zh,
  ru,
  hi,
};

interface LocalizationContextType {
  t: (key: keyof Translations) => string;
  currentLanguage: Language;
  changeLanguage: (language: Language) => Promise<void>;
  getCurrentLanguageInfo: () => { code: Language; name: string; flag: string };
  getSupportedLanguages: () => Array<{ code: string; name: string; flag: string }>;
  isLoading: boolean;
  languageVersion: number; // Dil değişikliklerini takip etmek için
}

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

// Cihazın dil ayarından locale belirle
const getDeviceLanguage = (): Language => {
  try {
    const locales = Localization.getLocales();
    const deviceLocale = locales[0];
    
    if (deviceLocale) {
      const languageCode = deviceLocale.languageCode;
      const regionCode = deviceLocale.regionCode;
      
      // Türkçe dil kontrolü - daha kapsamlı
      if (languageCode === 'tr' || 
          regionCode === 'TR' || 
          regionCode === 'CY' || // Kıbrıs
          regionCode === 'AZ' || // Azerbaycan (bazı durumlarda Türkçe)
          deviceLocale.textDirection === 'ltr' && languageCode === 'tr') {
        return 'tr';
      }
      
      // İngilizce dil kontrolü
      if (languageCode === 'en' || 
          ['US', 'GB', 'AU', 'CA', 'NZ', 'IE', 'ZA'].includes(regionCode || '')) {
        return 'en';
      }
      
      // İspanyolca dil kontrolü
      if (languageCode === 'es' || 
          ['ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL'].includes(regionCode || '')) {
        return 'es';
      }
      
      // Çince dil kontrolü
      if (languageCode === 'zh' || 
          ['CN', 'TW', 'HK', 'SG'].includes(regionCode || '')) {
        return 'zh';
      }
      
      // Rusça dil kontrolü
      if (languageCode === 'ru' || 
          ['RU', 'BY', 'KZ', 'KG', 'UZ'].includes(regionCode || '')) {
        return 'ru';
      }
      
      // Hintçe dil kontrolü
      if (languageCode === 'hi' || regionCode === 'IN') {
        return 'hi';
      }
      
      // Desteklenen dillerin kapsamlı kontrolü
      const supportedLanguages: Language[] = ['tr', 'en', 'es', 'zh', 'ru', 'hi'];
      if (supportedLanguages.includes(languageCode as Language)) {
        return languageCode as Language;
      }      
    }
  } catch (error) {
    console.warn('⚠️ Device language detection error:', error);
  }
  
  // Varsayılan: İngilizce
  return 'en';
};

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(getDeviceLanguage());
  const [isLoading, setIsLoading] = useState(true);
  const [languageVersion, setLanguageVersion] = useState(0);

  // Uygulama başladığında kayıtlı dil tercihini yükle
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {        
        // Önce kayıtlı dil tercihini kontrol et
        const savedLanguage = await AsyncStorage.getItem('app_language');
        
        if (savedLanguage && ['tr', 'en', 'es', 'zh', 'ru', 'hi'].includes(savedLanguage)) {
          setCurrentLanguage(savedLanguage as Language);
        } else {
          // Kayıtlı dil yoksa cihaz diline göre ayarla
          const deviceLanguage = getDeviceLanguage();
          setCurrentLanguage(deviceLanguage);
          
          // İlk kez ayarlanan dili kaydet
          await AsyncStorage.setItem('app_language', deviceLanguage);
        }
      } catch (error) {
        console.warn('⚠️ Dil yükleme hatası:', error);
        // Hata durumunda varsayılan dil
        setCurrentLanguage('en');
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedLanguage();
  }, []);

  // Dil değiştir ve kaydet
  const changeLanguage = useCallback(async (language: Language) => {
    try {      
      await AsyncStorage.setItem('app_language', language);
      setCurrentLanguage(language);
      setLanguageVersion(prev => prev + 1); // Version artır
      
    } catch (error) {
      console.error('❌ Dil değiştirme hatası:', error);
    }
  }, [currentLanguage, languageVersion]);

  // Çeviri fonksiyonu
  const t = useCallback((key: keyof Translations): string => {
    return translations[currentLanguage][key] || key;
  }, [currentLanguage]);

  // Mevcut dil bilgisi
  const getCurrentLanguageInfo = useCallback(() => {
    const languageMap: Record<Language, { code: Language; name: string; flag: string }> = {
      tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
      en: { code: 'en', name: 'English', flag: '🇺🇸' },
      es: { code: 'es', name: 'Español', flag: '🇪🇸' },
      zh: { code: 'zh', name: '中文', flag: '🇨🇳' },
      ru: { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      hi: { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    };
    
    return languageMap[currentLanguage] || languageMap.en;
  }, [currentLanguage]);

  // Desteklenen dillerin listesi
  const getSupportedLanguages = useCallback(() => {
    return [
      { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    ];
  }, []);

  const value: LocalizationContextType = {
    t,
    currentLanguage,
    changeLanguage,
    getCurrentLanguageInfo,
    getSupportedLanguages,
    isLoading,
    languageVersion,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = () => {
  const context = useContext(LocalizationContext);
  if (context === undefined) {
    throw new Error('useLocalization must be used within a LocalizationProvider');
  }
  return context;
};

export type { Language, Translations };
