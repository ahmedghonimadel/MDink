import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "./site-config";

export type SiteConfigMap = Record<string, string>;

const FALLBACK: SiteConfigMap = {
  contact_phone: SITE.phone,
  contact_email: SITE.email,
  whatsapp_number: SITE.whatsappNumber,
  facebook_url: SITE.social.facebook,
  instagram_url: SITE.social.instagram,
  linkedin_url: SITE.social.linkedin,
  twitter_url: SITE.social.twitter,
  tiktok_url: SITE.social.tiktok,
  site_logo: "",
  site_name: "MDink Solutions",
  site_name_en: "MDink Solutions",
  footer_about_text:
    "شريكك الرقمي المتخصص في القطاع الطبي: مواقع احترافية مملوكة للطبيب، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية تجذب المرضى الحقيقيين.",
  footer_about_text_en:
    "Your medical-sector digital partner: owned professional websites, social media management, medical SEO, and campaigns that attract real patients.",
  meta_title_suffix: SITE.name,
};

export function useSiteConfig() {
  const { data } = useQuery({
    queryKey: ["site_settings_map"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SiteConfigMap> => {
      const db = supabase as any;
      const map: SiteConfigMap = { ...FALLBACK };
      // site_settings (صف واحد)
      const s = (await db.from("site_settings").select("*").limit(1).maybeSingle()).data;
      if (s) {
        if (s.brand_name) { map.site_name = s.brand_name; map.site_name_en = s.brand_name; }
        if (s.logo_url) map.site_logo = s.logo_url;
        if (s.phone) map.contact_phone = s.phone;
        if (s.email) map.contact_email = s.email;
        if (s.whatsapp_number) map.whatsapp_number = s.whatsapp_number;
        if (s.whatsapp_default_message) map.whatsapp_message = s.whatsapp_default_message;
        map.whatsapp_floating_enabled = s.is_whatsapp_floating_enabled ? "1" : "0";
      }
      // social_links → روابط منفصلة
      const links = (await db.from("social_links").select("*").eq("is_active", true)).data ?? [];
      for (const l of links) {
        const key = `${(l.platform || "").toLowerCase()}_url`;
        if (l.url) map[key] = l.url;
      }
      return map;
    },
  });
  return data ?? FALLBACK;
}

export function whatsappUrlFrom(number: string) {
  const clean = (number || "").replace(/[^\d]/g, "");
  return `https://wa.me/${clean}`;
}
