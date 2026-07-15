import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Clock,
  User,
  Home,
  ChevronLeft,
  ListTree,
  Facebook,
  Linkedin,
  Link2,
  MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/MarketingLayout";
import { useLocale } from "@/lib/i18n";
import { localized } from "@/lib/cms";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";
import { Reveal } from "@/components/Reveal";
import { BlockRenderer, headingId, type Block } from "@/components/BlockRenderer";
import { FaqAccordion, type FaqItem } from "@/components/FaqAccordion";

const WHATSAPP = "https://wa.me/201020658409";
const SITE_ORIGIN = "https://mdinksolutions.com";

export const Route = createFileRoute("/blog_/$slug")({
  loader: async ({ params }) => {
    try {
      const db = supabase as any;
      const { data } = await db
        .from("blog_posts")
        .select("title, title_en, meta_title, meta_description, excerpt, cover_image_url, published_at, author, faq")
        .eq("slug", params.slug)
        .eq("is_published", true)
        .maybeSingle();
      const article = data
        ? {
            title_ar: data.title,
            title_en: data.title_en || data.title,
            meta_title_ar: data.meta_title,
            meta_description_ar: data.meta_description,
            excerpt_ar: data.excerpt,
            cover_image_url: data.cover_image_url,
            published_at: data.published_at,
            author_name_ar: data.author,
            faq: Array.isArray(data.faq) ? data.faq : [],
          }
        : null;
      return { article };
    } catch {
      return { article: null };
    }
  },
  head: ({ params, loaderData }) => {
    const a = loaderData?.article;
    const title = a?.meta_title_ar || a?.title_ar || `${decodeURIComponent(params.slug)} — MDink Solutions Blog`;
    const desc = a?.meta_description_ar || a?.excerpt_ar || "مقال من مدونة MDink Solutions.";
    const url = `${SITE_ORIGIN}/blog/${params.slug}`;
    // JSON-LD: Article + BreadcrumbList + Organization
    const jsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Article",
          headline: a?.title_ar || decodeURIComponent(params.slug),
          description: desc,
          inLanguage: "ar",
          datePublished: a?.published_at || undefined,
          author: { "@type": "Organization", name: a?.author_name_ar || "MDink Solutions" },
          publisher: {
            "@type": "Organization",
            name: "MDink Solutions",
            logo: { "@type": "ImageObject", url: `${SITE_ORIGIN}/icons/icon-512.png` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          ...(a?.cover_image_url ? { image: a.cover_image_url } : {}),
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_ORIGIN },
            { "@type": "ListItem", position: 2, name: "المدونة", item: `${SITE_ORIGIN}/blog` },
            { "@type": "ListItem", position: 3, name: a?.title_ar || "", item: url },
          ],
        },
        {
          "@type": "Organization",
          name: "MDink Solutions",
          url: SITE_ORIGIN,
          logo: `${SITE_ORIGIN}/icons/icon-512.png`,
        },
        ...(Array.isArray(a?.faq) && a.faq.length
          ? [
              {
                "@type": "FAQPage",
                mainEntity: a.faq.map((it: any) => ({
                  "@type": "Question",
                  name: it.q,
                  acceptedAnswer: { "@type": "Answer", text: it.a },
                })),
              },
            ]
          : []),
      ],
    };
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(a?.cover_image_url
          ? [
              { property: "og:image", content: a.cover_image_url },
              { name: "twitter:image", content: a.cover_image_url },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
      ],
    };
  },
  component: BlogDetail,
  notFoundComponent: BlogNotFound,
});

function BlogNotFound() {
  const { locale } = useLocale();
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <h1 className="text-3xl font-bold">
          {locale === "en" ? "Article not found" : "المقال غير موجود"}
        </h1>
        <Link to="/blog" className="mt-6 inline-block text-brand">
          {locale === "en" ? "Back to Blog" : "العودة للمدونة"}
        </Link>
      </div>
    </MarketingLayout>
  );
}

function BlogDetail() {
  const { slug } = Route.useParams();
  const { locale } = useLocale();
  const db = supabase as any;
  const dir = "rtl"; // article body stays Arabic/RTL even in EN UI

  const copy =
    locale === "en"
      ? {
          back: "Back to Blog", loading: "Loading...", dateLocale: "en-US",
          home: "Home", blog: "Blog", toc: "Contents", related: "Related Articles",
          nextTitle: "Read Next", share: "Share Article", minRead: "min read", copy: "Copy link", copied: "Copied!",
          waCta: "Book a Free Consultation on WhatsApp",
        }
      : {
          back: "العودة للمدونة", loading: "جاري التحميل...", dateLocale: "ar-EG",
          home: "الرئيسية", blog: "المدونة", toc: "محتويات المقال", related: "مقالات ذات صلة",
          nextTitle: "المقال التالي", share: "شارك المقال", minRead: "دقيقة قراءة", copy: "نسخ الرابط", copied: "تم النسخ!",
          waCta: "احجز استشارة مجانية عبر واتساب",
        };

  const { data: post, isLoading, isError } = useQuery({
    queryKey: ["blog-v3", slug],
    retry: 1,
    queryFn: async () => {
      const { data, error } = await db
        .from("blog_posts")
        .select("*, blog_categories(name, name_en)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        title_ar: data.title,
        title_en: data.title_en || data.title,
        excerpt_ar: data.excerpt,
        excerpt_en: data.excerpt_en || data.excerpt,
        content_ar: data.content,
        content_en: data.content_en || data.content,
        category_ar: data.blog_categories?.name ?? "",
        category_en: data.blog_categories?.name_en ?? data.blog_categories?.name ?? "",
        author_name_ar: data.author,
        author_name_en: data.author,
        tags_ar: [],
        tags_en: [],
        related_slugs: data.related_slugs ?? [],
        next_slug: data.next_slug ?? null,
        content_blocks: Array.isArray(data.content_blocks) ? data.content_blocks : [],
        content_blocks_en: Array.isArray(data.content_blocks_en) ? data.content_blocks_en : [],
        faq: Array.isArray(data.faq) ? data.faq : [],
      };
    },
  });

  // زيادة عدّاد المشاهدات مرة واحدة عند فتح المقال
  useEffect(() => {
    if (!post?.slug) return;
    db.rpc("increment_blog_views", { post_slug: post.slug }).then(
      () => {},
      () => {},
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.slug]);

  // Next + related articles
  const { data: linked = { next: null, related: [] } } = useQuery({
    queryKey: ["blog-linked", slug, post?.next_slug, post?.related_slugs],
    enabled: !!post,
    queryFn: async () => {
      const nextSlug: string | null = post?.next_slug ?? null;
      const relSlugs: string[] = post?.related_slugs ?? [];
      const wanted = [...new Set([nextSlug, ...relSlugs].filter(Boolean))] as string[];
      if (!wanted.length) return { next: null, related: [] };
      const { data } = await db
        .from("blog_posts")
        .select("slug, title, excerpt, reading_time, cover_image_url, blog_categories(name, name_en)")
        .in("slug", wanted)
        .eq("is_published", true);
      const mapped = (data ?? []).map((r: any) => ({
        slug: r.slug,
        title_ar: r.title,
        title_en: r.title,
        excerpt_ar: r.excerpt,
        excerpt_en: r.excerpt,
        category_ar: r.blog_categories?.name ?? "",
        category_en: r.blog_categories?.name_en ?? "",
        reading_time: r.reading_time,
        cover_image_url: r.cover_image_url,
      }));
      const rows = mapped;
      const next = nextSlug ? rows.find((r: any) => r.slug === nextSlug) ?? null : null;
      const related = rows.filter((r: any) => r.slug !== nextSlug);
      return { next, related };
    },
  });
  const nextArticle = linked.next;
  const related = linked.related;

  const title = post ? localized(post, "title", locale) || post.title : "";
  const category = post ? localized(post, "category", locale) || post.category : "";
  const author = post ? (locale === "en" ? post.author_name_en : post.author_name_ar) : "";
  const rawContent = post
    ? (locale === "en" ? post.content_en || post.content_ar : post.content_ar) || post.content || ""
    : "";

  // البلوكات: أساس العرض. لو غير موجودة نرجع للنص القديم (توافق رجعي).
  const blocks: Block[] = useMemo(() => {
    if (!post) return [];
    const src =
      locale === "en" && Array.isArray(post.content_blocks_en) && post.content_blocks_en.length
        ? post.content_blocks_en
        : post.content_blocks;
    return Array.isArray(src) ? (src as Block[]) : [];
  }, [post, locale]);
  const hasBlocks = blocks.length > 0;
  const faqItems: FaqItem[] = post && Array.isArray(post.faq) ? post.faq : [];

  // Build TOC + inject heading ids (يعمل مع البلوكات أو النص القديم)
  const { html, toc } = useMemo(() => {
    if (hasBlocks) {
      let i = 0;
      const t = blocks
        .filter((b) => b.type === "heading")
        .map((b: any) => {
          i++;
          return { id: headingId(b.text, i), text: b.text, level: b.level };
        });
      return { html: "", toc: t };
    }
    return buildTocAndHtml(rawContent);
  }, [hasBlocks, blocks, rawContent]);

  const [copied, setCopied] = useState(false);
  const shareUrl = `${SITE_ORIGIN}/blog/${slug}`;

  function share(network: string) {
    const u = encodeURIComponent(shareUrl);
    const t = encodeURIComponent(title);
    const map: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      whatsapp: `https://wa.me/?text=${t}%20${u}`,
    };
    window.open(map[network], "_blank", "noopener,noreferrer");
  }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <MarketingLayout>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Breadcrumbs */}
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground" aria-label="breadcrumb">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-foreground">
            <Home className="h-3.5 w-3.5" /> {copy.home}
          </Link>
          <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
          <Link to="/blog" className="hover:text-foreground">{copy.blog}</Link>
          <ChevronLeft className="h-3 w-3 rtl:rotate-180" />
          <span className="line-clamp-1 text-foreground">{title}</span>
        </nav>

        {isLoading ? (
          <div className="mt-10 text-muted-foreground">{copy.loading}</div>
        ) : !post ? (
          <div className="mt-16 text-center">
            <h1 className="text-2xl font-bold">
              {locale === "en" ? "Article not found" : "المقال غير موجود"}
            </h1>
            <Link to="/blog" className="mt-4 inline-block font-semibold text-brand">
              {locale === "en" ? "Back to Blog" : "العودة للمدونة"}
            </Link>
          </div>
        ) : (
          <>
            {category && (
              <span className="mt-6 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {category}
              </span>
            )}
            <h1 className="mt-4 text-3xl font-extrabold leading-tight sm:text-4xl">{title}</h1>

            {/* صورة الغلاف — تحت العنوان مباشرة */}
            {post.cover_image_url && (
              <img
                src={post.cover_image_url}
                alt={title}
                loading="lazy"
                className="mt-6 w-full rounded-2xl object-cover"
              />
            )}

            {/* meta — الناشر والتاريخ أسفل الصورة */}
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {author && (
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <User className="h-4 w-4" /> {author}
                </span>
              )}
              {post.published_at && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" />
                  {new Date(post.published_at).toLocaleDateString(copy.dateLocale, { dateStyle: "long" })}
                </span>
              )}
              {post.reading_time ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" /> {post.reading_time} {copy.minRead}
                </span>
              ) : null}
            </div>

            {/* Table of contents */}
            {toc.length > 2 && (
              <nav className="mt-8 rounded-2xl border border-border bg-card p-5" dir={dir}>
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-bold">
                  <ListTree className="h-4 w-4 text-brand" /> {copy.toc}
                </div>
                <ul className="space-y-1.5">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level === 3 ? "ms-4" : ""}>
                      <a href={`#${h.id}`} className="text-sm text-muted-foreground hover:text-brand">
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            {/* Body — بلوكات أو نص قديم */}
            {hasBlocks ? (
              <div className="mt-8">
                <BlockRenderer blocks={blocks} waUrl={WHATSAPP} />
              </div>
            ) : (
              <div
                className="blog-content mt-8 max-w-none leading-loose text-foreground"
                dir={dir}
                dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(html) }}
              />
            )}

            {/* الأسئلة الشائعة */}
            {faqItems.length > 0 && (
              <FaqAccordion items={faqItems} title={locale === "en" ? "FAQ" : "أسئلة شائعة"} />
            )}

            {/* WhatsApp CTA */}
            <Reveal className="mt-12 overflow-hidden rounded-3xl gradient-hero p-8 text-center text-brand-foreground shadow-brand">
              <MessageCircle className="mx-auto h-9 w-9" />
              <h2 className="mt-3 text-xl font-bold">
                {locale === "en"
                  ? "Want to start with a team that understands your real needs?"
                  : "عايز تبدأ مع فريق فاهم احتياجك الحقيقي؟"}
              </h2>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
              >
                {copy.waCta}
              </a>
            </Reveal>

            {/* Share */}
            <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
              <span className="text-sm font-semibold">{copy.share}</span>
              <button type="button" onClick={() => share("facebook")} aria-label="Facebook"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent hover:text-brand">
                <Facebook className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => share("linkedin")} aria-label="LinkedIn"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent hover:text-brand">
                <Linkedin className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => share("whatsapp")} aria-label="WhatsApp"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent hover:text-brand">
                <MessageCircle className="h-4 w-4" />
              </button>
              <button type="button" onClick={copyLink} aria-label={copy.copy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent">
                <Link2 className="h-4 w-4" /> {copied ? copy.copied : copy.copy}
              </button>
            </div>

            {/* Next article (بعدها) */}
            {nextArticle && (
              <section className="mt-12">
                <div className="mb-3 text-sm font-bold text-brand">{copy.nextTitle}</div>
                <Link
                  to="/blog/$slug"
                  params={{ slug: nextArticle.slug }}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-brand/30 bg-brand/5 p-6 transition-all hover:-translate-y-1 hover:border-brand/50 hover:shadow-brand"
                >
                  <div>
                    <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                      {localized(nextArticle, "category", locale)}
                    </span>
                    <h3 className="mt-2 text-lg font-extrabold leading-snug">
                      {localized(nextArticle, "title", locale)}
                    </h3>
                    <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                      {localized(nextArticle, "excerpt", locale)}
                    </p>
                  </div>
                  <ArrowRight className="h-6 w-6 flex-shrink-0 text-brand rtl:rotate-0 ltr:rotate-180" />
                </Link>
              </section>
            )}

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xl font-extrabold">{copy.related}</h2>
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {related.map((r: any) => (
                    <Link
                      key={r.slug}
                      to="/blog/$slug"
                      params={{ slug: r.slug }}
                      className="group rounded-2xl border border-border bg-card p-5 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                    >
                      <span className="inline-flex rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                        {localized(r, "category", locale)}
                      </span>
                      <h3 className="mt-2 text-base font-bold leading-snug">
                        {localized(r, "title", locale)}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                        {localized(r, "excerpt", locale)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <Link
              to="/blog"
              className="mt-10 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              <ArrowRight className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" /> {copy.back}
            </Link>
          </>
        )}
      </article>
    </MarketingLayout>
  );
}

// ——— TOC builder: assigns ids to h2/h3 and extracts a list ———
function buildTocAndHtml(content: string): {
  html: string;
  toc: { id: string; text: string; level: number }[];
} {
  if (!content) return { html: "", toc: [] };

  // لو المحتوى نص عادي (بدون وسوم HTML)، حوّله لفقرات وعناوين تلقائيًا
  const looksLikeHtml = /<\/?(p|h[1-6]|ul|ol|li|div|br|strong|em|blockquote)\b/i.test(content);
  let source = content;
  if (!looksLikeHtml) {
    source = content
      .split(/\n{2,}/) // فقرات مفصولة بسطر فارغ
      .map((block) => {
        const line = block.trim();
        if (!line) return "";
        // سطر يبدأ بـ ## أو # → عنوان
        const h = line.match(/^(#{2,3})\s+(.*)$/);
        if (h) {
          const level = h[1].length === 2 ? 2 : 3;
          return `<h${level}>${h[2].trim()}</h${level}>`;
        }
        // أسطر متتالية تبدأ بأرقام أو - → قائمة
        const lines = line.split(/\n/).map((l) => l.trim()).filter(Boolean);
        const allList = lines.length > 1 && lines.every((l) => /^(\d+[.)]|[-*•])\s+/.test(l));
        if (allList) {
          const items = lines.map((l) => `<li>${l.replace(/^(\d+[.)]|[-*•])\s+/, "")}</li>`).join("");
          return `<ul>${items}</ul>`;
        }
        // فقرة عادية (مع الحفاظ على الأسطر المفردة)
        return `<p>${line.replace(/\n/g, "<br>")}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }

  const toc: { id: string; text: string; level: number }[] = [];
  let n = 0;
  const html = source.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (_m, lvl: string, attrs: string, inner: string) => {
      const level = parseInt(lvl, 10);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let id = (attrs.match(/id="([^"]+)"/) || [])[1];
      if (!id) {
        id = `h-${++n}`;
        attrs = `${attrs} id="${id}"`;
      }
      toc.push({ id, text, level });
      return `<h${level}${attrs}>${inner}</h${level}>`;
    },
  );
  return { html, toc };
}
