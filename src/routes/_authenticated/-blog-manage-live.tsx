import { useState, useRef, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Eye, EyeOff, FolderCog, ExternalLink, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/external-links";

/**
 * تعديل حي للمدونة — يعرض المقالات بنفس شكل صفحة /blog، وكل مقال عليه أدوات:
 * تعديل (يفتح محرّر المقال)، نشر/إخفاء، حذف، وفتح على الموقع. مع إضافة مقال
 * وإدارة التصنيفات — كل إمكانيات التبويبات التانية في مكان واحد شبه الموقع.
 */
export function BlogManageLive({
  onEdit,
  onNew,
  onDelete,
  onTogglePublish,
  onCategories,
}: {
  onEdit: (blog: any) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onTogglePublish: (id: string, isPublished: boolean) => void;
  onCategories: () => void;
}) {
  const db = supabase as any;
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const PAGE = 10;
  const { data: pageData, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["admin-blog-posts-v2", debouncedQ],
      initialPageParam: 0,
      queryFn: async ({ pageParam }) => {
        let query = db
          .from("blog_posts")
          .select("*, blog_categories(name, name_en)", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(pageParam as number, (pageParam as number) + PAGE - 1);
        if (debouncedQ) {
          const esc = debouncedQ.replace(/[%,]/g, " ");
          query = query.or(`title.ilike.%${esc}%,title_en.ilike.%${esc}%`);
        }
        const { data, error, count } = await query;
        if (error) throw error;
        const rows = (data ?? []).map((p: any) => ({
          ...p,
          title_ar: p.title,
          title_en: p.title_en ?? "",
          excerpt_ar: p.excerpt,
          excerpt_en: p.excerpt_en ?? "",
          content_ar: p.content,
          content_en: p.content_en ?? "",
          category_ar: p.blog_categories?.name ?? "",
          category_en: p.blog_categories?.name_en ?? "",
          status: p.is_published ? "published" : "draft",
          sort_order: p.display_order,
        }));
        return { rows, count: count ?? 0, from: pageParam as number };
      },
      getNextPageParam: (last: any) => {
        const loaded = last.from + last.rows.length;
        return loaded < last.count ? loaded : undefined;
      },
    });

  const all: any[] = (pageData?.pages ?? []).flatMap((p: any) => p.rows);
  const featured = all[0];
  const rest = all.slice(1);
  const hasMore = !!hasNextPage;
  const total = pageData?.pages?.[0]?.count ?? all.length;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, isFetchingNextPage, all.length]);

  const Cover = ({ url, title, small }: { url?: string; title: string; small?: boolean }) =>
    url ? (
      <img src={url} alt={title} loading="lazy" className="h-full w-full object-cover" />
    ) : (
      <div className={`flex h-full w-full items-center justify-center gradient-hero p-4 text-center font-bold text-brand-foreground ${small ? "text-sm" : "text-lg"}`}>
        {title}
      </div>
    );

  const Actions = ({ b }: { b: any }) => (
    <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-lg bg-background/90 p-1 shadow backdrop-blur">
      <button type="button" onClick={() => onEdit(b)} title="تعديل المقال" className="rounded p-1.5 text-brand hover:bg-brand/10"><Pencil className="h-4 w-4" /></button>
      <button type="button" onClick={() => onTogglePublish(b.id, b.is_published)} title={b.is_published ? "إخفاء" : "نشر"} className="rounded p-1.5 text-muted-foreground hover:bg-accent">{b.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
      {b.slug ? (
        <button type="button" onClick={() => openExternal(`/blog/${b.slug}`)} title="فتح على الموقع" className="rounded p-1.5 text-muted-foreground hover:bg-accent"><ExternalLink className="h-4 w-4" /></button>
      ) : null}
      <button type="button" onClick={() => onDelete(b.id)} title="حذف" className="rounded p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
    </div>
  );

  const Badge = ({ b }: { b: any }) =>
    !b.is_published ? (
      <span className="absolute left-3 top-3 z-10 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white">مسودة</span>
    ) : null;

  return (
    <div className="space-y-6">
      {/* شريط أدوات */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-sm text-muted-foreground">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم المقال…"
            className="h-9 w-full rounded-full border border-border bg-background pr-9 pl-3 text-sm outline-none focus:border-brand/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{total} مقال</span>
          <button type="button" onClick={onCategories} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-brand/40"><FolderCog className="h-3.5 w-3.5" /> التصنيفات</button>
          <button type="button" onClick={onNew} className="inline-flex items-center gap-1 rounded-full gradient-hero px-3 py-1.5 text-xs font-semibold text-brand-foreground shadow-brand"><Plus className="h-3.5 w-3.5" /> مقال جديد</button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          جاري التحميل…
        </div>
      ) : !all.length ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
          {debouncedQ ? `لا توجد نتائج مطابقة لـ "${debouncedQ}".` : 'لا توجد مقالات بعد. اضغطي "مقال جديد" للبدء.'}
        </div>
      ) : (
        <>
          {/* المقال المميّز (الأحدث) */}
          {featured && (
            <div className="group/item relative grid overflow-hidden rounded-3xl border border-border bg-card shadow-card md:grid-cols-2">
              <Badge b={featured} />
              <Actions b={featured} />
              <div className="relative h-56 md:h-full">
                <Cover url={featured.cover_image_url} title={featured.title_ar || featured.title} />
                <span className="absolute right-4 top-4 rounded-full bg-accent px-3 py-1 text-[11px] font-bold text-accent-foreground">مميّز</span>
              </div>
              <div className="flex flex-col justify-center p-7 sm:p-9">
                <span className="inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">{featured.category_ar || "بدون تصنيف"}</span>
                <h2 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{featured.title_ar || featured.title || "بدون عنوان"}</h2>
                <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{featured.excerpt_ar || ""}</p>
                <button type="button" onClick={() => onEdit(featured)} className="mt-5 inline-flex w-fit items-center gap-1 rounded-md gradient-hero px-5 py-2 text-sm font-semibold text-brand-foreground"><Pencil className="h-4 w-4" /> تعديل المقال</button>
              </div>
            </div>
          )}

          {/* شبكة المقالات */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((post: any) => (
              <article key={post.id} className="group/item relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <Badge b={post} />
                <Actions b={post} />
                <div className="relative h-44 overflow-hidden">
                  <Cover url={post.cover_image_url} title={post.title_ar || post.title} small />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <span className="inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">{post.category_ar || "بدون تصنيف"}</span>
                  <h2 className="mt-3 text-lg font-bold leading-snug">{post.title_ar || post.title || "بدون عنوان"}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">{post.excerpt_ar || ""}</p>
                  <button type="button" onClick={() => onEdit(post)} className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-semibold text-brand"><Pencil className="h-4 w-4" /> تعديل</button>
                </div>
              </article>
            ))}

            {/* إضافة مقال */}
            <button type="button" onClick={onNew} className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 text-brand transition-colors hover:bg-brand/5">
              <Plus className="h-8 w-8" />
              <span className="text-sm font-semibold">مقال جديد</span>
            </button>
          </div>

          {/* تحميل تدريجي: 10 مع السكرول + زر احتياطي */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-full border border-border px-5 py-2 text-sm font-medium text-muted-foreground hover:border-brand/40 hover:text-brand"
              >
                {isFetchingNextPage ? "جاري التحميل…" : "تحميل المزيد"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
