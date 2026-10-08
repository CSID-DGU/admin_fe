import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko.json";
import en from "./locales/en.json";

i18n.use(LanguageDetector).use(initReactI18next).init({
  resources: { ko: { translation: ko }, en: { translation: en } },
  fallbackLng: "ko",
  supportedLngs: ["ko", "en"],
  detection: { order: ["localStorage"], caches: ["localStorage"] },
  interpolation: { escapeValue: false }
});

// 화면 읽기 프로그램과 브라우저 번역 기능이 문서 언어를 알 수 있게 html lang을 현재 언어에 맞춘다.
const syncDocumentLang = (language) => { document.documentElement.lang = language; };
syncDocumentLang(i18n.resolvedLanguage);
i18n.on("languageChanged", syncDocumentLang);

export default i18n;
