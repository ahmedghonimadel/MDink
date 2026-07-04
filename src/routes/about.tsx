import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Heart,
  Sparkles,
  Target,
  Stethoscope,
  Search,
  HandHeart,
  MessageCircle,
  ShieldCheck,
  Trophy,
  ArrowLeft,
  ClipboardList,
  PencilRuler,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { MarketingLayout } from "@/components/MarketingLayout";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";
import { TeamMemberCard, type TeamMember } from "@/components/TeamMemberCard";

export const Route = createFileRoute("/about")({
  loader: async () => {
    const data = await getPageSeo("about");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink Solutions — من نحن";
    const desc =
      seo?.meta_description_ar ||
      "MDink Solutions شريك رقمي يفهم القطاع الطبي — فريق يجمع بين الاحتراف، الدفء، والمتابعة الحقيقية للأطباء والعيادات والمراكز الطبية.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "robots", content: seo?.robots || "index,follow" },
      ],
      links: seo?.canonical_url
        ? [{ rel: "canonical", href: seo.canonical_url }]
        : [{ rel: "canonical", href: "/about" }],
    };
  },
  component: AboutPage,
});

// ——— المحتوى المنظَّم (قابل للإدارة لاحقًا من اللوحة) ———
const DEFAULT: Record<string, any> = {
  hero_badge_ar: "فريق يفهم القطاع الطبي",
  hero_badge_en: "A Team That Understands the Medical Sector",
  hero_title_ar: "من نحن",
  hero_title_en: "About Us",
  hero_subtitle_ar:
    "في MDink Solutions، لا نبني حضورًا رقميًا فقط، بل نبني علاقة قائمة على الفهم، الثقة، والمتابعة الحقيقية. نحب أن يشعر كل عميل أنه يعمل مع فريق قريب منه، يفهم احتياجه، ويتعامل مع مشروعه كأنه جزء من بيته.",
  hero_subtitle_en:
    "At MDink Solutions, we do not only build digital presence — we build relationships rooted in understanding, trust, and genuine follow-up. We want every client to feel they are working with a team that understands their needs and treats their project with real care.",
  story_title_ar: "حكايتنا",
  story_title_en: "Our Story",
  story_body_ar:
    "بدأت MDink Solutions برغبة واضحة: أن يكون للطبيب والعيادة والجهة الطبية شريك رقمي يفهم طبيعة القطاع الطبي، ويجمع بين الاحتراف، الراحة، والمتابعة الصادقة. نحن لا نؤمن بالخدمة السريعة فقط، بل نؤمن بالعلاقة طويلة المدى، وبأن يشعر العميل أنه بين فريق يسانده ويهتم بنجاحه بصدق.",
  story_body_en:
    "MDink Solutions began with a clear purpose: to give doctors, clinics, and medical organizations a digital partner that truly understands the medical field and combines professionalism, comfort, and sincere follow-up. We do not believe in quick service alone; we believe in long-term relationships and in making clients feel supported by a team that genuinely cares about their success.",
  vision_ar:
    "أن نكون الشريك الرقمي الأقرب والأكثر فهمًا للقطاع الطبي، نبني حضورًا موثوقًا يليق بالأطباء والعيادات والجهات الطبية.",
  vision_en:
    "To become the most trusted and understanding digital partner for the medical sector, building a digital presence worthy of doctors, clinics, and medical institutions.",
  mission_ar:
    "أن نحول الخبرة الطبية إلى حضور رقمي واضح، دافئ، موثوق، وقابل للنمو من خلال المواقع، المحتوى، التصوير، والحملات.",
  mission_en:
    "To transform medical expertise into a clear, warm, trusted, and scalable digital presence through websites, content, photography, and campaigns.",
  values_ar: "الثقة، الوضوح، الالتزام، الاهتمام بالتفاصيل، الاحترام، والإنسانية في التعامل.",
  values_en:
    "Trust, clarity, commitment, attention to detail, respect, and a deeply human approach to client relationships.",
  team_title_ar: "فريق العمل",
  team_title_en: "Our Team",
  team_text_ar:
    "الأشخاص وراء تشغيل وتسويق وتطوير حضور MDink Solutions الطبي — فريق يجمع بين الخبرة، الود، والاهتمام الحقيقي بكل مشروع.",
  team_text_en:
    "The people behind MDink Solutions's medical marketing, development, content, and strategy — a team that combines expertise, warmth, and genuine care for every project.",
  life_title_ar: "من كواليس MDink Solutions",
  life_title_en: "Life at MDink Solutions",
  life_text_ar: "لحظات تعكس روح الفريق، التعاون، والجانب الإنساني وراء ما نقدمه.",
  life_text_en: "Moments that reflect our team spirit, collaboration, and the human side behind what we do.",
  relationship_title_ar: "نؤمن بالعلاقة قبل الخدمة",
  relationship_title_en: "We Believe in Relationships Before Services",
  relationship_text_ar:
    "نحن لا نبحث عن تنفيذ مهمة ثم الرحيل، بل نبحث عن شراكة يشعر فيها العميل بالراحة، والوضوح، والثقة في كل خطوة.",
  relationship_text_en:
    "We do not aim to complete a task and leave — we aim to build a partnership where the client feels comfortable, clear, and confident at every step.",
  cta_title_ar: "إذا كنت تبحث عن فريق يفهمك قبل أن يبيع لك، فنحن هنا.",
  cta_title_en: "If you are looking for a team that understands you before selling to you, we are here.",
  cta_subtitle_ar:
    "ابدأ مشروعك الطبي مع MDink Solutions، ودعنا نبني لك حضورًا رقميًا موثوقًا، منظمًا، ودافئًا يعكس قيمتك الحقيقية.",
  cta_subtitle_en:
    "Start your medical project with MDink Solutions, and let us build you a trusted, organized, and warm digital presence that reflects your real value.",
  cta_primary_ar: "ابدأ مشروعك الطبي",
  cta_primary_en: "Start Your Medical Project",
  cta_secondary_ar: "تواصل معنا",
  cta_secondary_en: "Contact Us",
};

const DIFFERENTIATORS = [
  { icon: Stethoscope, ar: "نفهم خصوصية القطاع الطبي", en: "We Understand the Medical Sector",
    dar: "خبرة متخصصة في تسويق ومواقع القطاع الطبي.", den: "Specialized experience in medical marketing and websites." },
  { icon: Search, ar: "نهتم بالتفاصيل الصغيرة قبل الكبيرة", en: "We Care About the Small Details",
    dar: "الجودة في التفاصيل هي ما يبني الثقة.", den: "Quality in the details is what builds trust." },
  { icon: HandHeart, ar: "نؤمن بالعلاقة قبل الخدمة", en: "We Believe in Relationships Before Services",
    dar: "نبني شراكة طويلة، لا صفقة عابرة.", den: "We build a lasting partnership, not a one-off deal." },
  { icon: MessageCircle, ar: "نتابع بصدق ووضوح", en: "We Follow Up with Clarity and Sincerity",
    dar: "تواصل واضح ومتابعة مستمرة في كل مرحلة.", den: "Clear communication and continuous follow-up at every stage." },
  { icon: ShieldCheck, ar: "نجمع بين الاحتراف والراحة", en: "We Combine Professionalism with Comfort",
    dar: "احترافية عالية بتعامل مريح وإنساني.", den: "High professionalism with a comfortable, human approach." },
  { icon: Trophy, ar: "نعمل كأن نجاحك جزء من نجاحنا", en: "We Treat Your Success as Part of Our Own",
    dar: "نجاحك هو مقياسنا الحقيقي.", den: "Your success is our real measure." },
];

const PROCESS = [
  { icon: ClipboardList, ar: "نفهم احتياجك", en: "We Understand Your Needs" },
  { icon: PencilRuler, ar: "نخطط بوضوح", en: "We Plan Clearly" },
  { icon: Heart, ar: "ننفذ بعناية", en: "We Execute with Care" },
  { icon: MessageCircle, ar: "نتابع باستمرار", en: "We Follow Up Consistently" },
  { icon: RefreshCw, ar: "نطور بناءً على النتائج", en: "We Improve Based on Results" },
];

function AboutPage() {
  const { locale } = useLocale();
  const db = supabase as any;
  const pick = (ar?: string, en?: string) => (locale === "en" ? en || ar || "" : ar || "");

  const { data: aboutPage } = useQuery({
    queryKey: ["page-sections-public", "about"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "about")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return { content: merged };
    },
  });

  const { data: team = [] } = useQuery({
    queryKey: ["public-team-v3"],
    queryFn: async () => {
      const rows =
        (await db.from("team_members").select("*").eq("is_visible", true).order("sort_order")).data ??
        [];
      return rows.sort((a: any, b: any) => (b.is_founder ? 1 : 0) - (a.is_founder ? 1 : 0));
    },
  });

  const gallery: any[] = [];

  const c = { ...DEFAULT, ...(aboutPage?.content ?? {}) };
  const L = (base: string) => c[`${base}_${locale}`] ?? c[`${base}_ar`] ?? "";

  const members: TeamMember[] = team.length
    ? team
    : [
        {
          name_ar: "شيماء فهمي",
          name_en: "Shaimaa Fahmy",
          role_ar: "المؤسس والمدير التنفيذي",
          role_en: "Founder & CEO",
          bio_ar:
            "تقود MDink Solutions برؤية تجمع بين الفهم الحقيقي للقطاع الطبي، والاهتمام بالتفاصيل، وبناء علاقات عمل مريحة وواضحة.",
          bio_en:
            "She leads MDink Solutions with a vision that combines real understanding of the medical sector, attention to detail, and building comfortable, clear client relationships.",
          is_founder: true,
        },
      ];

  const vmv = [
    { icon: Target, label_ar: "رؤيتنا", label_en: "Vision", text: L("vision") },
    { icon: Heart, label_ar: "رسالتنا", label_en: "Mission", text: L("mission") },
    { icon: Sparkles, label_ar: "قيمنا", label_en: "Values", text: L("values") },
  ];

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <Heart className="h-3.5 w-3.5" /> {pick(c.hero_badge_ar, c.hero_badge_en)}
            </div>
            <h1 className="mt-5 text-4xl font-extrabold sm:text-5xl">{L("hero_title")}</h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {L("hero_subtitle")}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Our story */}
      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Reveal>
          <SectionHeader title={pick(c.story_title_ar, c.story_title_en)} />
          <p className="mx-auto mt-4 max-w-3xl text-base leading-loose text-muted-foreground">
            {L("story_body")}
          </p>
        </Reveal>
      </section>

      {/* What makes us different */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <SectionHeader title={pick("ما الذي يميزنا؟", "What Makes Us Different?")} />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((d, i) => (
              <Reveal
                key={d.en}
                delay={(i % 3) * 90}
                className="rounded-2xl border border-border bg-background p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <d.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-base font-bold">{pick(d.ar, d.en)}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {pick(d.dar, d.den)}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Vision / Mission / Values */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {vmv.map((card, i) => (
            <Reveal
              key={card.label_en}
              delay={i * 100}
              className="rounded-2xl border border-border bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-hero text-brand-foreground">
                <card.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold">{pick(card.label_ar, card.label_en)}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{card.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <SectionHeader
              title={pick(c.team_title_ar, c.team_title_en)}
              subtitle={pick(c.team_text_ar, c.team_text_en)}
            />
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m, i) => (
              <Reveal key={m.id ?? i} delay={(i % 3) * 90}>
                <TeamMemberCard member={m} locale={locale} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Life at MDink Solutions — يظهر فقط عند وجود صور */}
      {gallery.length > 0 && (
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="text-center">
          <SectionHeader
            title={pick(c.life_title_ar, c.life_title_en)}
            subtitle={pick(c.life_text_ar, c.life_text_en)}
          />
        </Reveal>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((g: any, i: number) => (
            <Reveal
              key={g.id ?? i}
              delay={(i % 4) * 80}
              className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-card shadow-card"
            >
              {g.image_url ? (
                <>
                  <img
                    src={g.image_url}
                    alt={pick(g.caption_ar, g.caption_en) || "MDink Solutions"}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {(g.caption_ar || g.caption_en) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                      {pick(g.caption_ar, g.caption_en)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gradient-soft text-muted-foreground">
                  <ImageIcon className="h-8 w-8 text-brand/40" />
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* How we work */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <SectionHeader title={pick("كيف نعمل معك؟", "How We Work With You")} />
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PROCESS.map((step, i) => (
              <Reveal
                key={step.en}
                delay={i * 80}
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

      {/* Relationships before services */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl border border-brand/20 bg-brand/5 p-10 text-center sm:p-14">
          <HandHeart className="mx-auto h-10 w-10 text-brand" />
          <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">
            {pick(c.relationship_title_ar, c.relationship_title_en)}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {pick(c.relationship_text_ar, c.relationship_text_en)}
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="mx-auto max-w-3xl text-2xl font-bold sm:text-3xl">
            {pick(c.cta_title_ar, c.cta_title_en)}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            {pick(c.cta_subtitle_ar, c.cta_subtitle_en)}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="transition-transform hover:-translate-y-0.5">
              <Link to="/contact">{pick(c.cta_primary_ar, c.cta_primary_en)}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Link to="/contact">
                {pick(c.cta_secondary_ar, c.cta_secondary_en)}{" "}
                <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <>
      <h2 className="text-3xl font-extrabold">{title}</h2>
      {subtitle && <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{subtitle}</p>}
    </>
  );
}
