import { createI18n } from 'vue-i18n';
import zh from "../language/zh.json";
import en from "../language/en.json";
import ja from "../language/ja.json";

const i18n = createI18n({
  legacy: false,
  locale: localStorage.getItem("lang") ?? "zh",
  fallbackLocale: "zh",
  globalInjection: true,
  messages: {
    "zh": zh,
    "en": en,
    "ja": ja,
  }
})

export default i18n