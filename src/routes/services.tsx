import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MarketingLayout } from "@/components/MarketingLayout";
import { CheckCircle2, ArrowLeft, Camera, Video, Palette, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { useLocale } from "@/lib/i18n";
import { localized, pickIcon } from "@/lib/cms";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/services")({
  loader: async () => {
    const data = await getPageSeo("services");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "خدمات رقمية متكاملة للقطاع الطبي — MDink Solutions";
    const desc =
      seo?.meta_description_ar ||
      "خدمات رقمية متكاملة للقطاع الطبي: مواقع، لوحات تحكم، SEO طبي، سوشيال ميديا، تصوير داخل العيادة، ريلز، جرافيك، حملات إعلانية، وتقارير أداء.";
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
  component: ServicesPage,
});

// ——— القائمة الكاملة للخدمات (تُستخدم لو DB فاضية) ———
const fallbackServices = [
  {
    title_ar: "تصميم وتطوير مواقع طبية",
    title_en: "Medical Website Design & Development",
    description_ar:
      "مواقع احترافية مملوكة لك، مناسبة للأطباء والعيادات والمراكز والمستشفيات، سريعة، متجاوبة، ومهيأة للحجز والظهور في جوجل.",
    description_en:
      "Professional, owned websites for doctors, clinics, centers, and hospitals — fast, responsive, and built for booking and Google visibility.",
    checkmarks_ar: ["تصميم مخصص", "متجاوب مع الموبايل", "مهيأ لمحركات البحث"],
    checkmarks_en: ["Custom design", "Mobile responsive", "SEO ready"],
    icon: "Globe",
  },
  {
    title_ar: "لوحات تحكم وأنظمة إدارة",
    title_en: "Dashboards & Management Systems",
    description_ar:
      "لوحات سهلة لإدارة الأطباء، الخدمات، المقالات، الحجوزات، الاستفسارات، ومحتوى الموقع بدون تعقيد.",
    description_en:
      "Easy dashboards to manage doctors, services, articles, bookings, inquiries, and site content without complexity.",
    checkmarks_ar: ["إدارة الأطباء والخدمات", "متابعة الطلبات", "تعديل المحتوى بسهولة"],
    checkmarks_en: ["Manage doctors & services", "Track requests", "Easy content editing"],
    icon: "LayoutDashboard",
  },
  {
    title_ar: "SEO طبي ومحتوى بحث",
    title_en: "Medical SEO & Search Content",
    description_ar:
      "صفحات خدمات ومقالات طبية منظمة تساعد المرضى يفهموا خدمتك وتساعد موقعك يظهر في نتائج البحث.",
    description_en:
      "Organized service pages and medical articles that help patients understand your work and help your site rank.",
    checkmarks_ar: ["كلمات مفتاحية طبية", "Schema.org", "صفحات خدمات متخصصة"],
    checkmarks_en: ["Medical keywords", "Schema.org", "Specialty service pages"],
    icon: "TrendingUp",
  },
  {
    title_ar: "إدارة السوشيال ميديا",
    title_en: "Social Media Management",
    description_ar:
      "تقويم محتوى شهري، تصميمات احترافية، كتابة كابشنات، أفكار ريلز، ومتابعة الأداء بشكل مستمر.",
    description_en:
      "Monthly content calendar, professional designs, caption writing, reel ideas, and ongoing performance tracking.",
    checkmarks_ar: ["تقويم شهري", "تصميمات احترافية", "متابعة الأداء"],
    checkmarks_en: ["Monthly calendar", "Professional designs", "Performance tracking"],
    icon: "Sparkles",
  },
  {
    title_ar: "تصوير طبي داخل العيادة",
    title_en: "In-Clinic Medical Photography",
    description_ar:
      "جلسات تصوير حقيقية داخل العيادة أو المركز لإظهار المكان، الأطباء، الأجهزة، طريقة العمل، وفريق العمل بشكل مهني موثوق.",
    description_en:
      "Real photo sessions inside the clinic or center showing the space, doctors, equipment, workflow, and team — professionally and credibly.",
    checkmarks_ar: ["تصوير الطبيب والفريق", "تصوير المكان والأجهزة", "محتوى حقيقي للثقة"],
    checkmarks_en: ["Doctor & team shots", "Space & equipment shots", "Real content for trust"],
    icon: "Camera",
  },
  {
    title_ar: "فيديوهات وريلز طبية",
    title_en: "Medical Videos & Reels",
    description_ar:
      "تصوير ومونتاج فيديوهات قصيرة للأطباء، شرح الخدمات، لقطات من داخل العيادة، وتجهيز محتوى مناسب للسوشيال والإعلانات.",
    description_en:
      "Filming and editing short videos for doctors, service explainers, in-clinic footage, and content ready for social and ads.",
    checkmarks_ar: ["ريلز طبية", "فيديوهات شرح الخدمات", "مونتاج احترافي"],
    checkmarks_en: ["Medical reels", "Service explainer videos", "Professional editing"],
    icon: "Video",
  },
  {
    title_ar: "تصميم جرافيك طبي",
    title_en: "Medical Graphic Design",
    description_ar:
      "تصميم بوستات، إعلانات، كفرات، قوالب محتوى، عروض خدمات، وهوية بصرية متناسقة مع تخصصك الطبي.",
    description_en:
      "Posts, ads, covers, content templates, service offers, and visuals consistent with your medical specialty.",
    checkmarks_ar: ["بوستات وإعلانات", "قوالب محتوى", "تصميمات للحملات"],
    checkmarks_en: ["Posts & ads", "Content templates", "Campaign designs"],
    icon: "Palette",
  },
  {
    title_ar: "حملات إعلانية طبية",
    title_en: "Medical Ad Campaigns",
    description_ar:
      "إدارة حملات Meta و Google بأهداف واضحة: استفسارات، حجوزات، زيارات موقع، أو زيادة الوعي بالمركز.",
    description_en:
      "Managing Meta and Google campaigns with clear goals: inquiries, bookings, site visits, or awareness.",
    checkmarks_ar: ["Meta Ads", "Google Ads", "تقارير أداء"],
    checkmarks_en: ["Meta Ads", "Google Ads", "Performance reports"],
    icon: "Megaphone",
  },
  {
    title_ar: "هوية بصرية طبية",
    title_en: "Medical Brand Identity",
    description_ar:
      "بناء شكل بصري محترف للطبيب أو العيادة أو المركز: ألوان، خطوط، قوالب، أسلوب صور، وطريقة ظهور موحدة.",
    description_en:
      "Building a professional visual identity for the doctor, clinic, or center: colors, fonts, templates, photo style, and a unified look.",
    checkmarks_ar: ["شعار وهوية", "ألوان وخطوط", "قوالب استخدام"],
    checkmarks_en: ["Logo & identity", "Colors & fonts", "Usage templates"],
    icon: "ShieldCheck",
  },
  {
    title_ar: "ربط واتساب ونماذج حجز",
    title_en: "WhatsApp & Booking Forms",
    description_ar:
      "تحويل الزائر من مجرد مشاهدة إلى تواصل وحجز من خلال أزرار واضحة، نماذج سهلة، وربط مباشر بواتساب.",
    description_en:
      "Turning visitors into contacts and bookings through clear buttons, simple forms, and direct WhatsApp integration.",
    checkmarks_ar: ["نماذج حجز", "ربط واتساب", "تتبع الاستفسارات"],
    checkmarks_en: ["Booking forms", "WhatsApp integration", "Inquiry tracking"],
    icon: "MessageCircle",
  },
  {
    title_ar: "تقارير وتحليل الأداء",
    title_en: "Reporting & Performance Analysis",
    description_ar:
      "متابعة الزيارات، مصادر العملاء، أداء الإعلانات، أكثر الخدمات طلبًا، وتقديم توصيات تطوير شهرية.",
    description_en:
      "Tracking visits, client sources, ad performance, most-requested services, and providing monthly improvement recommendations.",
    checkmarks_ar: ["تقارير شهرية", "تحليل مصادر العملاء", "توصيات تحسين"],
    checkmarks_en: ["Monthly reports", "Client source analysis", "Improvement recommendations"],
    icon: "BarChart3",
  },
  {
    title_ar: "دعم وتطوير مستمر",
    title_en: "Ongoing Support & Development",
    description_ar:
      "متابعة الموقع، تحديث المحتوى، تحسين الأداء، إضافة خدمات جديدة، وتطوير مستمر حسب نمو العيادة أو المركز.",
    description_en:
      "Site monitoring, content updates, performance improvements, adding new services, and continuous development as your clinic grows.",
    checkmarks_ar: ["دعم فني", "تحديثات دورية", "تطوير مستمر"],
    checkmarks_en: ["Technical support", "Regular updates", "Continuous development"],
    icon: "LifeBuoy",
  },
];

const FALLBACK_PAGE: Record<string, any> = {
  title_ar: "خدمات رقمية متكاملة للقطاع الطبي",
  title_en: "Integrated Digital Services for Healthcare",
  intro_ar:
    "من بناء الموقع والهوية إلى التصوير داخل العيادة وإدارة الحملات — MDink Solutions تساعد الأطباء والعيادات والمراكز الطبية والمستشفيات على الظهور بثقة وجذب مرضى حقيقيين.",
  intro_en:
    "From building the website and identity to in-clinic photography and campaign management — MDink Solutions helps doctors, clinics, medical centers, and hospitals appear with confidence and attract real patients.",
  cta_title_ar: "جاهز تبني حضور طبي يليق بثقة مرضاك؟",
  cta_title_en: "Ready to build a medical presence worthy of your patients' trust?",
  cta_text_ar:
    "سواء كنت طبيبًا مستقلًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — نساعدك في بناء منظومة رقمية واضحة، موثوقة، وقابلة للنمو.",
  cta_text_en:
    "Whether you are an independent doctor, a clinic, a medical center, a polyclinic, or a hospital — we help you build a clear, trustworthy, and scalable digital system.",
  cta_primary_ar: "احجز استشارة مجانية",
  cta_primary_en: "Book a free consultation",
  cta_secondary_ar: "شاهد أعمالنا",
  cta_secondary_en: "View our work",
};

const audience = {
  title_ar: "نخدم",
  title_en: "We serve",
  items_ar: [
    "أطباء مستقلين",
    "عيادات خاصة",
    "مراكز طبية",
    "مجمعات عيادات",
    "مستشفيات",
    "عيادات نسائية",
    "مراكز تجميل",
    "مراكز أسنان",
    "عيادات جلدية",
    "مراكز علاج طبيعي",
  ],
  items_en: [
    "Independent doctors",
    "Private clinics",
    "Medical centers",
    "Polyclinics",
    "Hospitals",
    "Women's clinics",
    "Aesthetic centers",
    "Dental centers",
    "Dermatology clinics",
    "Physiotherapy centers",
  ],
};

const contentFeatures = [
  { icon: Camera, ar: "تصوير فوتوغرافي احترافي", en: "Professional photography" },
  { icon: Video, ar: "فيديوهات قصيرة وريلز", en: "Short videos & reels" },
  { icon: Palette, ar: "جرافيك طبي متناسق", en: "Consistent medical graphics" },
  { icon: Megaphone, ar: "محتوى مناسب للإعلانات والسوشيال", en: "Content ready for ads & social" },
];

const steps = {
  ar: [
    "نفهم تخصصك وجمهورك",
    "نجهز الخطة والمحتوى",
    "نصمم ونصور ونبني",
    "نطلق ونقيس النتائج",
    "نطور باستمرار",
  ],
  en: [
    "We understand your specialty and audience",
    "We prepare the plan and content",
    "We design, shoot, and build",
    "We launch and measure results",
    "We keep improving",
  ],
};

function ServicesPage() {
  const { locale } = useLocale();
  const db = supabase as any;

  const { data: services } = useQuery({
    queryKey: ["public-services-v2"],
    queryFn: async () => {
      const rows = (await db.from("services").select("*").eq("is_active", true).order("display_order")).data ?? [];
      // خريطة الحقول الجديدة إلى ما تتوقعه واجهة الصفحة (title_ar/en, description_ar/en, bullets)
      return rows.map((s: any) => ({
        ...s,
        title_ar: s.title,
        title_en: s.title_en ?? s.title,
        description_ar: s.description,
        description_en: s.description_en ?? s.description,
        bullets_ar: s.bullets,
        bullets_en: s.bullets,
        checkmarks_ar: s.bullets,
        checkmarks_en: s.bullets,
      }));
    },
  });

  const { data: cmsPage } = useQuery({
    queryKey: ["page-sections-public", "services"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "services")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });

  const c = { ...FALLBACK_PAGE, ...(cmsPage ?? {}) };
  const L = (base: string) => c[`${base}_${locale}`] ?? c[`${base}_ar`] ?? "";
  // نعرض خدمات الـ DB لو كانت 6 أو أكثر، وإلا نستخدم القائمة الكاملة المدمجة
  const list = services && services.length >= 6 ? services : fallbackServices;
  const audienceItems = locale === "en" ? audience.items_en : audience.items_ar;
  const stepList = locale === "en" ? steps.en : steps.ar;

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <h1 className="text-3xl font-extrabold leading-snug sm:text-4xl lg:text-5xl">
              {L("title")}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {L("intro")}
            </p>
          </Reveal>

          {/* Audience strip */}
          <Reveal delay={120} className="mt-9">
            <div className="text-sm font-semibold text-brand">
              {locale === "en" ? audience.title_en : audience.title_ar}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {audienceItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-brand/25 bg-brand/5 px-3.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-brand/50 hover:bg-brand/10 sm:text-sm"
                >
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Services grid */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((service: any, i: number) => {
            const Icon = pickIcon(service.icon);
            const points =
              locale === "en"
                ? service.checkmarks_en?.length
                  ? service.checkmarks_en
                  : service.checkmarks_ar
                : service.checkmarks_ar;
            return (
              <Reveal
                key={service.id ?? service.title_ar}
                delay={(i % 3) * 90}
                as="article"
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
              >
                {service.image_url && (
                  <img
                    src={service.image_url}
                    alt={service[`alt_${locale}`] || localized(service, "title", locale)}
                    loading="lazy"
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-lg font-bold">{localized(service, "title", locale)}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {localized(service, "description", locale)}
                  </p>
                  <ul className="mt-4 space-y-2 border-t border-border pt-4">
                    {(points ?? []).map((point: string) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" /> {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Real content production — trust section */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {locale === "en" ? "Real content from inside your clinic" : "محتوى حقيقي من داخل عيادتك"}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {locale === "en"
                ? "We don't rely on generic designs alone. The MDink Solutions team helps you produce real content from inside the clinic or center: the doctor, the team, the equipment, the space, and the service experience — so your digital presence looks more trustworthy and professional."
                : "لا نعتمد على تصميمات عامة فقط. فريق MDink Solutions يساعدك في إنتاج محتوى حقيقي من داخل العيادة أو المركز: تصوير الطبيب، فريق العمل، الأجهزة، المكان، وتجربة الخدمة — ليظهر حضورك الرقمي بشكل أكثر ثقة واحتراف."}
            </p>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contentFeatures.map((f, i) => (
              <Reveal
                key={f.ar}
                delay={(i % 4) * 90}
                className="rounded-2xl border border-border bg-background p-6 text-center shadow-card transition-all hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <f.icon className="h-6 w-6" />
                </div>
                <div className="mt-4 text-sm font-semibold">{locale === "en" ? f.en : f.ar}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            {locale === "en" ? "How do we start?" : "كيف نبدأ؟"}
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {stepList.map((step, i) => (
            <Reveal
              key={step}
              delay={i * 80}
              className="relative rounded-2xl border border-border bg-card p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-hero text-base font-bold text-brand-foreground">
                {i + 1}
              </div>
              <p className="mt-4 text-sm font-medium leading-relaxed">{step}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="text-2xl font-bold sm:text-4xl">{L("cta_title")}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">{L("cta_text")}</p>
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
              <Link to="/portfolio">
                {L("cta_secondary")} <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}
