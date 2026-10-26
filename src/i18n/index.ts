import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';

/**
 * English only in v1. Every visible string goes through t(), so Urdu is a second
 * resource file (and an RTL layout pass) later, not a rewrite.
 */
// eslint-disable-next-line import/no-named-as-default-member -- the documented i18next setup
i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
