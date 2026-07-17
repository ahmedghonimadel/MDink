// الدومين الرسمي (canonical). كل روابط الـ SEO/الـ sitemap/الـ OG تُبنى منه.
// لو اتغيّر الدومين مستقبلًا، غيّره هنا فقط.
export const SITE_ORIGIN = "https://mdinksolutions.com";

/** يبني رابطًا مطلقًا للصفحة على الدومين الرسمي — يُستخدم في canonical و og:url. */
export function canonical(path = "/") {
  return path === "/" ? SITE_ORIGIN : `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export const SITE = {
  name: "MDink Solutions",
  fullName: "MDink for Digital Solutions",
  origin: SITE_ORIGIN,
  tagline: "حلول رقمية احترافية للأطباء والعيادات والمراكز الطبية",
  whatsappNumber: "201015587495",
  whatsappUrl: "https://wa.me/201015587495",
  email: "info@mdinksolutions.com",
  phone: "010 15587495",
  social: {
    facebook: "https://www.facebook.com/MDinksolutions",
    instagram: "https://www.instagram.com/shaima2_fahmy",
    tiktok: "https://www.tiktok.com",
    linkedin: "https://www.linkedin.com/company/mdink/",
    twitter: "",
  },
};
