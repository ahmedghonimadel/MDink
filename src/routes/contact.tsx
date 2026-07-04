import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { MarketingLayout } from "@/components/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Phone,
  MessageCircle,
  Facebook,
  Instagram,
  HandHeart,
  Inbox,
  Lightbulb,
  Sparkles,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { useSiteConfig, whatsappUrlFrom } from "@/lib/use-site-config";
import { useLocale } from "@/lib/i18n";
import { localized, pickIcon } from "@/lib/cms";
import { Reveal } from "@/components/Reveal";

const WHATSAPP = "https://wa.me/201020658409";

export const Route = createFileRoute("/contact")({
  loader: async () => {
    const data = await getPageSeo("contact");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink Solutions — تواصل معنا";
    const desc =
      seo?.meta_description_ar ||
      "تواصل مع فريق MDink Solutions عبر واتساب، إنستجرام، فيسبوك، أو احجز استشارة مجانية لمشروعك الطبي.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: "/contact" },
        { property: "og:type", content: "website" },
        { name: "robots", content: seo?.robots || "index,follow" },
      ],
      links: seo?.canonical_url
        ? [{ rel: "canonical", href: seo.canonical_url }]
        : [{ rel: "canonical", href: "/contact" }],
    };
  },
  component: ContactPage,
});

const ORG_TYPES = [
  { ar: "طبيب مستقل", en: "Independent Doctor" },
  { ar: "عيادة خاصة", en: "Private Clinic" },
  { ar: "مركز طبي", en: "Medical Center" },
  { ar: "مجمع عيادات", en: "Polyclinic" },
  { ar: "مستشفى", en: "Hospital" },
  { ar: "أخرى", en: "Other" },
];

const SERVICES = [
  { ar: "تصميم موقع طبي", en: "Medical Website Design" },
  { ar: "إدارة السوشيال ميديا", en: "Social Media Management" },
  { ar: "SEO ومقالات طبية", en: "Medical SEO & Articles" },
  { ar: "تصوير داخل العيادة", en: "In-Clinic Photography" },
  { ar: "حملات إعلانية", en: "Advertising Campaigns" },
  { ar: "نظام إدارة عيادة", en: "Clinic Management System" },
  { ar: "منظومة متكاملة", en: "Full Digital System" },
  { ar: "جميع ما سبق", en: "All of the Above" },
  { ar: "غير متأكد وأحتاج استشارة", en: "Not Sure, Need Consultation" },
];

const CONTACT_METHODS = [
  { ar: "واتساب", en: "WhatsApp" },
  { ar: "مكالمة هاتفية", en: "Phone Call" },
  { ar: "إنستجرام", en: "Instagram" },
  { ar: "فيسبوك", en: "Facebook" },
];

const PROCESS = [
  { icon: Inbox, ar: "نراجع رسالتك", en: "We review your message" },
  { icon: Lightbulb, ar: "نفهم نوع مشروعك", en: "We understand your project" },
  { icon: Sparkles, ar: "نرشح لك الحل الأنسب", en: "We recommend the right solution" },
  { icon: ClipboardCheck, ar: "نبدأ بخطة واضحة", en: "We start with a clear plan" },
];

const FALLBACK: Record<string, any> = {
  hero_badge_ar: "ابدأ بخطوة بسيطة",
  hero_badge_en: "Start with a Simple Step",
  title_ar: "تواصل معنا",
  title_en: "Contact Us",
  intro_ar:
    "جاهزون نسمع منك، نفهم احتياجك، ونساعدك تختار الحل الأنسب لطبيبك، عيادتك، مركزك الطبي، أو مستشفاك.",
  intro_en:
    "We are ready to listen, understand your needs, and help you choose the right solution for your doctor profile, clinic, medical center, or hospital.",
  form_title_ar: "احجز استشارة مجانية",
  form_title_en: "Book a Free Consultation",
  form_subtitle_ar: "أخبرنا قليلًا عن مشروعك، وسنرد عليك خلال 24 ساعة.",
  form_subtitle_en: "Tell us a little about your project, and we will get back to you within 24 hours.",
  trust_title_ar: "نسمع أولًا… ثم نقترح",
  trust_title_en: "We Listen First… Then We Recommend",
  trust_body_ar:
    "في MDink Solutions لا نبدأ ببيع خدمة جاهزة، بل نبدأ بفهم احتياجك الحقيقي، طبيعة تخصصك، ونوع الجمهور الذي تريد الوصول إليه.",
  trust_body_en:
    "At MDink Solutions, we do not start by selling a ready-made service. We start by understanding your real needs, your specialty, and the audience you want to reach.",
  cta_title_ar: "جاهز تبدأ مشروعك الطبي؟",
  cta_title_en: "Ready to Start Your Medical Project?",
  cta_subtitle_ar:
    "سواء كنت طبيبًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — فريق MDink Solutions جاهز يساعدك تبني حضور رقمي موثوق.",
  cta_subtitle_en:
    "Whether you are a doctor, clinic, medical center, polyclinic, or hospital, MDink Solutions is ready to help you build a trusted digital presence.",
};

function ContactPage() {
  const [loading, setLoading] = useState(false);
  const cfg = useSiteConfig();
  const { locale } = useLocale();
  const db = supabase as any;
  const formRef = useRef<HTMLDivElement | null>(null);

  // smooth-scroll to #consultation when arriving with the hash
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#consultation") {
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["social-links-public"],
    queryFn: async () =>
      (await db.from("social_links").select("*").eq("is_active", true).order("display_order"))
        .data ?? [],
  });
  const { data: cmsPage } = useQuery({
    queryKey: ["page-sections-public", "contact"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "contact")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });

  const c = { ...FALLBACK, ...(cmsPage ?? {}) };
  const pick = (ar?: string, en?: string) => (locale === "en" ? en || ar || "" : ar || "");
  const L = (base: string) => c[`${base}_${locale}`] ?? c[`${base}_ar`] ?? "";

  const t =
    locale === "en"
      ? {
          name: "Full Name", phone: "Phone or WhatsApp", org: "Organization Type",
          specialty: "Medical Specialty", service: "Service Needed", link: "Current Online Presence Links, If Available",
          method: "Preferred Contact Method", message: "Message", submit: "Submit Request",
          sending: "Sending...", choose: "Choose...", optional: "(optional)",
          required: "required", success: "Your request has been received. We will reply within 24 hours.",
          err: "Could not send your message, please try again.",
          msgPlaceholder: "Tell us what you need...", specialtyPlaceholder: "e.g. Dentistry",
          processTitle: "What Happens After You Submit?", waCard: "WhatsApp", igCard: "Instagram",
          fbCard: "Facebook", callCard: "Direct Call", ctaPrimary: "Start Your Medical Project",
          ctaSecondary: "Message Us on WhatsApp",
          vName: "Full name is required", vPhone: "Phone / WhatsApp is required",
          vOrg: "Organization type is required", vMsg: "Please write a clearer message",
        }
      : {
          name: "الاسم الكامل", phone: "رقم الهاتف أو واتساب", org: "نوع الجهة",
          specialty: "التخصص الطبي", service: "الخدمة المطلوبة", link: "روابط حضورك الحالي إن وجدت",
          method: "طريقة التواصل المفضلة", message: "رسالتك", submit: "إرسال الطلب",
          sending: "جاري الإرسال...", choose: "اختر...", optional: "(اختياري)",
          required: "مطلوب", success: "تم استلام طلبك! سنرد عليك خلال 24 ساعة.",
          err: "تعذّر إرسال الرسالة، حاول مجددًا.",
          msgPlaceholder: "اكتب لنا ما تحتاجه...", specialtyPlaceholder: "مثلاً: طب أسنان",
          processTitle: "ماذا يحدث بعد إرسال الطلب؟", waCard: "واتساب", igCard: "إنستجرام",
          fbCard: "فيسبوك", callCard: "اتصال مباشر", ctaPrimary: "ابدأ مشروعك الطبي",
          ctaSecondary: "راسلنا على واتساب",
          vName: "الاسم الكامل مطلوب", vPhone: "رقم الهاتف / واتساب مطلوب",
          vOrg: "نوع الجهة مطلوب", vMsg: "اكتب رسالة أوضح",
        };

  const schema = z.object({
    name: z.string().trim().min(2, t.vName).max(80),
    phone: z.string().trim().min(6, t.vPhone).max(40),
    organization_type: z.string().trim().min(1, t.vOrg),
    message: z.string().trim().min(10, t.vMsg).max(2000),
    specialty: z.string().trim().max(100).optional().or(z.literal("")),
    service_needed: z.string().trim().max(100).optional().or(z.literal("")),
    current_online_presence_links: z.string().trim().max(600).optional().or(z.literal("")),
    preferred_contact: z.string().trim().max(40).optional().or(z.literal("")),
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? t.err);
      return;
    }
    setLoading(true);
    const d = parsed.data;
    const payload = {
      full_name: d.name,
      phone: d.phone || null,
      specialty: d.specialty || null,
      entity_type: d.organization_type || null,
      requested_service: d.service_needed || null,
      preferred_contact_method: d.preferred_contact || null,
      website_or_page_url: d.current_online_presence_links || null,
      message: d.message,
      language: locale,
      status: "new",
    };
    const { error } = await db.from("contact_submissions").insert(payload);
    setLoading(false);
    if (error) {
      toast.error(t.err);
      return;
    }
    toast.success(t.success);
    (e.target as HTMLFormElement).reset();
  }

  // Build contact cards (prefer admin channels, else brand defaults)
  const defaultCards = [
    { icon: MessageCircle, label: t.waCard, value: "01020658409", url: WHATSAPP },
    { icon: Instagram, label: t.igCard, value: "shaima2_fahmy", url: "https://www.instagram.com/shaima2_fahmy" },
    { icon: Facebook, label: t.fbCard, value: "MDink Solutions", url: cfg.facebook_url },
    { icon: Phone, label: t.callCard, value: cfg.contact_phone, url: `tel:${(cfg.contact_phone || "").replace(/\s/g, "")}` },
  ];

  return (
    <MarketingLayout>
      {/* Hero */}
      <header className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <Sparkles className="h-3.5 w-3.5" /> {pick(c.hero_badge_ar, c.hero_badge_en)}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{L("title")}</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {L("intro")}
            </p>
          </Reveal>
        </div>
      </header>

      {/* Main: form + contact cards */}
      <main className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-5">
        {/* Contact cards */}
        <Reveal className="space-y-4 lg:col-span-2">
          {(channels.length
            ? channels.map((ch: any) => ({
                icon: pickIcon(ch.icon),
                label: ch.label || ch.platform,
                value: ch.username || ch.url,
                url: ch.url,
              }))
            : defaultCards
          ).map((card: any, i: number) => (
            <ContactInfoCard key={i} {...card} />
          ))}

          {/* Trust block */}
          <div className="rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <HandHeart className="h-7 w-7 text-brand" />
            <h3 className="mt-3 text-lg font-bold">{pick(c.trust_title_ar, c.trust_title_en)}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {pick(c.trust_body_ar, c.trust_body_en)}
            </p>
          </div>
        </Reveal>

        {/* Form */}
        <Reveal delay={120} className="lg:col-span-3">
          <div ref={formRef} id="consultation" className="scroll-mt-24">
            <form
              onSubmit={onSubmit}
              className="space-y-5 rounded-2xl border border-border bg-card p-7 shadow-card sm:p-8"
            >
              <div>
                <h2 className="text-2xl font-bold">{L("form_title")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{L("form_subtitle")}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t.name} req={t.required}>
                  <Input name="name" required maxLength={80} aria-required="true" className="mt-1.5" />
                </Field>
                <Field label={t.phone} req={t.required}>
                  <Input name="phone" required maxLength={40} dir="ltr" aria-required="true" className="mt-1.5" />
                </Field>
                <Field label={t.org} req={t.required}>
                  <Select name="organization_type" required choose={t.choose} options={ORG_TYPES} locale={locale} />
                </Field>
                <Field label={t.specialty} opt={t.optional}>
                  <Input name="specialty" maxLength={100} className="mt-1.5" placeholder={t.specialtyPlaceholder} />
                </Field>
                <Field label={t.service} opt={t.optional}>
                  <Select name="service_needed" choose={t.choose} options={SERVICES} locale={locale} />
                </Field>
                <Field label={t.method} opt={t.optional}>
                  <Select name="preferred_contact" choose={t.choose} options={CONTACT_METHODS} locale={locale} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label={t.link} opt={t.optional}>
                    <Textarea
                      name="current_online_presence_links"
                      maxLength={600}
                      rows={2}
                      dir="ltr"
                      className="mt-1.5"
                      placeholder={
                        locale === "en"
                          ? "Your website, social media pages, or any link related to your medical practice"
                          : "موقعك، صفحات السوشيال ميديا، أو أي رابط يخص نشاطك الطبي"
                      }
                    />
                  </Field>
                </div>
              </div>

              <Field label={t.message} req={t.required}>
                <Textarea
                  name="message"
                  required
                  maxLength={2000}
                  rows={5}
                  aria-required="true"
                  className="mt-1.5"
                  placeholder={t.msgPlaceholder}
                />
              </Field>

              <Button
                type="submit"
                size="lg"
                disabled={loading}
                className="w-full gradient-hero text-brand-foreground shadow-brand"
              >
                {loading ? t.sending : t.submit}
              </Button>
            </form>
          </div>
        </Reveal>
      </main>

      {/* What happens next */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t.processTitle}</h2>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, i) => (
              <Reveal
                key={step.en}
                delay={i * 90}
                className="relative rounded-2xl border border-border bg-background p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-hero text-base font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <step.icon className="mt-4 h-5 w-5 text-brand" />
                <p className="mt-2 text-sm font-semibold leading-relaxed">{pick(step.ar, step.en)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="mx-auto max-w-3xl text-2xl font-bold sm:text-3xl">
            {pick(c.cta_title_ar, c.cta_title_en)}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            {pick(c.cta_subtitle_ar, c.cta_subtitle_en)}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              variant="secondary"
              className="transition-transform hover:-translate-y-0.5"
              onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              {t.ctaPrimary}
            </Button>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-transparent px-6 text-sm font-medium text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" /> {t.ctaSecondary}
            </a>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}

function Field({
  label,
  req,
  opt,
  children,
}: {
  label: string;
  req?: string;
  opt?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm">
        {label}{" "}
        {req ? (
          <span className="text-brand">*</span>
        ) : opt ? (
          <span className="text-xs font-normal text-muted-foreground">{opt}</span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function Select({
  name,
  required,
  choose,
  options,
  locale,
}: {
  name: string;
  required?: boolean;
  choose: string;
  options: { ar: string; en: string }[];
  locale: string;
}) {
  return (
    <select
      name={name}
      required={required}
      aria-required={required}
      defaultValue=""
      className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:border-brand"
    >
      <option value="" disabled>
        {choose}
      </option>
      {options.map((o) => (
        <option key={o.en} value={locale === "en" ? o.en : o.ar}>
          {locale === "en" ? o.en : o.ar}
        </option>
      ))}
    </select>
  );
}

function ContactInfoCard({
  icon: Icon,
  label,
  value,
  url,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  url?: string;
}) {
  const isTel = url?.startsWith("tel:");
  function open() {
    if (!url) return;
    if (isTel) window.location.href = url;
    else window.open(url, "_blank", "noopener,noreferrer");
  }
  return (
    <button
      type="button"
      onClick={open}
      aria-label={label}
      className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-5 text-start shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-brand"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{label}</div>
        <div className="truncate text-sm text-muted-foreground" dir="ltr">
          {value}
        </div>
      </div>
    </button>
  );
}
