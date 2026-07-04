import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { MarketingLayout } from "@/components/MarketingLayout";
import {
  Award,
  ExternalLink,
  Globe,
  Facebook,
  Instagram,
  Video,
  Search,
  CalendarRange,
  X,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { useLocale } from "@/lib/i18n";
import { openExternal } from "@/lib/external-links";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/portfolio")({
  loader: async () => {
    const data = await getPageSeo("portfolio");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink Solutions — أعمالنا";
    const desc =
      seo?.meta_description_ar ||
      "نماذج حقيقية من مواقع طبية، صفحات سوشيال ميديا، جلسات تصوير، ونتائج ظهور بحثي من MDink Solutions.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "robots", content: seo?.robots || "index,follow" },
      ],
      links: seo?.canonical_url ? [{ rel: "canonical", href: seo.canonical_url }] : [],
    };
  },
  component: PortfolioPage,
});

// ——— البيانات المبدئية (تظهر فورًا، وتُستبدل بمحتوى لوحة التحكم عند توفره) ———
type Item = {
  slug: string;
  title_ar: string;
  title_en: string;
  client_name: string;
  category: string;
  description_ar: string;
  description_en: string;
  tags_ar: string[];
  tags_en: string[];
  website_url?: string | null;
  thumbnail_url?: string | null;
  proof_label_ar: string;
  proof_label_en: string;
  is_featured: boolean;
  action_ar: string;
  action_en: string;
};

const SEED: Item[] = [
  {
    slug: "allam-heart-care",
    title_ar: "علام هارت كير",
    title_en: "Allam Heart Care",
    client_name: "Allam Heart Care",
    category: "medical_websites",
    description_ar:
      "موقع طبي متخصص يعرض خدمات القلب بشكل احترافي ويساعد المرضى على الوصول للمعلومات والحجز بسهولة.",
    description_en:
      "A specialized medical website presenting heart care services professionally and helping patients access information and book easily.",
    tags_ar: ["موقع طبي", "تصميم طبي", "حجز واستفسارات"],
    tags_en: ["Medical Website", "Medical Design", "Booking & Inquiries"],
    website_url: "https://allamheartcare.com/",
    proof_label_ar: "موقع",
    proof_label_en: "Website",
    is_featured: true,
    action_ar: "زيارة الموقع",
    action_en: "Visit Website",
  },
  {
    slug: "hawa-clinic",
    title_ar: "هو كلينك",
    title_en: "Hawa Clinic",
    client_name: "Hawa Clinic",
    category: "medical_websites",
    description_ar: "موقع طبي موجه لخدمات العيادة، مصمم لعرض التخصصات وبناء الثقة مع الزائرات.",
    description_en:
      "A clinic website designed to present services clearly and build trust with patients.",
    tags_ar: ["عيادة طبية", "موقع متجاوب", "ظهور بحثي"],
    tags_en: ["Medical Clinic", "Responsive Website", "Search Visibility"],
    website_url: "https://howaclinic.com/",
    proof_label_ar: "موقع",
    proof_label_en: "Website",
    is_featured: true,
    action_ar: "زيارة الموقع",
    action_en: "Visit Website",
  },
  {
    slug: "eyadaty",
    title_ar: "عيادتي",
    title_en: "Eyadaty",
    client_name: "Eyadaty",
    category: "medical_websites",
    description_ar:
      "منصة طبية لخدمات صحة المرأة تجمع المعلومات والخدمات في تجربة رقمية واضحة ومطمئنة.",
    description_en:
      "A women's health platform that brings services and information together in a clear, reassuring digital experience.",
    tags_ar: ["صحة المرأة", "منصة طبية", "تجربة مستخدم"],
    tags_en: ["Women's Health", "Medical Platform", "User Experience"],
    website_url: "https://3eyadaty-eg.com/",
    proof_label_ar: "موقع",
    proof_label_en: "Website",
    is_featured: true,
    action_ar: "زيارة الموقع",
    action_en: "Visit Website",
  },
  {
    slug: "seniors-clinic",
    title_ar: "سينيورز كلينك",
    title_en: "Seniors Clinic",
    client_name: "Seniors Clinic",
    category: "medical_websites",
    description_ar:
      "موقع طبي مخصص لخدمات كبار السن، يوضح الخدمات ويجعل التواصل والحجز أكثر سهولة.",
    description_en:
      "A medical website for senior care services, presenting services clearly and making contact and booking easier.",
    tags_ar: ["رعاية كبار السن", "موقع طبي", "سهولة التواصل"],
    tags_en: ["Senior Care", "Medical Website", "Easy Contact"],
    website_url: "https://seniors-clinic.com/",
    proof_label_ar: "موقع",
    proof_label_en: "Website",
    is_featured: true,
    action_ar: "زيارة الموقع",
    action_en: "Visit Website",
  },
  {
    slug: "dr-aziza-elgabbas",
    title_ar: "صفحة د. عزيزة الجباس",
    title_en: "Dr. Aziza El Gabbas Page",
    client_name: "Dr. Aziza El Gabbas",
    category: "social_media",
    description_ar:
      "إدارة حضور اجتماعي طبي يساعد على تقديم الطبيب وخدماته بشكل واضح ومهني للجمهور.",
    description_en:
      "Medical social media presence management that presents the doctor and services clearly and professionally.",
    tags_ar: ["فيسبوك", "محتوى طبي", "إدارة سوشيال"],
    tags_en: ["Facebook", "Medical Content", "Social Management"],
    website_url: "https://www.facebook.com/DR.AzizaElGabbas",
    proof_label_ar: "سوشيال ميديا",
    proof_label_en: "Social Media",
    is_featured: false,
    action_ar: "عرض الصفحة",
    action_en: "View Page",
  },
  {
    slug: "dr-manal-elafifi",
    title_ar: "صفحة د. منال العفيفي",
    title_en: "Dr. Manal El Afifi Page",
    client_name: "Dr. Manal El Afifi",
    category: "social_media",
    description_ar:
      "صفحة طبية تساعد على بناء الظهور الرقمي للطبيب من خلال محتوى منظم وتصميمات مناسبة.",
    description_en:
      "A medical page that supports the doctor's digital presence through organized content and suitable visuals.",
    tags_ar: ["فيسبوك", "تصميمات طبية", "محتوى منظم"],
    tags_en: ["Facebook", "Medical Graphics", "Organized Content"],
    website_url: "https://www.facebook.com/profile.php?id=100065293160185",
    proof_label_ar: "سوشيال ميديا",
    proof_label_en: "Social Media",
    is_featured: false,
    action_ar: "عرض الصفحة",
    action_en: "View Page",
  },
  {
    slug: "in-clinic-shoot",
    title_ar: "جلسة تصوير طبية داخل العيادة",
    title_en: "In-Clinic Medical Shoot",
    client_name: "MDink Solutions Medical Content",
    category: "medical_photography",
    description_ar:
      "توثيق حقيقي من داخل العيادة لإظهار الطبيب، المكان، الأجهزة، وطريقة العمل بصورة مهنية تعزز ثقة المريض.",
    description_en:
      "Real in-clinic content showing the doctor, place, equipment, and workflow professionally to build patient trust.",
    tags_ar: ["تصوير طبي", "ريلز", "محتوى حقيقي"],
    tags_en: ["Medical Shoot", "Reels", "Real Content"],
    website_url: "https://www.facebook.com/share/r/1Pkar3PL4o/",
    proof_label_ar: "تصوير طبي",
    proof_label_en: "Medical Shoot",
    is_featured: false,
    action_ar: "مشاهدة الريل",
    action_en: "Watch Reel",
  },
  {
    slug: "medical-video-content",
    title_ar: "محتوى فيديو طبي",
    title_en: "Medical Video Content",
    client_name: "MDink Solutions Medical Content",
    category: "medical_photography",
    description_ar:
      "فيديو قصير مناسب للسوشيال والإعلانات، يعرض الخدمة الطبية بشكل واقعي ومطمئن.",
    description_en:
      "A short-form video suitable for social media and ads, presenting the medical service in a realistic and reassuring way.",
    tags_ar: ["إنستجرام", "فيديو طبي", "محتوى إعلاني"],
    tags_en: ["Instagram", "Medical Video", "Ad Content"],
    website_url: "https://www.instagram.com/reel/DNyFBP1WNB9/?igsh=OWFqeGl2aW94MTdq",
    proof_label_ar: "تصوير طبي",
    proof_label_en: "Medical Shoot",
    is_featured: false,
    action_ar: "مشاهدة الريل",
    action_en: "Watch Reel",
  },
  {
    slug: "monthly-work-may-2023",
    title_ar: "جزء من أعمالنا — مايو 2023",
    title_en: "Part of Our Work — May 2023",
    client_name: "MDink for Digital Solutions",
    category: "monthly_work",
    description_ar:
      "نموذج من الأعمال الشهرية التي توضح تنوع خدمات MDink Solutions في التصميم، المحتوى، والسوشيال ميديا.",
    description_en:
      "A monthly work highlight showing MDink Solutions's range of services across design, content, and social media.",
    tags_ar: ["أعمال شهرية", "محتوى طبي", "تصميمات"],
    tags_en: ["Monthly Work", "Medical Content", "Designs"],
    website_url: "https://www.facebook.com/share/p/1ErVrDaL2p/",
    proof_label_ar: "أعمال شهرية",
    proof_label_en: "Monthly Work",
    is_featured: false,
    action_ar: "عرض المنشور",
    action_en: "View Post",
  },
  {
    slug: "seo-first-page",
    title_ar: "ظهور مقال طبي في الصفحة الأولى",
    title_en: "Medical Article on the First Search Page",
    client_name: "SEO Medical Content",
    category: "seo_results",
    description_ar:
      "دليل ظهور محتوى طبي ضمن نتائج البحث الأولى في جوجل، مما يعزز الثقة ويساعد على جذب زيارات مؤهلة من المرضى.",
    description_en:
      "Documented proof of medical content appearing among top Google search results, helping build trust and attract qualified patient traffic.",
    tags_ar: ["ظهور في جوجل", "SEO طبي", "محتوى طبي", "نتائج بحث"],
    tags_en: ["Google Visibility", "Medical SEO", "Medical Content", "Search Results"],
    website_url: null,
    thumbnail_url: "/portfolio/seo-proof-howaclinic.png",
    proof_label_ar: "إثبات SEO",
    proof_label_en: "SEO Proof",
    is_featured: false,
    action_ar: "عرض الإثبات",
    action_en: "View Proof",
  },
];

const CATEGORY_META: Record<
  string,
  { ar: string; en: string; icon: typeof Globe }
> = {
  medical_websites: { ar: "مواقع طبية", en: "Medical Websites", icon: Globe },
  social_media: { ar: "سوشيال ميديا", en: "Social Media", icon: Facebook },
  medical_photography: { ar: "تصوير طبي", en: "Medical Photography", icon: Video },
  seo_results: { ar: "SEO ونتائج بحث", en: "SEO & Search Results", icon: Search },
  monthly_work: { ar: "أعمال شهرية", en: "Monthly Work", icon: CalendarRange },
};

const FILTERS = [
  { key: "all", ar: "الكل", en: "All" },
  { key: "medical_websites", ar: "مواقع طبية", en: "Medical Websites" },
  { key: "social_media", ar: "سوشيال ميديا", en: "Social Media" },
  { key: "medical_photography", ar: "تصوير طبي", en: "Medical Photography" },
  { key: "seo_results", ar: "SEO ونتائج بحث", en: "SEO & Search Results" },
  { key: "monthly_work", ar: "أعمال شهرية", en: "Monthly Work" },
];

const STATS = [
  { icon: Globe, ar: "4+ مواقع طبية", en: "4+ Medical Websites" },
  { icon: Facebook, ar: "صفحات سوشيال نشطة", en: "Active Social Pages" },
  { icon: Video, ar: "تصوير طبي حقيقي", en: "Real Medical Shoots" },
  { icon: Search, ar: "ظهور بحثي موثق", en: "Verified Search Visibility" },
];

const PAGE = {
  badge_ar: "دراسات حالة موثقة",
  badge_en: "Verified Case Studies",
  title_ar: "أعمالنا",
  title_en: "Our Work",
  intro_ar:
    "نماذج حقيقية من مواقع طبية، صفحات سوشيال ميديا، جلسات تصوير، ونتائج ظهور بحثي تساعد الأطباء والعيادات والمراكز الطبية على بناء ثقة رقمية أقوى.",
  intro_en:
    "Real examples of medical websites, social media pages, medical content production, and search visibility results that help doctors, clinics, and medical centers build stronger digital trust.",
  featured_ar: "مواقع طبية أطلقناها",
  featured_en: "Medical Websites We Built",
  rest_ar: "أعمال تعزز الثقة والظهور",
  rest_en: "Work That Builds Trust and Visibility",
  cta_title_ar: "هل تريد أن يظهر مشروعك الطبي هنا؟",
  cta_title_en: "Want Your Medical Project to Be Featured Here?",
  cta_text_ar:
    "سواء كنت طبيبًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — نساعدك في بناء حضور رقمي موثوق يليق بخدماتك.",
  cta_text_en:
    "Whether you are a doctor, clinic, medical center, polyclinic, or hospital, we help you build a trusted digital presence that reflects the quality of your services.",
  cta_primary_ar: "ابدأ مشروعك الآن",
  cta_primary_en: "Start Your Project",
  cta_secondary_ar: "تواصل معنا",
  cta_secondary_en: "Contact Us",
};

function PortfolioPage() {
  const { locale } = useLocale();
  const db = supabase as any;
  const [filter, setFilter] = useState("all");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: dbItems = [] } = useQuery({
    queryKey: ["public-portfolio-projects-v2"],
    queryFn: async () =>
      (await db.from("portfolio_projects").select("*").eq("is_active", true).order("display_order"))
        .data ?? [],
  });

  // استخدم بيانات لوحة التحكم لو متوفرة وبالحقول الجديدة، وإلا اعرض البيانات المبدئية
  const items: Item[] = useMemo(() => {
    const usable = (dbItems as any[]).filter((d) => d.title && d.category);
    if (usable.length >= 4) {
      return usable.map((d) => ({
        slug: d.id,
        title_ar: d.title,
        title_en: d.title_en ?? d.title,
        client_name: d.client_name ?? "",
        category: d.category,
        description_ar: d.short_description ?? "",
        description_en: d.short_description_en ?? d.short_description ?? "",
        tags_ar: Array.isArray(d.tags) ? d.tags : [],
        tags_en: Array.isArray(d.tags) ? d.tags : [],
        website_url: d.project_url,
        thumbnail_url: d.cover_image_url ?? null,
        proof_label_ar: "",
        proof_label_en: "",
        is_featured: !!d.is_featured,
        action_ar: d.button_text || (d.project_url ? "زيارة الرابط" : "عرض"),
        action_en: d.button_text || (d.project_url ? "Open link" : "View"),
      }));
    }
    return SEED;
  }, [dbItems]);

  const L = (base: keyof typeof PAGE) =>
    (PAGE as any)[`${base.toString().replace(/_(ar|en)$/, "")}_${locale}`] ?? "";
  const pick = (ar: string, en: string) => (locale === "en" ? en : ar);

  const featured = items.filter((i) => i.is_featured && i.category === "medical_websites");
  const rest = items.filter((i) => !(i.is_featured && i.category === "medical_websites"));
  const visibleRest =
    filter === "all" ? rest : rest.filter((i) => i.category === filter);
  // عند اختيار "مواقع طبية" أظهر الـ featured أيضًا داخل الشبكة
  const showFeaturedInGrid = filter === "medical_websites";

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <Award className="h-3.5 w-3.5" /> {pick(PAGE.badge_ar, PAGE.badge_en)}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">
              {pick(PAGE.title_ar, PAGE.title_en)}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {pick(PAGE.intro_ar, PAGE.intro_en)}
            </p>
          </Reveal>

          {/* Trust stats strip */}
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s, i) => (
              <Reveal
                key={s.en}
                delay={i * 80}
                className="flex items-center gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 shadow-card"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-semibold sm:text-sm">{pick(s.ar, s.en)}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
        <Reveal className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                  active
                    ? "gradient-hero border-transparent text-brand-foreground shadow-brand"
                    : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground"
                }`}
              >
                {pick(f.ar, f.en)}
              </button>
            );
          })}
        </Reveal>
      </section>

      {/* Featured medical websites */}
      {(filter === "all" || filter === "medical_websites") && featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <Reveal>
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              {pick(PAGE.featured_ar, PAGE.featured_en)}
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {featured.map((item, i) => (
              <PortfolioCard
                key={item.slug}
                item={item}
                locale={locale}
                delay={(i % 2) * 100}
                featured
                onProof={() => item.thumbnail_url && setLightbox(item.thumbnail_url)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Rest of work */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-extrabold sm:text-3xl">
            {pick(PAGE.rest_ar, PAGE.rest_en)}
          </h2>
        </Reveal>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {(showFeaturedInGrid ? [...featured, ...visibleRest] : visibleRest).map((item, i) => (
            <PortfolioCard
              key={item.slug}
              item={item}
              locale={locale}
              delay={(i % 3) * 90}
              onProof={() => item.thumbnail_url && setLightbox(item.thumbnail_url)}
            />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="text-2xl font-bold sm:text-4xl">{pick(PAGE.cta_title_ar, PAGE.cta_title_en)}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            {pick(PAGE.cta_text_ar, PAGE.cta_text_en)}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="transition-transform hover:-translate-y-0.5">
              <Link to="/contact">{pick(PAGE.cta_primary_ar, PAGE.cta_primary_en)}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Link to="/contact">
                {pick(PAGE.cta_secondary_ar, PAGE.cta_secondary_en)}{" "}
                <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt={pick("إثبات الظهور في البحث", "Search visibility proof")}
            className="max-h-[88vh] max-w-full rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </MarketingLayout>
  );
}

function PortfolioCard({
  item,
  locale,
  delay,
  featured = false,
  onProof,
}: {
  item: Item;
  locale: string;
  delay: number;
  featured?: boolean;
  onProof: () => void;
}) {
  const pick = (ar: string, en: string) => (locale === "en" ? en : ar);
  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.medical_websites;
  const Icon = meta.icon;
  const tags = locale === "en" ? item.tags_en : item.tags_ar;
  const isSeoProof = item.category === "seo_results";
  const hasImage = !!item.thumbnail_url;

  function handleAction() {
    if (isSeoProof && hasImage) return onProof();
    openExternal(item.website_url);
  }

  return (
    <Reveal
      as="article"
      delay={delay}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
    >
      {/* Thumbnail / placeholder */}
      <div className={`relative ${featured ? "h-56" : "h-44"} overflow-hidden`}>
        {hasImage ? (
          <img
            src={item.thumbnail_url!}
            alt={pick(item.title_ar, item.title_en)}
            className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <BrandPlaceholder
            icon={Icon}
            client={item.client_name}
            label={pick(meta.ar, meta.en)}
            category={item.category}
          />
        )}
        <span className="absolute right-3 top-3 rounded-full bg-brand/90 px-2.5 py-1 text-[10px] font-bold text-brand-foreground backdrop-blur">
          {pick(item.proof_label_ar, item.proof_label_en)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand">
          <Icon className="h-3.5 w-3.5" /> {pick(meta.ar, meta.en)}
        </div>
        <h3 className={`mt-2 font-extrabold ${featured ? "text-xl" : "text-lg"}`}>
          {pick(item.title_ar, item.title_en)}
        </h3>
        {item.client_name && (
          <div className="mt-0.5 text-xs text-muted-foreground">{item.client_name}</div>
        )}
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {pick(item.description_ar, item.description_en)}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-brand/20 bg-brand/5 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="mt-5 flex-1" />
        {(item.website_url || (isSeoProof && hasImage)) && (
          <button
            type="button"
            onClick={handleAction}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
          >
            {pick(item.action_ar, item.action_en)}{" "}
            {isSeoProof && hasImage ? (
              <Search className="h-4 w-4" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
          </button>
        )}
      </div>
    </Reveal>
  );
}

function BrandPlaceholder({
  icon: Icon,
  client,
  label,
  category,
}: {
  icon: typeof Globe;
  client: string;
  label: string;
  category: string;
}) {
  // أنماط مختلفة حسب الفئة
  const isSocial = category === "social_media";
  const isPhoto = category === "medical_photography";
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gradient-hero text-brand-foreground">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white blur-2xl" />
        <div className="absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-white blur-2xl" />
      </div>
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
        {isPhoto ? (
          <Video className="h-7 w-7" />
        ) : isSocial ? (
          <Facebook className="h-7 w-7" />
        ) : (
          <Icon className="h-7 w-7" />
        )}
      </div>
      <div className="relative mt-3 px-4 text-center text-sm font-bold">{client}</div>
      <div className="relative mt-1 text-[11px] opacity-80">{label}</div>
    </div>
  );
}
