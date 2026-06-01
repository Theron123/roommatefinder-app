import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

export type Locale = 'en' | 'es';

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLocale = await AsyncStorage.getItem('@user_locale');
      if (savedLocale === 'es' || savedLocale === 'en') {
        setLocaleState(savedLocale);
      }
    } catch (e) {
      console.log('Failed to load language preference:', e);
    }
  };

  const setLocale = async (newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      await AsyncStorage.setItem('@user_locale', newLocale);
    } catch (e) {
      console.log('Failed to save language preference:', e);
    }
  };

  const t = (key: string, fallback?: string): string => {
    const activeTranslations = translations[locale] as Record<string, string>;
    if (!activeTranslations) return fallback || key;
    
    // Support nested object access e.g., 'profile.title'
    const parts = key.split('.');
    let current: any = activeTranslations;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return fallback || key;
      }
    }

    return typeof current === 'string' ? current : (fallback || key);
  };

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
