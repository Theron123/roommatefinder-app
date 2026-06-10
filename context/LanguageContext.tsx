import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations } from '../constants/translations';

export type Locale = 'en' | 'es';

type LanguageContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  translateHobby: (hobby: string) => string;
  translateDealbreaker: (db: string) => string;
  translateLifestyleKey: (key: string) => string;
  translateLifestyleVal: (val: string) => string;
  translateLanguage: (lang: string) => string;
  translateHobbiesList: (listStr: string) => string;
  translateDealbreakersList: (listStr: string) => string;
  translatePreferencesList: (listStr: string) => string;
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

  const translateHobby = (hobby: string): string => {
    if (!hobby) return hobby;
    const cleanHobby = hobby.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
    const lowerClean = cleanHobby.toLowerCase();
    const lowerHobby = hobby.toLowerCase();

    // 1. Try main hobbies dict (which preserves emojis)
    const dict = translations[locale]?.hobbies;
    if (dict) {
      if (dict[hobby]) return dict[hobby];
      const foundKey = Object.keys(dict).find(k => k.toLowerCase() === lowerHobby || k.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim().toLowerCase() === lowerClean);
      if (foundKey) return dict[foundKey];
    }

    // 2. Try hobbies_mapped (exact, then case-insensitive fallback)
    const mappedDict = translations[locale]?.hobbies_mapped;
    if (mappedDict) {
      if (mappedDict[hobby]) return mappedDict[hobby];
      if (mappedDict[cleanHobby]) return mappedDict[cleanHobby];
      
      const foundKey = Object.keys(mappedDict).find(k => k.toLowerCase() === lowerHobby || k.toLowerCase() === lowerClean);
      if (foundKey) return mappedDict[foundKey];
    }

    return hobby;
  };

  const translateDealbreaker = (db: string): string => {
    if (!db) return db;
    const cleanDb = db.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
    const lowerClean = cleanDb.toLowerCase();
    const lowerDb = db.toLowerCase();

    // 1. Try main dealbreakers dict (which preserves emojis)
    const dict = translations[locale]?.dealbreakers;
    if (dict) {
      if (dict[db]) return dict[db];
      const foundKey = Object.keys(dict).find(k => k.toLowerCase() === lowerDb || k.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim().toLowerCase() === lowerClean);
      if (foundKey) return dict[foundKey];
    }

    // 2. Try dealbreakers_mapped (exact, then case-insensitive fallback)
    const mappedDict = translations[locale]?.dealbreakers_mapped;
    if (mappedDict) {
      if (mappedDict[db]) return mappedDict[db];
      if (mappedDict[cleanDb]) return mappedDict[cleanDb];
      
      const foundKey = Object.keys(mappedDict).find(k => k.toLowerCase() === lowerDb || k.toLowerCase() === lowerClean);
      if (foundKey) return mappedDict[foundKey];
    }

    return db;
  };

  const translateLifestyleKey = (key: string): string => {
    if (!key) return key;
    const dict = translations[locale]?.lifestyle;
    if (!dict) return key;
    if (dict[key]) return dict[key];
    const lowerKey = key.toLowerCase();
    const foundKey = Object.keys(dict).find(k => k.toLowerCase() === lowerKey);
    return foundKey ? dict[foundKey] : key;
  };

  const translateLifestyleVal = (val: string): string => {
    if (!val) return val;
    const cleanVal = val.replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, "").trim();
    const lowerClean = cleanVal.toLowerCase();
    const lowerVal = val.toLowerCase();

    const dict = translations[locale]?.lifestyle_vals;
    if (!dict) return val;

    // Try exact or case-insensitive matching on full val
    if (dict[val]) return dict[val];
    let foundKey = Object.keys(dict).find(k => k.toLowerCase() === lowerVal);
    if (foundKey) return dict[foundKey];

    // Try exact or case-insensitive matching on clean val
    if (dict[cleanVal]) {
      const emojiMatch = val.match(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g);
      const emoji = emojiMatch ? emojiMatch.join('') + ' ' : '';
      return emoji + dict[cleanVal];
    }
    foundKey = Object.keys(dict).find(k => k.toLowerCase() === lowerClean);
    if (foundKey) {
      const emojiMatch = val.match(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g);
      const emoji = emojiMatch ? emojiMatch.join('') + ' ' : '';
      return emoji + dict[foundKey];
    }

    return val;
  };

  const translateLanguage = (lang: string): string => {
    if (!lang) return lang;
    const dict: Record<string, { en: string; es: string }> = {
      Spanish:    { en: 'Spanish', es: 'Español' },
      English:    { en: 'English', es: 'Inglés' },
      French:     { en: 'French', es: 'Francés' },
      German:     { en: 'German', es: 'Alemán' },
      Portuguese: { en: 'Portuguese', es: 'Portugués' },
      Italian:    { en: 'Italian', es: 'Italiano' },
    };
    return dict[lang]?.[locale] || lang;
  };

  const translateHobbiesList = (listStr: string): string => {
    if (!listStr) return listStr;
    return listStr.split(', ').map(item => translateHobby(item)).join(', ');
  };

  const translateDealbreakersList = (listStr: string): string => {
    if (!listStr) return listStr;
    return listStr.split(', ').map(item => translateDealbreaker(item)).join(', ');
  };

  const translatePreferencesList = (listStr: string): string => {
    if (!listStr) return listStr;
    return listStr.split(', ').map(item => {
      // 1. Try lifestyle val
      const valTrans = translateLifestyleVal(item);
      if (valTrans !== item) return valTrans;
      
      // 2. Try hobby
      const hobbyTrans = translateHobby(item);
      if (hobbyTrans !== item) return hobbyTrans;
      
      // 3. Try dealbreaker
      const dbTrans = translateDealbreaker(item);
      if (dbTrans !== item) return dbTrans;

      return item;
    }).join(', ');
  };

  return (
    <LanguageContext.Provider value={{
      locale,
      setLocale,
      t,
      translateHobby,
      translateDealbreaker,
      translateLifestyleKey,
      translateLifestyleVal,
      translateLanguage,
      translateHobbiesList,
      translateDealbreakersList,
      translatePreferencesList
    }}>
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
