import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowLeft, CheckCircle2, Sparkles, Play, Star } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { pickIcon } from "@/lib/cms";
import { Reveal } from "@/components/Reveal";
import { CountUp } from "@/components/CountUp";
import { VideoPlayer } from "@/components/VideoPlayer";

export const Route = createFileRoute("/")({
  loader: async () => {
    const data = await getPageSeo("home");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink for Digital Solutions";
    const desc =
      seo?.meta_description_ar ||
      "MDink Solutions تمنح كل طبيب موقعًا احترافيًا مملوكًا له بالكامل، مع إدارة شاملة للسوشيال ميديا وحملات السيو والإعلانات الطبية.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        ...(seo?.og_image_url ? [{ property: "og:image", content: seo.og_image_url }] : []),
        { name: "robots", content: seo?.robots || "index,follow" },
      ],
      links: seo?.canonical_url ? [{ rel: "canonical", href: seo.canonical_url }] : [],
    };
  },
  component: HomePage,
});

// ——— Fallback content (يُستخدم فقط لو DB مش متاحة) ———
const FALLBACK: Record<string, any> = {
  badge_ar: "فريق كله دكاترة بخبرة في الديجيتال ماركتنج",
  badge_en: "A medical team with digital marketing expertise",
  hero_title_ar:
    "اليوم لا تحتاج ظهورًا رقميًا فقط، بل ظهور احترافي يميزك بين منافسيك",
  hero_title_en:
    "Today you don't just need a digital presence — you need a professional presence that sets you apart from competitors.",
  hero_subtitle_ar:
    "فريق MDink Solutions للتسويق الطبي للعيادات والمستشفيات كله دكاترة بخبرة في الديجتال ماركتنج",
  hero_subtitle_en:
    "The MDink Solutions medical-marketing team for clinics and hospitals is made up of doctors experienced in digital marketing.",
  primary_cta_ar: "ابدأ موقعك الآن",
  primary_cta_en: "Start your website",
  secondary_cta_ar: "شاهد خدماتنا",
  secondary_cta_en: "View services",
  trust_ar: ["تسليم في 25 يوم", "دعم متواصل", "ضمان الجودة"],
  trust_en: ["25-day delivery", "Continuous support", "Quality assurance"],
  preview_doctor_ar: "عيادتي",
  preview_doctor_en: "Eyadaty",
  preview_specialty_ar: "All Women Health Services In One Place — Eyadaty",
  preview_specialty_en: "All Women Health Services In One Place — Eyadaty",
  preview_label_ar: "معاينة موقع الطبيب",
  preview_label_en: "Doctor site preview",
  preview_url: "3eyadaty-eg.com",
  preview_link: "https://3eyadaty-eg.com/",
  published_label_ar: "منشور",
  published_label_en: "Published",
  dashboard_card_json: [
    { label_ar: "زائر شهريًا", label_en: "Monthly visitors", value: "18,500", icon: "Users" },
    { label_ar: "حجز شهريًا", label_en: "Monthly bookings", value: "420", icon: "CalendarCheck" },
    { label_ar: "نمو التفاعل", label_en: "Engagement growth", value: "+38%", icon: "TrendingUp" },
    { label_ar: "حملات نشطة", label_en: "Active campaigns", value: "6", icon: "Megaphone" },
  ],
  stats_json: [
    { value: "+50", label_ar: "طبيب وعيادة", label_en: "Doctors and clinics" },
    { value: "+120", label_ar: "حملة إعلانية", label_en: "Ad campaigns" },
    { value: "+10", label_ar: "تخصصات طبية", label_en: "Medical specialties" },
    { value: "98%", label_ar: "رضا العملاء", label_en: "Client satisfaction" },
  ],
  services_title_ar: "خدمات MDink Solutions الكاملة",
  services_title_en: "Complete MDink Solutions Services",
  services_intro_ar: "كل ما يحتاجه طبيبك للوصول للريادة الرقمية في مكان واحد.",
  services_intro_en: "Everything a medical brand needs to grow digitally in one place.",
  services_json: [
    {
      title_ar: "تصميم مواقع طبية",
      title_en: "Medical Websites",
      desc_ar: "موقع احترافي خاص بكل طبيب مهيأ للسيو والموبايل.",
      desc_en: "Professional doctor-owned websites built for SEO and mobile.",
      icon: "Globe",
    },
    {
      title_ar: "سيو طبي متقدم",
      title_en: "Medical SEO",
      desc_ar: "Schema.org + صفحات تخصصات تجذب بحث المرضى من جوجل.",
      desc_en: "Schema.org and specialty pages that attract patients from Google.",
      icon: "TrendingUp",
    },
    {
      title_ar: "إعلانات PPC",
      title_en: "PPC Ads",
      desc_ar: "حملات Meta و Google Ads بأعلى عائد استثمار.",
      desc_en: "Meta and Google campaigns focused on return on investment.",
      icon: "Megaphone",
    },
    {
      title_ar: "إدارة سوشيال ميديا",
      title_en: "Social Media",
      desc_ar: "تقويم محتوى شهري كامل + تصميم + جدولة + متابعة.",
      desc_en: "Monthly content calendar, design, scheduling, and follow-up.",
      icon: "Sparkles",
    },
    {
      title_ar: "هوية بصرية",
      title_en: "Brand Identity",
      desc_ar: "لوجو + هوية كاملة تناسب تخصص الطبيب.",
      desc_en: "Logo and complete identity aligned with the medical specialty.",
      icon: "ShieldCheck",
    },
    {
      title_ar: "لوحة تحكم خاصة بك",
      title_en: "Private Dashboard",
      desc_ar: "تحكم كامل بالموقع، الخدمات، الصور، والمحتوى.",
      desc_en: "Manage website content, services, images, and updates.",
      icon: "LayoutDashboard",
    },
  ],
  why_title_ar: "ليه تختار MDink Solutions",
  why_title_en: "Why Choose MDink Solutions",
  why_intro_ar:
    "في سوق مزدحم بالوكالات، نقدّم تركيبة فريدة لا يقدّمها أي منافس: منصة مملوكة لك بالكامل + خدمة تسويقية متكاملة — لكل طبيب، عيادة، أو مركز طبي.",
  why_intro_en:
    "We combine a fully-owned digital platform with integrated marketing services for doctors, clinics, and medical centers — not a temporary campaign only.",
  advantages_json: [
    {
      ar: "منصة مملوكة لك بالكامل — طبيبًا كنت أو عيادة أو مركزًا طبيًا — لا مجرد خدمة تسويقية مؤقتة",
      en: "A platform fully owned by you — doctor, clinic, or medical center — not a temporary agency service",
    },
    {
      ar: "لوحة تحكم سهلة تحرر محتواك بنفسك بدون مبرمج",
      en: "A simple dashboard to edit content without a developer",
    },
    {
      ar: "تقارير أداء مباشرة من اللوحة بدل انتظار الوكالة",
      en: "Direct performance reports from the dashboard",
    },
    {
      ar: "تصميم بصري مخصص لكل تخصص — لا قوالب عامة",
      en: "Specialty-based visual design, not generic templates",
    },
    {
      ar: "ربط مباشر بواتساب وحجز فوري لتحويل الزائر لعميل",
      en: "WhatsApp and fast contact flows that convert visitors",
    },
  ],
  talk_ar: "تحدّث معنا الآن",
  talk_en: "Talk to us now",
  system_label_ar: "منظومة متكاملة",
  system_label_en: "Integrated system",
  system_title_ar: "منظومة رقمية متكاملة للقطاع الطبي",
  system_title_en: "An Integrated Digital Ecosystem for Healthcare",
  system_intro_ar: "موقع احترافي، لوحات تحكم، إدارة محتوى، وتقويم تسويقي — جاهزة للإطلاق والنمو.",
  system_intro_en:
    "A professional website, dashboards, content management, and a marketing calendar — ready to launch and grow.",
  system_items_json: [
    { ar: "موقع MDink Solutions الرئيسي لإدارة حضورك الرقمي", en: "MDink Solutions's main website to manage your digital presence" },
    {
      ar: "مواقع مخصصة للأطباء والعيادات والمراكز الطبية",
      en: "Dedicated websites for doctors, clinics, and medical centers",
    },
    { ar: "لوحة تحكم سهلة لتعديل الخدمات والمحتوى", en: "An easy dashboard to edit services and content" },
    { ar: "لوحة إدارة للمتابعة والتقارير والطلبات", en: "A management dashboard for tracking, reports, and requests" },
    { ar: "تقويم محتوى منظم للسوشيال ميديا", en: "An organized social media content calendar" },
  ],
  cta_title_ar: "جاهز تبني موقعك الطبي الاحترافي؟",
  cta_title_en: "Ready to build your professional medical website?",
  cta_text_ar: "احجز استشارة مجانية الآن وابدأ رحلتك للريادة الرقمية في تخصصك.",
  cta_text_en: "Book a free consultation and start building your digital leadership.",
  cta_primary_ar: "احجز استشارة مجانية",
  cta_primary_en: "Book a free consultation",
  cta_secondary_ar: "اعرف أكثر",
  cta_secondary_en: "Learn more",
  hero_bg_image: "",
  preview_card_image: "",
  testimonials_title_ar: "آراء عملائنا",
  testimonials_title_en: "Client Reviews",
  testimonials_intro_ar: "تجارب حقيقية من أطباء وعيادات عملوا مع MDink Solutions.",
  testimonials_intro_en: "Real experiences from doctors and clinics who worked with MDink Solutions.",
  testimonials_cta_ar: "شاهد كل الآراء",
  testimonials_cta_en: "See all reviews",
  sections_order: ["hero", "stats", "services", "why", "system", "testimonials", "cta"],
  sections_hidden: [],
};

function HomePage() {
  const { locale } = useLocale();
  const db = supabase as any;

  const { data: cmsHome } = useQuery({
    queryKey: ["page-sections-public", "home"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "home")).data ?? [];
      const merged: Record<string, any> = {};
      const bySection: Record<string, any> = {};
      rows.forEach((r: any) => {
        bySection[r.section_key] = r;
        Object.assign(merged, r.content_json ?? {});
      });
      // اربط حقول الهيرو والـ why من page_sections القياسية
      const hero = bySection["hero"];
      const why = bySection["why_mdink"];
      if (hero) {
        merged.hero_title_ar = hero.title ?? merged.hero_title_ar;
        merged.hero_title_en = (hero.content_json?.title_en) ?? merged.hero_title_en;
        merged.hero_subtitle_ar = hero.subtitle ?? merged.hero_subtitle_ar;
        merged.hero_subtitle_en = (hero.content_json?.subtitle_en) ?? merged.hero_subtitle_en;
        if (hero.content_json?.badge_ar) merged.badge_ar = hero.content_json.badge_ar;
        if (hero.content_json?.badge_en) merged.badge_en = hero.content_json.badge_en;
        if (hero.content_json?.image_url) merged.hero_image = hero.content_json.image_url;
        if (hero.content_json?.bg_image_url) merged.hero_bg_image = hero.content_json.bg_image_url;
        // باقي حقول الهيرو/الأقسام (أزرار، ثقة، إحصائيات، خدمات، CTA...) تُقرأ تلقائيًا
        // عبر Object.assign(merged, content_json) بأسماء مفاتيحها، مع FALLBACK كقيم افتراضية.
      }
      if (why) {
        merged.why_title_ar = why.title ?? merged.why_title_ar;
        merged.why_intro_ar = why.subtitle ?? merged.why_intro_ar;
        if (why.video_url) merged.why_video_url = why.video_url;
        if (Array.isArray(why.content_json?.points)) merged.why_points = why.content_json.points;
      }
      const system = bySection["system"];
      if (system) {
        merged.system_title_ar = system.title ?? merged.system_title_ar;
        merged.system_intro_ar = system.subtitle ?? merged.system_intro_ar;
        if (system.content_json?.title_en) merged.system_title_en = system.content_json.title_en;
        if (system.content_json?.intro_en) merged.system_intro_en = system.content_json.intro_en;
        if (system.video_url) merged.system_video_url = system.video_url;
        if (system.content_json?.video_title) merged.system_video_title = system.content_json.video_title;
        if (system.content_json?.video_thumbnail) merged.system_video_thumbnail = system.content_json.video_thumbnail;
        if (Array.isArray(system.content_json?.items)) merged.system_items_json = system.content_json.items;
      }
      return { content: merged };
    },
  });

  // آراء العملاء المختارة للظهور في الرئيسية (show_on_home + منشورة فقط)
  const { data: homeReviews = [] } = useQuery({
    queryKey: ["home-testimonials"],
    queryFn: async () => {
      const vids =
        (await db
          .from("video_testimonials")
          .select("*")
          .eq("is_active", true)
          .eq("show_on_home", true)
          .order("display_order")).data ?? [];
      const writ =
        (await db
          .from("written_testimonials")
          .select("*")
          .eq("is_active", true)
          .eq("show_on_home", true)
          .order("display_order")).data ?? [];
      const mapped = [
        ...vids.map((v: any) => ({
          id: v.id,
          kind: "video" as const,
          name: v.client_name,
          role: v.client_specialty || v.client_title || "",
          text: v.short_text || "",
          rating: v.rating ?? 5,
          media_url: v.video_url,
          thumbnail_url: v.thumbnail_url,
          order: v.display_order ?? 0,
        })),
        ...writ.map((w: any) => ({
          id: w.id,
          kind: "written" as const,
          name: w.client_name,
          role: w.client_specialty || w.client_title || "",
          text: w.review_text || "",
          rating: w.rating ?? 5,
          media_url: w.review_image_url,
          thumbnail_url: w.review_image_url,
          order: w.display_order ?? 0,
        })),
      ];
      return mapped.sort((a, b) => a.order - b.order);
    },
  });

  // دمج: DB فوق الـ fallback
  const c = { ...FALLBACK, ...(cmsHome?.content ?? {}) };
  const L = (base: string) => c[`${base}_${locale}`] ?? c[`${base}_ar`] ?? "";
  const arr = (key: string) => (Array.isArray(c[key]) ? c[key] : (FALLBACK[key] ?? []));

  const savedOrder: string[] = Array.isArray(c.sections_order)
    ? c.sections_order
    : FALLBACK.sections_order;
  // ألحق أي قسم معروف غير موجود في الترتيب المحفوظ (مثل الأقسام المُضافة حديثًا)
  const order: string[] = [
    ...savedOrder,
    ...FALLBACK.sections_order.filter((id: string) => !savedOrder.includes(id)),
  ];
  const hidden: string[] = Array.isArray(c.sections_hidden) ? c.sections_hidden : [];
  const visible = (id: string) => !hidden.includes(id);

  const trust = locale === "en" ? arr("trust_en") : arr("trust_ar");
  const dashboardCard = arr("dashboard_card_json");
  const stats = arr("stats_json");
  const services = arr("services_json");
  const advantages = arr("advantages_json");
  const systemItems = arr("system_items_json");

  // ——— Sections كـ render functions ———
  const sections: Record<string, () => React.ReactNode> = {
    hero: () => (
      <section key="hero" className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 gradient-soft" />
        {c.hero_bg_image ? (
          <div className="absolute inset-0 -z-10 opacity-10">
            <img src={c.hero_bg_image} alt="" loading="lazy" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <div className="absolute -top-32 right-0 -z-10 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="absolute -bottom-32 left-0 -z-10 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                {L("badge")}
              </div>
              <h1
                className="mt-6 max-w-[760px] font-bold tracking-tight"
                style={{ fontSize: "clamp(1.9rem, 4.2vw, 3.5rem)", lineHeight: 1.3 }}
              >
                <span className="bg-gradient-to-l from-brand to-primary bg-clip-text text-transparent">
                  {L("hero_title")}
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-loose text-muted-foreground sm:text-lg">
                {L("hero_subtitle")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="gradient-hero text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5"
                >
                  <Link to="/contact">
                    {L("primary_cta")}{" "}
                    <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="transition-transform hover:-translate-y-0.5"
                >
                  <Link to="/services">{L("secondary_cta")}</Link>
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                {trust.map((item: string) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand" /> {item}
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={150} className="relative">
              <div className="absolute inset-0 -z-10 rounded-3xl gradient-hero opacity-20 blur-2xl" />
              {c.hero_image ? (
                <img
                  src={c.hero_image}
                  alt={L("hero_title")}
                  fetchPriority="high"
                  className="w-full rounded-3xl border border-border object-cover shadow-brand"
                  style={{ aspectRatio: "4 / 5", maxHeight: 560 }}
                />
              ) : (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-brand">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl gradient-hero text-brand-foreground">
                      {c.preview_card_image ? (
                        <img
                          src={c.preview_card_image}
                          alt={L("preview_doctor")}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Stethoscope className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{L("preview_doctor")}</div>
                      <div className="text-[11px] leading-snug text-muted-foreground">
                        {L("preview_specialty")}
                      </div>
                    </div>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-medium text-brand">
                    {L("published_label")}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {dashboardCard.map((s: any, i: number) => {
                    const Icon = pickIcon(s.icon);
                    return (
                      <div key={i} className="rounded-xl border border-border bg-background p-4">
                        <Icon className="h-4 w-4 text-brand" />
                        <div className="mt-2 text-xl font-bold">
                          <CountUp value={s.value} />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {locale === "en"
                            ? (s.label_en ?? s.label_ar)
                            : (s.label_ar ?? s.label_en)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <a
                  href={c.preview_link || "https://3eyadaty-eg.com/"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 block rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 text-xs transition-colors hover:bg-brand/10"
                >
                  <div className="font-medium text-brand">{L("preview_label")}</div>
                  <div className="mt-1 text-muted-foreground" dir="ltr">
                    {c.preview_url}
                  </div>
                </a>
              </div>
              )}
            </Reveal>
          </div>
        </div>
      </section>
    ),

    stats: () => (
      <section key="stats" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {stats.map((s: any, i: number) => (
            <Reveal key={i} delay={i * 90} className="text-center">
              <div className="text-3xl font-extrabold text-brand sm:text-4xl">
                <CountUp value={s.value} />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {locale === "en" ? (s.label_en ?? s.label_ar) : (s.label_ar ?? s.label_en)}
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    ),

    services: () => (
      <section key="services" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal as="div" className="mb-12 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">{L("services_title")}</h2>
          <p className="mt-3 text-muted-foreground">{L("services_intro")}</p>
        </Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s: any, i: number) => {
            const Icon = pickIcon(s.icon);
            return (
              <Reveal
                key={i}
                delay={(i % 3) * 90}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:gradient-hero group-hover:text-brand-foreground">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  {locale === "en" ? (s.title_en ?? s.title_ar) : (s.title_ar ?? s.title_en)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {locale === "en" ? (s.desc_en ?? s.desc_ar) : (s.desc_ar ?? s.desc_en)}
                </p>
              </Reveal>
            );
          })}
        </div>
      </section>
    ),

    why: () => (
      <section key="why" className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl">{L("why_title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {L("why_intro")}
            </p>
            <ul className="mt-6 space-y-3">
              {advantages.map((a: any, i: number) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="text-sm">
                    {locale === "en" ? (a.en ?? a.ar) : (a.ar ?? a.en)}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              asChild
              size="lg"
              className="mt-8 gradient-hero text-brand-foreground shadow-brand transition-transform hover:-translate-y-0.5"
            >
              <Link to="/contact">{L("talk")}</Link>
            </Button>
          </Reveal>
          <Reveal
            delay={150}
            className="relative overflow-hidden rounded-3xl border border-border bg-background shadow-card"
          >
            {c.why_video_url ? (
              <VideoPlayer
                url={c.why_video_url}
                thumbnail={c.why_video_poster || undefined}
                title={L("why_title")}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center gap-3 gradient-hero p-10 text-center text-brand-foreground"
                style={{ aspectRatio: "16 / 9" }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <Play className="h-7 w-7" />
                </div>
                <div className="text-sm font-semibold opacity-90">
                  {locale === "en"
                    ? "A video showcasing MDink Solutions will appear here"
                    : "سيظهر هنا فيديو يعرّف بـ MDink Solutions"}
                </div>
              </div>
            )}
          </Reveal>
        </div>
      </section>
    ),

    system: () => {
      // فيديو المنظومة يظهر داخل قسم "المنظومة الرقمية" (نفس ما يوضّحه محرّر لوحة التحكم)
      const videoUrl = c.system_video_url || "";
      return (
        <section key="system" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <Reveal>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand">
              {L("system_label")}
            </div>
            <h2 className="text-3xl font-bold sm:text-4xl">{L("system_title")}</h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {L("system_intro")}
            </p>
          </Reveal>
          <div className={`mt-8 grid items-center gap-8 ${videoUrl ? "lg:grid-cols-2" : ""}`}>
            {videoUrl ? (
              <Reveal>
                <VideoPlayer
                  url={videoUrl}
                  title={c.system_video_title}
                  thumbnail={c.system_video_thumbnail}
                />
              </Reveal>
            ) : null}
            <Reveal delay={120}>
              <ul className="space-y-3">
                {systemItems.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
                    <span className="text-sm leading-relaxed text-foreground sm:text-base">
                      {locale === "en" ? item.en || item.ar : item.ar}
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      );
    },

    testimonials: () => {
      if (!homeReviews.length) return null;
      return (
        <section key="testimonials" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
            <Reveal as="div" className="mb-10 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">{L("testimonials_title")}</h2>
              <p className="mt-3 text-muted-foreground">{L("testimonials_intro")}</p>
            </Reveal>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {homeReviews.map((r: any, i: number) => (
                <Reveal
                  key={r.id}
                  delay={(i % 3) * 90}
                  as="article"
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                >
                  {r.kind === "video" ? (
                    <VideoPlayer url={r.media_url || ""} thumbnail={r.thumbnail_url || undefined} title={r.name} />
                  ) : r.thumbnail_url ? (
                    <img
                      src={r.thumbnail_url}
                      alt={r.name}
                      loading="lazy"
                      className="h-48 w-full object-cover object-top"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s < (r.rating ?? 5) ? "fill-accent text-accent" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    {r.text ? (
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{r.text}</p>
                    ) : (
                      <div className="flex-1" />
                    )}
                    <div className="mt-4">
                      <div className="font-semibold">{r.name}</div>
                      {r.role ? <div className="text-xs text-muted-foreground">{r.role}</div> : null}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Button asChild variant="outline" className="transition-transform hover:-translate-y-0.5">
                <Link to="/reviews">{L("testimonials_cta")}</Link>
              </Button>
            </div>
          </div>
        </section>
      );
    },

    cta: () => (
      <section key="cta" className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="text-3xl font-bold sm:text-4xl">{L("cta_title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl opacity-90">{L("cta_text")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="transition-transform hover:-translate-y-0.5"
            >
              <Link to="/contact">{L("cta_primary")}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Link to="/services">{L("cta_secondary")}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    ),
  };

  return (
    <MarketingLayout>{order.filter(visible).map((id) => sections[id]?.() ?? null)}</MarketingLayout>
  );
}
