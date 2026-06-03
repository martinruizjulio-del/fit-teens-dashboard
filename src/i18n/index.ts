import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import es from "./locales/es.json";
import val from "./locales/val.json";
import en from "./locales/en.json";

export const SUPPORTED_LANGS = [
  { code: "es", label: "Español" },
  { code: "val", label: "Valencià" },
  { code: "en", label: "English" },
] as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      val: { translation: val },
      en: { translation: en },
    },
    fallbackLng: "es",
    supportedLngs: ["es", "val", "en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "cfs_lang",
    },
  });

export default i18n;
