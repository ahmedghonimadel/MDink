import { useEffect, useState } from "react";

export type Locale = "ar" | "en";

const STORAGE_KEY = "mdink-locale";

export const dictionary = {
  ar: {
    home: "الرئيسية",
    services: "خدماتنا",
    portfolio: "أعمالنا",
    reviews: "آراء عملائنا",
    blog: "المدونة",
    about: "من نحن",
    contact: "تواصل",
    login: "دخول",
    start: "ابدأ الآن",
    dashboard: "لوحة التحكم",
    quickLinks: "روابط سريعة",
    contactTitle: "تواصل",
    whatsapp: "واتساب",
    rights: "جميع الحقوق محفوظة",
    language: "English",
    menu: "القائمة",
    followFacebook: "تابعنا على فيسبوك",
    contactWhatsApp: "تواصل عبر واتساب",
    join: "ابدأ مشروعك الطبي",
    notFoundTitle: "الصفحة غير موجودة",
    notFoundText: "عذرًا، الصفحة التي تبحث عنها غير متوفرة.",
    backHome: "العودة للرئيسية",
  },
  en: {
    home: "Home",
    services: "Services",
    portfolio: "Portfolio",
    reviews: "Client Reviews",
    blog: "Blog",
    about: "About Us",
    contact: "Contact",
    login: "Login",
    start: "Start now",
    dashboard: "Dashboard",
    quickLinks: "Quick links",
    contactTitle: "Contact",
    whatsapp: "WhatsApp",
    rights: "All rights reserved",
    language: "العربية",
    menu: "Menu",
    followFacebook: "Follow us on Facebook",
    contactWhatsApp: "Contact via WhatsApp",
    join: "Start Your Medical Project",
    notFoundTitle: "Page not found",
    notFoundText: "Sorry, the page you are looking for is not available.",
    backHome: "Back to home",
  },
} as const;

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "ar";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
}

function applyLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  document.body.dir = locale === "ar" ? "rtl" : "ltr";
}

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  useEffect(() => {
    applyLocale(locale);
    const onLocaleChange = () => setLocaleState(getInitialLocale());
    window.addEventListener("storage", onLocaleChange);
    window.addEventListener("mdink-locale-change", onLocaleChange);
    return () => {
      window.removeEventListener("storage", onLocaleChange);
      window.removeEventListener("mdink-locale-change", onLocaleChange);
    };
  }, [locale]);

  function setLocale(next: Locale) {
    window.localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
    applyLocale(next);
    window.dispatchEvent(new Event("mdink-locale-change"));
  }

  return {
    locale,
    t: dictionary[locale],
    setLocale,
    toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
  };
}
