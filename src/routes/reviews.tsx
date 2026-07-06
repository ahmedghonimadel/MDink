import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useRef, useMemo, useEffect } from "react";
import { MarketingLayout } from "@/components/MarketingLayout";
import {
  Star,
  Quote,
  ArrowLeft,
  ShieldCheck,
  Video as VideoIcon,
  FileText,
  Link2,
  X,
  CheckCircle2,
  Play,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { useLocale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { VideoPlayer } from "@/components/VideoPlayer";
import { parseVideoUrl } from "@/lib/video";
import { Reveal } from "@/components/Reveal";
import { uploadMedia } from "@/lib/upload";

export const Route = createFileRoute("/reviews")({
  loader: async () => {
    const data = await getPageSeo("reviews");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink Solutions — آراء عملائنا";
    const desc =
      seo?.meta_description_ar ||
      "تجارب حقيقية من أطباء وعيادات وجهات طبية عملوا مع MDink Solutions: شهادات فيديو وآراء مكتوبة موثقة.";
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
  component: ReviewsPage,
});

type T = {
  id?: string;
  name_ar: string;
  name_en?: string;
  role_ar?: string;
  role_en?: string;
  title_ar?: string;
  title_en?: string;
  excerpt_ar?: string;
  excerpt_en?: string;
  full_text_ar?: string;
  full_text_en?: string;
  quote_ar?: string;
  quote_en?: string;
  rating?: number;
  media_type: "video" | "image" | "text";
  media_url?: string | null;
  thumbnail_url?: string | null;
  profile_url?: string | null;
  is_verified?: boolean;
};

const SEED: T[] = [
  {
    name_ar: "د. عزيزة",
    name_en: "Dr. Aziza",
    role_ar: "عميلة MDink Solutions",
    role_en: "MDink Solutions Client",
    title_ar: "رأي د. عزيزة",
    title_en: "Dr. Aziza's Review",
    excerpt_ar:
      "شهادة فيديو حقيقية توضح تجربة العميل مع MDink Solutions من ناحية الجودة والمتابعة والنتائج.",
    excerpt_en:
      "A real video testimonial highlighting the client's experience with MDink Solutions in terms of quality, follow-up, and results.",
    rating: 5,
    media_type: "video",
    media_url: "/testimonials/aziza-review.mp4",
    is_verified: true,
  },
  {
    name_ar: "أميرة منقوش",
    name_en: "Amira Manqoush",
    role_ar: "عميلة MDink Solutions",
    role_en: "MDink Solutions Client",
    title_ar: "رأي أميرة منقوش",
    title_en: "Amira Manqoush Review",
    excerpt_ar:
      "شهادة فيديو حقيقية عن تجربة العمل مع MDink Solutions ودور الفريق في التطوير المهني والظهور الرقمي.",
    excerpt_en:
      "A real video testimonial about working with MDink Solutions and the team's role in professional growth and digital presence.",
    rating: 5,
    media_type: "video",
    media_url: "/testimonials/amira-manqoush-review.mp4",
    is_verified: true,
  },
  {
    name_ar: "د. أميرة المنقوش",
    name_en: "Dr. Amira Al Mangoush",
    role_ar: "عميلة من ليبيا",
    role_en: "Client from Libya",
    title_ar: "رأي د. أميرة المنقوش",
    title_en: "Dr. Amira Al Mangoush Review",
    excerpt_ar:
      "تشير هذه الشهادة إلى فهم MDink Solutions الجيد للتسويق الطبي، حسن المتابعة، وجودة المحتوى والمقترحات.",
    excerpt_en:
      "This testimonial highlights MDink Solutions's strong understanding of medical marketing, attentive follow-up, and quality content and suggestions.",
    rating: 5,
    media_type: "image",
    media_url: "/testimonials/amira-almangoush-review.png",
    thumbnail_url: "/testimonials/amira-almangoush-review.png",
    is_verified: true,
  },
  {
    name_ar: "Dr. Ragab Allam",
    name_en: "Dr. Ragab Allam",
    role_ar: "جهة طبية",
    role_en: "Medical Professional",
    title_ar: "رأي د. رجب علام",
    title_en: "Dr. Ragab Allam Review",
    excerpt_ar:
      "توضح هذه الشهادة احترافية MDink Solutions، الالتزام بالمواعيد، والمتابعة المستمرة، مع فهم عميق للتسويق الطبي.",
    excerpt_en:
      "This testimonial reflects MDink Solutions's professionalism, commitment to deadlines, continuous follow-up, and deep understanding of medical marketing.",
    rating: 5,
    media_type: "image",
    media_url: "/testimonials/ragab-allam-review.png",
    thumbnail_url: "/testimonials/ragab-allam-review.png",
    is_verified: true,
  },
];

const P = {
  badge_ar: "تجارب موثقة",
  badge_en: "Verified Experiences",
  title_ar: "آراء عملائنا",
  title_en: "Client Reviews",
  intro_ar:
    "تجارب حقيقية من أطباء وعيادات وجهات طبية عملوا مع MDink Solutions وشاركوا رأيهم في مستوى الخدمة، المتابعة، والنتائج.",
  intro_en:
    "Real experiences from doctors, clinics, and medical organizations who worked with MDink Solutions and shared their feedback on service quality, follow-up, and results.",
  videoTitle_ar: "شهادات بالفيديو",
  videoTitle_en: "Video Testimonials",
  writtenTitle_ar: "آراء عملاء MDink Solutions",
  writtenTitle_en: "MDink Solutions Client Reviews",
  leaveTitle_ar: "اترك رأيك",
  leaveTitle_en: "Leave Your Review",
  leaveSub_ar:
    "يسعدنا استقبال رأيك وتجربتك مع MDink Solutions. نطلب اسمك الحقيقي ورابط بروفايلك للتوثيق قبل نشر الرأي.",
  leaveSub_en:
    "We'd love to receive your feedback about your experience with MDink Solutions. We require your real name and profile link for verification before publishing the review.",
  ctaTitle_ar: "هل تريد أن تصبح تجربتك هي الشهادة القادمة؟",
  ctaTitle_en: "Want Your Experience to Be the Next Testimonial?",
  ctaText_ar: "ابدأ مشروعك الطبي مع MDink Solutions، ودع نتائجك وتجربتك تتحدث عنك.",
  ctaText_en: "Start your medical project with MDink Solutions, and let your results and experience speak for themselves.",
  ctaPrimary_ar: "ابدأ مشروعك الطبي",
  ctaPrimary_en: "Start Your Medical Project",
  ctaSecondary_ar: "تواصل معنا",
  ctaSecondary_en: "Contact Us",
};

const TRUST = [
  { icon: ShieldCheck, ar: "آراء موثقة", en: "Verified Reviews" },
  { icon: VideoIcon, ar: "فيديوهات حقيقية", en: "Real Video Testimonials" },
  { icon: FileText, ar: "تقييمات مكتوبة", en: "Written Feedback" },
  { icon: Link2, ar: "قابلية التحقق من المصدر", en: "Source Verification" },
];

function ReviewsPage() {
  const { locale } = useLocale();
  const db = supabase as any;
  const pick = (ar?: string, en?: string) => (locale === "en" ? en || ar || "" : ar || "");

  const { data: videoRows = [] } = useQuery({
    queryKey: ["public-video-testimonials-v2"],
    queryFn: async () =>
      (await db.from("video_testimonials").select("*").eq("is_active", true).order("display_order"))
        .data ?? [],
  });
  const { data: writtenRows = [] } = useQuery({
    queryKey: ["public-written-testimonials-v2"],
    queryFn: async () =>
      (await db.from("written_testimonials").select("*").eq("is_active", true).order("display_order"))
        .data ?? [],
  });

  // خريطة الجدولين الجديدين إلى شكل T الذي تستخدمه الصفحة
  const mappedVideos: T[] = (videoRows as any[]).map((v) => ({
    id: v.id,
    name_ar: v.client_name,
    name_en: v.client_name,
    role_ar: v.client_specialty || v.client_title || "",
    role_en: v.client_specialty || v.client_title || "",
    title_ar: v.client_title || "",
    title_en: v.client_title || "",
    media_type: "video",
    media_url: v.video_url,
    thumbnail_url: v.thumbnail_url,
    rating: v.rating,
    is_verified: v.is_verified,
  }));
  const mappedWritten: T[] = (writtenRows as any[]).map((w) => ({
    id: w.id,
    name_ar: w.client_name,
    name_en: w.client_name,
    role_ar: w.client_specialty || w.client_title || "",
    role_en: w.client_specialty || w.client_title || "",
    title_ar: w.client_title || "",
    title_en: w.client_title || "",
    excerpt_ar: w.review_text || "",
    excerpt_en: w.review_text || "",
    full_text_ar: w.review_text || "",
    full_text_en: w.review_text || "",
    media_type: "image",
    media_url: w.review_image_url,
    thumbnail_url: w.review_image_url,
    profile_url: w.original_post_url,
    rating: w.rating,
    is_verified: w.is_verified,
  }));

  const videos = mappedVideos.length ? mappedVideos : SEED.filter((t) => t.media_type === "video");
  const written = mappedWritten.length
    ? mappedWritten
    : SEED.filter((t) => t.media_type === "image" || t.media_type === "text");

  const [lightbox, setLightbox] = useState<T | null>(null);

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border gradient-soft">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> {pick(P.badge_ar, P.badge_en)}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{pick(P.title_ar, P.title_en)}</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {pick(P.intro_ar, P.intro_en)}
            </p>
          </Reveal>

          {/* Trust strip */}
          <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TRUST.map((s, i) => (
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

      {/* Video testimonials carousel */}
      {videos.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <h2 className="text-center text-2xl font-extrabold sm:text-3xl">
              {pick(P.videoTitle_ar, P.videoTitle_en)}
            </h2>
          </Reveal>
          <VideoCarousel videos={videos} pick={pick} locale={locale} />
        </section>
      )}

      {/* Written testimonials */}
      {written.length > 0 && (
        <section className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <Reveal>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                {pick(P.writtenTitle_ar, P.writtenTitle_en)}
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {written.map((t, i) => (
                <Reveal
                  key={t.id ?? t.name_ar + i}
                  as="article"
                  delay={(i % 2) * 100}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                >
                  {/* image preview */}
                  <button
                    type="button"
                    onClick={() => setLightbox(t)}
                    className="relative block h-56 w-full overflow-hidden bg-muted"
                    aria-label={pick("عرض الرأي الكامل", "View full review")}
                  >
                    {t.thumbnail_url || t.media_url ? (
                      <img
                        src={t.thumbnail_url || t.media_url || ""}
                        alt={pick(t.title_ar, t.title_en)}
                        className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center gradient-hero text-brand-foreground">
                        <Quote className="h-12 w-12 opacity-80" />
                      </div>
                    )}
                    <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-brand/90 px-2.5 py-1 text-[10px] font-bold text-brand-foreground backdrop-blur">
                      <FileText className="h-3 w-3" /> {pick("رأي مكتوب", "Written")}
                    </span>
                  </button>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">{pick(t.title_ar, t.title_en)}</h3>
                      {t.is_verified && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                          <ShieldCheck className="h-3 w-3" /> {pick("موثق", "Verified")}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {pick(t.name_ar, t.name_en)}
                      {t.role_ar || t.role_en ? ` — ${pick(t.role_ar, t.role_en)}` : ""}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${
                            s < (t.rating ?? 5) ? "fill-accent text-accent" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {pick(t.excerpt_ar, t.excerpt_en)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setLightbox(t)}
                      className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90"
                    >
                      {pick("عرض الرأي الكامل", "View Full Review")}
                    </button>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="text-2xl font-bold sm:text-4xl">{pick(P.ctaTitle_ar, P.ctaTitle_en)}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">
            {pick(P.ctaText_ar, P.ctaText_en)}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="transition-transform hover:-translate-y-0.5">
              <Link to="/contact">{pick(P.ctaPrimary_ar, P.ctaPrimary_en)}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Link to="/contact">
                {pick(P.ctaSecondary_ar, P.ctaSecondary_en)}{" "}
                <ArrowLeft className="mr-2 h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>

      {/* Leave a review */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-2xl font-extrabold sm:text-3xl">{pick(P.leaveTitle_ar, P.leaveTitle_en)}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {pick(P.leaveSub_ar, P.leaveSub_en)}
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-8">
            <ReviewForm pick={pick} locale={locale} />
          </Reveal>
        </div>
      </section>

      {/* Lightbox for written reviews */}
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
          <div
            className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-2xl bg-background p-0 shadow-2xl sm:grid sm:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            {(lightbox.thumbnail_url || lightbox.media_url) && (
              <img
                src={lightbox.thumbnail_url || lightbox.media_url || ""}
                alt={pick(lightbox.title_ar, lightbox.title_en)}
                className="h-full max-h-[50vh] w-full object-contain bg-muted sm:max-h-[88vh]"
              />
            )}
            <div className="p-6">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold">{pick(lightbox.title_ar, lightbox.title_en)}</h3>
                {lightbox.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    <ShieldCheck className="h-3 w-3" /> {pick("موثق", "Verified")}
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {pick(lightbox.name_ar, lightbox.name_en)}
                {lightbox.role_ar || lightbox.role_en ? ` — ${pick(lightbox.role_ar, lightbox.role_en)}` : ""}
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground">
                {pick(lightbox.full_text_ar, lightbox.full_text_en) ||
                  pick(lightbox.excerpt_ar, lightbox.excerpt_en)}
              </p>
            </div>
          </div>
        </div>
      )}
    </MarketingLayout>
  );
}

// ——— Video carousel ———
function VideoCarousel({
  videos,
  pick,
  locale,
}: {
  videos: T[];
  pick: (ar?: string, en?: string) => string;
  locale: string;
}) {
  const [idx, setIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [wantPlay, setWantPlay] = useState(false);
  const touchX = useRef<number | null>(null);
  const active = videos[idx];
  const goTo = (i: number, play = false) => {
    setIdx(((i % videos.length) + videos.length) % videos.length);
    setVideoPlaying(false);
    setWantPlay(play);
  };
  const go = (d: number) => goTo(idx + d);

  // اللف التلقائي — يقف عند الوقوف بالماوس أو أثناء تشغيل فيديو حتى لا يقطع المشاهدة
  useEffect(() => {
    if (videos.length <= 1 || hovering || videoPlaying) return;
    const t = setInterval(() => setIdx((p) => (p + 1) % videos.length), 3000);
    return () => clearInterval(t);
  }, [videos.length, hovering, videoPlaying]);

  return (
    <div className="mt-8">
      {/* معرض دوّار (coverflow): النشط في النص والباقي يلف حوله */}
      <div
        className="relative mx-auto flex h-64 max-w-4xl items-center justify-center overflow-hidden sm:h-[420px]"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          // RTL-aware swipe
          if (Math.abs(dx) > 50) go(locale === "ar" ? (dx < 0 ? -1 : 1) : dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        {videos.map((v, i) => {
          const n = videos.length;
          let off = i - idx;
          if (off > n / 2) off -= n;
          if (off < -n / 2) off += n;
          if (Math.abs(off) > 1) return null;
          const isActive = off === 0;
          const parsed = parseVideoUrl(v.media_url || "");
          const poster = v.thumbnail_url || parsed.thumbnail;
          const label = pick(v.title_ar, v.title_en) || pick(v.name_ar, v.name_en);
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2 w-[82%] max-w-lg transition-all duration-[900ms] ease-in-out sm:w-[64%]"
              style={{
                transform: `translate(-50%, -50%) translateX(${off * 56}%) scale(${isActive ? 1 : 0.72})`,
                opacity: isActive ? 1 : 0.5,
                zIndex: isActive ? 30 : 20,
                filter: isActive ? "none" : "blur(1px)",
              }}
            >
              {isActive ? (
                <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-card">
                  <VideoPlayer
                    key={active.media_url}
                    url={active.media_url || ""}
                    thumbnail={active.thumbnail_url}
                    title={label}
                    autoPlay={wantPlay}
                    onPlayStateChange={setVideoPlaying}
                    onEnded={() => go(1)}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => goTo(i, true)}
                  aria-label={label}
                  title={label}
                  className="group relative block aspect-video w-full overflow-hidden rounded-3xl border border-border bg-black shadow-card"
                >
                  {poster ? (
                    <img src={poster} alt={label} className="h-full w-full object-cover" />
                  ) : parsed.kind === "file" ? (
                    <video
                      src={`${parsed.embedUrl}#t=1`}
                      muted
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full gradient-hero" />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/15">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-brand">
                      <Play className="h-5 w-5 translate-x-0.5 text-brand" fill="currentColor" />
                    </span>
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* بيانات الشهادة النشطة */}
      <div key={idx} className="testimonial-slide-in mx-auto mt-6 max-w-md text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-[11px] font-bold text-brand">
            <Play className="h-3 w-3" /> {pick("شهادة فيديو", "Video Testimonial")}
          </span>
          {active.is_verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold text-accent-foreground">
              <ShieldCheck className="h-3 w-3" /> {pick("موثق", "Verified")}
            </span>
          )}
        </div>
        <h3 className="mt-3 text-lg font-bold text-card-foreground">
          {pick(active.title_ar, active.title_en) || pick(active.name_ar, active.name_en)}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{pick(active.role_ar, active.role_en)}</p>
        {(active.excerpt_ar || active.excerpt_en) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pick(active.excerpt_ar, active.excerpt_en)}
          </p>
        )}
      </div>

      {videos.length > 1 && (
        <div className="mt-5 flex justify-center gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i, true)}
              aria-label={`${i + 1}`}
              className={`h-2.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-brand" : "w-2.5 bg-border hover:bg-brand/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ——— Leave a review form ———
function ReviewForm({
  pick,
  locale,
}: {
  pick: (ar?: string, en?: string) => string;
  locale: string;
}) {
  const db = supabase as any;
  const [form, setForm] = useState({
    full_name: "",
    profile_url: "",
    review_type: "text",
    review_text: "",
    job_title: "",
    platform_type: "facebook",
    consent: false,
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  async function submit() {
    setError("");
    if (!form.full_name.trim()) return setError(pick("الاسم مطلوب", "Name is required"));
    if (!form.profile_url.trim())
      return setError(pick("رابط البروفايل مطلوب", "Profile link is required"));
    if (form.review_type === "text" && !form.review_text.trim())
      return setError(pick("نص الرأي مطلوب", "Review text is required"));
    if ((form.review_type === "image" || form.review_type === "video") && !file)
      return setError(
        form.review_type === "image"
          ? pick("رفع الصورة مطلوب", "Image upload is required")
          : pick("رفع الفيديو مطلوب", "Video upload is required"),
      );
    if (!form.consent)
      return setError(
        pick("يجب الموافقة على نشر الرأي", "You must consent to publishing the review"),
      );

    setSubmitting(true);
    try {
      let media_url: string | null = null;
      if (file && (form.review_type === "image" || form.review_type === "video")) {
        media_url = await uploadMedia(file, "review-submissions");
      }
      const { error: insErr } = await db.from("written_testimonials").insert({
        client_name: form.full_name.trim(),
        client_title: form.job_title.trim() || null,
        client_specialty: form.job_title.trim() || null,
        review_text: form.review_text.trim() || null,
        review_image_url: form.review_type === "image" ? media_url : null,
        original_post_url: form.profile_url.trim() || null,
        rating: 5,
        is_verified: false,
        is_active: false, // pending — لا يظهر حتى يعتمده الأدمن
        display_order: 999,
      });
      if (insErr) throw insErr;
      setDone(true);
    } catch {
      setError(
        pick(
          "حدث خطأ أثناء الإرسال. حاول مرة أخرى.",
          "Something went wrong while submitting. Please try again.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-8 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
        <h3 className="mt-3 text-lg font-bold">{pick("شكرًا لك!", "Thank you!")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {pick(
            "تم استلام رأيك وسيتم مراجعته قبل النشر.",
            "Your review has been received and will be reviewed before publishing.",
          )}
        </p>
      </div>
    );
  }

  const inputCls = "mt-1.5";
  return (
    <div className="rounded-2xl border border-border bg-background p-6 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label>
            {pick("الاسم الكامل", "Full Name")} <span className="text-brand">*</span>
          </Label>
          <Input
            className={inputCls}
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder={pick("اسمك الحقيقي", "Your real name")}
          />
        </div>
        <div>
          <Label>
            {pick("رابط البروفايل", "Profile Link")} <span className="text-brand">*</span>
          </Label>
          <Input
            className={inputCls}
            dir="ltr"
            value={form.profile_url}
            onChange={(e) => set("profile_url", e.target.value)}
            placeholder="https://facebook.com/your.profile"
          />
        </div>
        <div>
          <Label>{pick("نوع الرأي", "Review Type")}</Label>
          <select
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.review_type}
            onChange={(e) => set("review_type", e.target.value)}
          >
            <option value="text">{pick("نص مكتوب", "Written text")}</option>
            <option value="image">{pick("صورة", "Image")}</option>
            <option value="video">{pick("فيديو", "Video")}</option>
          </select>
        </div>
        <div>
          <Label>{pick("نوع البروفايل", "Platform Type")}</Label>
          <select
            className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.platform_type}
            onChange={(e) => set("platform_type", e.target.value)}
          >
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="other">{pick("أخرى", "Other")}</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <Label>{pick("المسمى أو التخصص (اختياري)", "Job Title / Specialty (optional)")}</Label>
          <Input
            className={inputCls}
            value={form.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder={pick("مثال: استشاري جلدية", "e.g. Dermatology Consultant")}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>
            {pick("نص الرأي", "Review Text")}
            {form.review_type === "text" && <span className="text-brand"> *</span>}
          </Label>
          <Textarea
            className={inputCls}
            rows={4}
            value={form.review_text}
            onChange={(e) => set("review_text", e.target.value)}
            placeholder={pick("اكتب تجربتك مع MDink Solutions...", "Write about your experience with MDink Solutions...")}
          />
        </div>
        {(form.review_type === "image" || form.review_type === "video") && (
          <div className="sm:col-span-2">
            <Label>
              {form.review_type === "image"
                ? pick("رفع صورة", "Upload Image")
                : pick("رفع فيديو", "Upload Video")}{" "}
              <span className="text-brand">*</span>
            </Label>
            <Input
              type="file"
              accept={form.review_type === "image" ? "image/*" : "video/*"}
              className={inputCls}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              {pick(
                "مطلوب رفع صورة أو فيديو لرأيك. الكتابة اختيارية.",
                "An image or video of your review is required. Writing is optional.",
              )}
            </p>
          </div>
        )}
      </div>

      <label className="mt-5 flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => set("consent", e.target.checked)}
          className="mt-0.5 h-4 w-4 flex-shrink-0 accent-brand"
        />
        <span className="text-muted-foreground">
          {pick(
            "أوافق على عرض رأيي بشكل علني على موقع MDink Solutions.",
            "I consent to displaying my review publicly on the MDink Solutions website.",
          )}
        </span>
      </label>

      <p className="mt-3 text-[11px] text-muted-foreground">
        {pick(
          "كل الآراء تتم مراجعتها قبل النشر. لا نقبل الآراء المجهولة.",
          "All reviews are reviewed before publishing. Anonymous reviews are not accepted.",
        )}
      </p>

      {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}

      <Button
        type="button"
        size="lg"
        onClick={submit}
        disabled={submitting}
        className="mt-5 w-full gradient-hero text-brand-foreground shadow-brand"
      >
        {submitting ? pick("جارٍ الإرسال...", "Submitting...") : pick("إرسال الرأي", "Submit Review")}
      </Button>
    </div>
  );
}
