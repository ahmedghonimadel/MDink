import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useRef } from "react";
import { CalendarDays, ArrowLeft, Clock, Search, User, Newspaper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPageSeo } from "@/lib/content";
import { MarketingLayout } from "@/components/MarketingLayout";
import { useLocale } from "@/lib/i18n";
import { localized } from "@/lib/cms";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/blog")({
  loader: async () => {
    const data = await getPageSeo("blog");
    return { seo: data };
  },
  head: ({ loaderData }) => {
    const seo = loaderData?.seo;
    const title = seo?.meta_title_ar || "MDink Solutions — المدونة الطبية";
    const desc =
      seo?.meta_description_ar ||
      "مقالات ورؤى عملية في التسويق الطبي، المواقع، السوشيال ميديا، وإدارة العيادات.";
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
        : [{ rel: "canonical", href: "/blog" }],
    };
  },
  component: BlogPage,
});

function BlogPage() {
  const { locale } = useLocale();
  const db = supabase as any;
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");

  // التصنيفات ديناميكية من blog_categories (تنعكس فورًا عند التعديل من الداشبورد)
  const { data: categories = [] } = useQuery({
    queryKey: ["public-blog-categories"],
    queryFn: async () => {
      const { data } = await db
        .from("blog_categories")
        .select("id, name, name_en, slug, description, description_en, is_active, display_order")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const catChips = useMemo(
    () => [
      { key: "all", ar: "الكل", en: "All", description: "", description_en: "" },
      ...categories.map((c: any) => ({
        key: c.name,
        ar: c.name,
        en: c.name_en || c.name,
        description: c.description || "",
        description_en: c.description_en || c.description || "",
      })),
    ],
    [categories],
  );

  const activeCat = catChips.find((c) => c.key === cat);
  const activeCatDesc =
    cat !== "all" && activeCat
      ? locale === "en"
        ? activeCat.description_en
        : activeCat.description
      : "";

  const { data: cmsPage } = useQuery({
    queryKey: ["cms-page-public", "blog_page"],
    queryFn: async () =>
      (await db.from("page_sections").select("content_json").eq("page_slug","blog").eq("section_key","intro").maybeSingle()).data
        ?.content_json ?? {},
  });
  const pc = cmsPage ?? {};
  const pageTitle =
    (locale === "en" ? pc.title_en : pc.title_ar) ||
    (locale === "en" ? "Medical Blog" : "المدونة الطبية");
  const pageIntro =
    (locale === "en" ? pc.intro_en : pc.intro_ar) ||
    (locale === "en"
      ? "Practical insights on medical marketing, websites, social media, patient journey, and clinic management."
      : "مقالات ورؤى عملية في التسويق الطبي، المواقع، السوشيال ميديا، وإدارة العيادات.");

  const copy =
    locale === "en"
      ? {
          badge: "MDink Solutions Insights", loading: "Loading...",
          empty: "No articles match your search yet.",
          readMore: "Read Article", search: "Search articles...",
          dateLocale: "en-US", minRead: "min read",
          ctaTitle: "Start Building a Medical Presence Patients Trust",
          ctaText: "Read, understand, then start your medical project with a team that knows how to turn knowledge into effective digital presence.",
          ctaPrimary: "Start Your Medical Project", ctaSecondary: "Contact Us",
          featured: "Featured",
        }
      : {
          badge: "رؤى MDink Solutions", loading: "جاري التحميل...",
          empty: "لا توجد مقالات مطابقة لبحثك.",
          readMore: "اقرأ المقال", search: "ابحث في المقالات...",
          dateLocale: "ar-EG", minRead: "دقيقة قراءة",
          ctaTitle: "ابدأ بناء حضور طبي يثق به المرضى",
          ctaText: "اقرأ، افهم، ثم ابدأ مشروعك الطبي مع فريق يعرف كيف يحوّل المعرفة إلى حضور رقمي فعّال.",
          ctaPrimary: "ابدأ مشروعك الطبي", ctaSecondary: "تواصل معنا",
          featured: "مقال مميز",
        };

  // بحث بتأخير بسيط حتى لا نطلب من القاعدة مع كل حرف
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const catId = cat !== "all" ? (categories.find((c: any) => c.name === cat)?.id ?? null) : null;

  const mapRow = (p: any) => ({
    ...p,
    title_ar: p.title,
    title_en: p.title_en || p.title,
    excerpt_ar: p.excerpt,
    excerpt_en: p.excerpt_en || p.excerpt,
    category: p.blog_categories?.name ?? "",
    category_ar: p.blog_categories?.name ?? "",
    category_en: p.blog_categories?.name_en ?? p.blog_categories?.name ?? "",
    sort_order: p.display_order,
    author_name_ar: p.author,
    author_name_en: p.author,
    tags_ar: [],
    tags_en: [],
  });

  const PAGE_SIZE = 10;
  const {
    data: pageData,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["public-blog-posts-v3", catId, debouncedQ],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = db
        .from("blog_posts")
        .select("*, blog_categories(name, name_en, slug)", { count: "exact" })
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1);
      if (catId) query = query.eq("category_id", catId);
      if (debouncedQ) {
        const esc = debouncedQ.replace(/[%,]/g, " ");
        query = query.or(`title.ilike.%${esc}%,title_en.ilike.%${esc}%,excerpt.ilike.%${esc}%`);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      return { rows: (data ?? []).map(mapRow), count: count ?? 0, from: pageParam as number };
    },
    getNextPageParam: (last: any) => {
      const loaded = last.from + last.rows.length;
      return loaded < last.count ? loaded : undefined;
    },
  });

  const list: any[] = (pageData?.pages ?? []).flatMap((p: any) => p.rows);
  // المقال المميّز من الصفحة الأولى فقط (يبقى ثابتًا أثناء تحميل المزيد)
  const firstRows: any[] = pageData?.pages?.[0]?.rows ?? [];
  const featured = firstRows.find((p) => p.is_featured) ?? firstRows[0];
  const rest = list.filter((p) => p.id !== featured?.id);
  const hasMore = !!hasNextPage;
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, isFetchingNextPage, list.length]);

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(copy.dateLocale, { year: "numeric", month: "long" }) : "";

  return (
    <MarketingLayout>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 gradient-soft" />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <Reveal>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand">
              <Newspaper className="h-3.5 w-3.5" /> {copy.badge}
            </div>
            <h1 className="mt-4 text-4xl font-extrabold sm:text-5xl">{pageTitle}</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {pageIntro}
            </p>
          </Reveal>

          {/* Search + filters */}
          <Reveal delay={120} className="mt-8">
            <div className="relative max-w-md">
              <Search className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={copy.search}
                className="h-11 w-full rounded-full border border-border bg-background ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {catChips.map((c) => {
                const active = cat === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCat(c.key)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all sm:text-sm ${
                      active
                        ? "gradient-hero border-transparent text-brand-foreground shadow-brand"
                        : "border-border bg-card text-muted-foreground hover:border-brand/40 hover:text-foreground"
                    }`}
                  >
                    {locale === "en" ? c.en : c.ar}
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        {/* صندوق تعريف التصنيف المختار */}
        {activeCatDesc && (
          <Reveal className="mb-8 rounded-2xl border border-brand/20 bg-brand/5 p-6">
            <h2 className="text-lg font-bold text-brand">
              {locale === "en" ? activeCat?.en : activeCat?.ar}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{activeCatDesc}</p>
          </Reveal>
        )}
        {isLoading ? (
          <div className="text-muted-foreground">{copy.loading}</div>
        ) : !list.length ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {copy.empty}
          </div>
        ) : (
          <>
            {/* Featured */}
            {featured && (
              <Reveal>
                <Link
                  to="/blog/$slug"
                  params={{ slug: featured.slug }}
                  className="group grid overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand md:grid-cols-2"
                >
                  <div className="relative h-56 md:h-full">
                    {featured.cover_image_url ? (
                      <img
                        src={featured.cover_image_url}
                        alt={localized(featured, "title", locale)}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <BrandedCover title={localized(featured, "title", locale)} />
                    )}
                    <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">
                      {copy.featured}
                    </span>
                  </div>
                  <div className="flex flex-col justify-center p-7 sm:p-9">
                    <span className="inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
                      {localized(featured, "category", locale)}
                    </span>
                    <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">
                      {localized(featured, "title", locale)}
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                      {localized(featured, "excerpt", locale)}
                    </p>
                    <ArticleMeta post={featured} copy={copy} fmtDate={fmtDate} locale={locale} />
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                      {copy.readMore} <ArrowLeft className="h-4 w-4 rtl:rotate-0 ltr:rotate-180" />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Grid */}
            {rest.length > 0 && (
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((post, i) => (
                  <Reveal
                    key={post.id}
                    delay={(i % 3) * 90}
                    as="article"
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                  >
                    <Link
                      to="/blog/$slug"
                      params={{ slug: post.slug }}
                      className="flex h-full flex-col"
                    >
                      <div className="relative h-44 overflow-hidden">
                        {post.cover_image_url ? (
                          <img
                            src={post.cover_image_url}
                            alt={localized(post, "title", locale)}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <BrandedCover title={localized(post, "title", locale)} small />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-6">
                        <span className="inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
                          {localized(post, "category", locale)}
                        </span>
                        <h2 className="mt-3 text-lg font-bold leading-snug">
                          {localized(post, "title", locale)}
                        </h2>
                        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                          {localized(post, "excerpt", locale)}
                        </p>
                        <ArticleMeta post={post} copy={copy} fmtDate={fmtDate} locale={locale} />
                      </div>
                    </Link>
                  </Reveal>
                ))}
              </div>
            )}

            {hasMore && (
              <div ref={sentinelRef} className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-full border border-border px-6 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {isFetchingNextPage
                    ? locale === "en" ? "Loading…" : "جاري التحميل…"
                    : locale === "en" ? "Load more" : "تحميل المزيد"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <Reveal className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
          <h2 className="mx-auto max-w-3xl text-2xl font-bold sm:text-3xl">{copy.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm opacity-90 sm:text-base">{copy.ctaText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary" className="transition-transform hover:-translate-y-0.5">
              <Link to="/contact">{copy.ctaPrimary}</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-brand-foreground transition-transform hover:-translate-y-0.5 hover:bg-white/10"
            >
              <Link to="/contact">{copy.ctaSecondary}</Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </MarketingLayout>
  );
}

function ArticleMeta({
  post,
  copy,
  fmtDate,
  locale,
}: {
  post: any;
  copy: any;
  fmtDate: (d?: string) => string;
  locale: string;
}) {
  const author = locale === "en" ? post.author_name_en : post.author_name_ar;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 pt-4 text-xs text-muted-foreground">
      {author && (
        <span className="inline-flex items-center gap-1">
          <User className="h-3.5 w-3.5" /> {author}
        </span>
      )}
      {post.published_at && (
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(post.published_at)}
        </span>
      )}
      {post.reading_time ? (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {post.reading_time} {copy.minRead}
        </span>
      ) : null}
    </div>
  );
}

function BrandedCover({ title, small = false }: { title: string; small?: boolean }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center gradient-hero text-brand-foreground">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-white blur-2xl" />
        <div className="absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-white blur-2xl" />
      </div>
      <div className="relative px-6 text-center">
        <Newspaper className={small ? "mx-auto h-8 w-8 opacity-80" : "mx-auto h-12 w-12 opacity-80"} />
        {!small && <div className="mt-3 text-lg font-bold opacity-90 line-clamp-2">{title}</div>}
      </div>
    </div>
  );
}
