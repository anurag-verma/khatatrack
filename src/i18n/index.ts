import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './en.json';
import hi from './hi.json';

const LANGUAGE_KEY = 'language';

let initialized = false;

export const initI18n = async () => {
  if (initialized) return;
  initialized = true;

  let storedLang = null;
  try {
    storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {}

  let lng = storedLang;
  if (!lng) {
    const locales = getLocales();
    const primary = locales[0]?.languageTag || 'en';
    lng = primary.startsWith('hi') ? 'hi' : 'en';
  }

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
    },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });
};

export const changeLanguage = async (lang: 'en' | 'hi') => {
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
};

export default i18n;
