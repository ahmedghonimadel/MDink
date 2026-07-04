// ============================================================
// MDink — طبقة الوصول للمحتوى (schema الجديد النظيف)
// كل استعلامات القراءة العامة في مكان واحد. الصفحات تستدعي هذه الدوال.
// ============================================================
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

// ── page_sections: يرجّع سكشن واحد بمفتاحه ──
export async function getSection(pageSlug: string, sectionKey: string) {
  const { data } = await db
    .from("page_sections")
    .select("*")
    .eq("page_slug", pageSlug)
    .eq("section_key", sectionKey)
    .maybeSingle();
  return data ?? null;
}

// ── كل سكاشن صفحة (مرتبة) ──
export async function getPageSections(pageSlug: string) {
  const { data } = await db
    .from("page_sections")
    .select("*")
    .eq("page_slug", pageSlug)
    .order("display_order");
  const map: Record<string, any> = {};
  (data ?? []).forEach((s: any) => (map[s.section_key] = s));
  return map;
}

// ── site_settings (صف واحد) ──
export async function getSiteSettings() {
  const { data } = await db.from("site_settings").select("*").limit(1).maybeSingle();
  return data ?? null;
}

// ── social_links (النشطة مرتبة) ──
export async function getSocialLinks() {
  const { data } = await db
    .from("social_links")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── services (النشطة مرتبة) ──
export async function getServices() {
  const { data } = await db
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── portfolio_projects ──
export async function getPortfolioProjects() {
  const { data } = await db
    .from("portfolio_projects")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── blog_categories (النشطة) ──
export async function getBlogCategories() {
  const { data } = await db
    .from("blog_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── blog_posts (المنشورة) ──
export async function getBlogPosts() {
  const { data } = await db
    .from("blog_posts")
    .select("*, blog_categories(name, name_en, slug)")
    .eq("is_published", true)
    .order("display_order");
  return data ?? [];
}

export async function getBlogPost(slug: string) {
  const { data } = await db
    .from("blog_posts")
    .select("*, blog_categories(name, name_en, slug)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  return data ?? null;
}

// ── video_testimonials ──
export async function getVideoTestimonials() {
  const { data } = await db
    .from("video_testimonials")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── written_testimonials ──
export async function getWrittenTestimonials() {
  const { data } = await db
    .from("written_testimonials")
    .select("*")
    .eq("is_active", true)
    .order("display_order");
  return data ?? [];
}

// ── contact_submissions: إدراج طلب جديد ──
export async function submitContact(payload: Record<string, any>) {
  return db.from("contact_submissions").insert(payload);
}

// ── helper: قيمة من content_json مع لغة ──
export function sectionText(section: any, base: string, locale: string) {
  if (!section) return "";
  const cj = section.content_json ?? {};
  return cj[`${base}_${locale}`] ?? cj[`${base}_ar`] ?? section[base] ?? "";
}

// ── SEO لكل صفحة: يقرأ من page_sections (section_key='seo') بأمان ──
export async function getPageSeo(pageSlug: string) {
  try {
    const { data } = await db
      .from("page_sections")
      .select("title, subtitle, content_json")
      .eq("page_slug", pageSlug)
      .eq("section_key", "seo")
      .maybeSingle();
    if (!data) return null;
    const cj = data.content_json ?? {};
    return {
      meta_title_ar: data.title ?? cj.meta_title_ar ?? null,
      meta_description_ar: data.subtitle ?? cj.meta_description_ar ?? null,
      canonical_url: cj.canonical_url ?? null,
      robots: cj.robots ?? "index,follow",
      og_image_url: cj.og_image_url ?? null,
    };
  } catch {
    return null;
  }
}
