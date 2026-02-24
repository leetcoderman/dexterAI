import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Placeholder english translations
const en = {
    translation: {
        welcome: "Welcome to dexterAI",
        // More translations to be added in later phases
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en
        },
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
