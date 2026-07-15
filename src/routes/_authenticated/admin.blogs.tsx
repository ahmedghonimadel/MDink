import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { ArticleEditor } from "@/components/admin/ArticleEditor";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import type { Block } from "@/components/BlockRenderer";
import type { FaqItem } from "@/components/FaqAccordion";
import { BlogManageLive } from "./-blog-manage-live";

export const Route = createFileRoute("/_authenticated/admin/blogs")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminBlogs,
});

const blogSchema = z.object({
  title_ar: z.string().trim().min(3, "العنوان مطلوب").max(200),
  title_en: z.string().trim().max(200).optional().or(z.literal("")),
  slug: z.string().trim().max(120).optional().or(z.literal("")),
  excerpt_ar: z.string().trim().max(500).optional().or(z.literal("")),
  excerpt_en: z.string().trim().max(500).optional().or(z.literal("")),
  content_ar: z.string().trim().max(30000).optional().or(z.literal("")),
  content_en: z.string().trim().max(30000).optional().or(z.literal("")),
  category_ar: z.string().trim().max(80).optional().or(z.literal("")),
  category_en: z.string().trim().max(80).optional().or(z.literal("")),
  cover_image_url: z.string().trim().max(500000).optional().or(z.literal("")),
  alt_ar: z.string().trim().max(200).optional().or(z.literal("")),
  alt_en: z.string().trim().max(200).optional().or(z.literal("")),
  meta_title_ar: z.string().trim().max(200).optional().or(z.literal("")),
  meta_title_en: z.string().trim().max(200).optional().or(z.literal("")),
  meta_description_ar: z.string().trim().max(300).optional().or(z.literal("")),
  meta_description_en: z.string().trim().max(300).optional().or(z.literal("")),
  is_featured: z.boolean(),
  next_slug: z.string().trim().max(200).optional().or(z.literal("")),
  related_slugs: z.string().trim().max(1000).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(9999),
  status: z.enum(["draft", "published"]),
});

type FormState = z.infer<typeof blogSchema>;
const empty: FormState = {
  title_ar: "",
  title_en: "",
  slug: "",
  excerpt_ar: "",
  excerpt_en: "",
  content_ar: "",
  content_en: "",
  category_ar: "",
  category_en: "",
  cover_image_url: "",
  alt_ar: "",
  alt_en: "",
  meta_title_ar: "",
  meta_title_en: "",
  meta_description_ar: "",
  meta_description_en: "",
  is_featured: false,
  next_slug: "",
  related_slugs: "",
  sort_order: 0,
  status: "draft",
};

// slug عربي/لاتيني آمن للرابط؛ يُبقي الحروف العربية واللاتينية والأرقام.
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// أول نص فقرة في البلوكات (لاشتقاق مقتطف/وصف تلقائي)
function firstParagraphText(blocks: Block[]): string {
  const p = blocks.find((b) => b.type === "paragraph") as any;
  return (p?.text as string) || "";
}

const TABS = [
  { id: "articles", label: "📝 المقالات" },
  { id: "categories", label: "🏷️ التصنيفات" },
];

function AdminBlogs() {
  const qc = useQueryClient();
  const db = supabase as any;

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data } = await db
        .from("blog_categories")
        .select("id, name, name_en, slug, is_active, display_order")
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState & { published_at?: string | null }>(empty);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("articles");
  const [editorOpen, setEditorOpen] = useState(false);

  const patch = (p: Record<string, any>) => setForm((f) => ({ ...f, ...p }));

  function startNew() {
    setEditingId(null);
    setForm(empty);
    setBlocks([]);
    setFaq([]);
  }

  function startEdit(blog: any) {
    setEditingId(blog.id);
    setBlocks(Array.isArray(blog.content_blocks) ? blog.content_blocks : []);
    setFaq(Array.isArray(blog.faq) ? blog.faq : []);
    setForm({
      title_ar: blog.title_ar ?? blog.title ?? "",
      title_en: blog.title_en ?? "",
      slug: blog.slug ?? "",
      excerpt_ar: blog.excerpt_ar ?? blog.excerpt ?? "",
      excerpt_en: blog.excerpt_en ?? "",
      content_ar: blog.content_ar ?? blog.content ?? "",
      content_en: blog.content_en ?? "",
      category_ar: blog.category_ar ?? blog.category ?? "",
      category_en: blog.category_en ?? "",
      cover_image_url: blog.cover_image_url ?? "",
      alt_ar: blog.alt_ar ?? "",
      alt_en: blog.alt_en ?? "",
      meta_title_ar: blog.meta_title_ar ?? "",
      meta_title_en: blog.meta_title_en ?? "",
      meta_description_ar: blog.meta_description_ar ?? "",
      meta_description_en: blog.meta_description_en ?? "",
      is_featured: !!blog.is_featured,
      next_slug: blog.next_slug ?? "",
      related_slugs: Array.isArray(blog.related_slugs) ? blog.related_slugs.join(", ") : "",
      sort_order: blog.sort_order ?? 0,
      status: (blog.status as "draft" | "published") ?? "draft",
      published_at: blog.published_at ?? null,
    });
  }

  async function save() {
    const parsed = blogSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
    const d = parsed.data;

    // slug تلقائي إن لم يُكتب
    let slug = (d.slug || "").trim();
    if (!slug) slug = slugify(d.title_en || d.title_ar) || `article-${Date.now().toString(36)}`;

    // slug فريد
    const dupe = (await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle()).data;
    if (dupe && dupe.id !== editingId) {
      return toast.error("هذا الرابط مستخدم في مقال آخر — غيّر العنوان أو الرابط من الخيارات المتقدمة");
    }

    // تحقّقات المقالات المرتبطة (تبقى للتوافق مع المقالات القديمة)
    if (d.next_slug) {
      if (d.next_slug === slug) return toast.error("المقال التالي لا يمكن أن يكون نفس المقال");
      const nx = (
        await db.from("blog_posts").select("id, is_published").eq("slug", d.next_slug).maybeSingle()
      ).data;
      if (!nx) return toast.error(`المقال التالي "${d.next_slug}" غير موجود`);
      if (!nx.is_published) return toast.error("المقال التالي موجود لكنه غير منشور");
    }
    const relatedList = d.related_slugs
      ? d.related_slugs.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (relatedList.length) {
      const { data: found } = await db.from("blog_posts").select("slug").in("slug", relatedList);
      const foundSlugs = new Set((found ?? []).map((r: any) => r.slug));
      const missing = relatedList.filter((s) => !foundSlugs.has(s));
      if (missing.length) return toast.error(`مقالات مرتبطة غير موجودة: ${missing.join("، ")}`);
    }

    setSaving(true);
    const publishedAt =
      d.status === "published" ? form.published_at || new Date().toISOString() : null;

    // حل التصنيف: ابحث عنه بالاسم أو أنشئه
    let categoryId: string | null = null;
    const catName = (d.category_ar || "").trim();
    if (catName) {
      const foundCat = (
        await db.from("blog_categories").select("id").eq("name", catName).maybeSingle()
      ).data;
      if (foundCat?.id) categoryId = foundCat.id;
      else {
        const catSlug =
          slugify(d.category_en || catName) + "-" + Math.random().toString(36).slice(2, 5);
        const ins = await db
          .from("blog_categories")
          .insert({ name: catName, name_en: d.category_en || null, slug: catSlug })
          .select("id")
          .maybeSingle();
        categoryId = ins.data?.id ?? null;
      }
    }

    // مقتطف/سيو تلقائي من المحتوى إن لم يُكتب
    const autoExcerpt = (d.excerpt_ar || firstParagraphText(blocks)).trim().slice(0, 200);
    const metaTitle = (d.meta_title_ar || d.title_ar).trim().slice(0, 200);
    const metaDesc = (d.meta_description_ar || autoExcerpt).trim().slice(0, 300);

    // نص بسيط من البلوكات لعمود content القديم
    const plainFromBlocks = blocks
      .map((b: any) => {
        if (b.type === "heading") return `${"#".repeat(b.level)} ${b.text}`;
        if (b.type === "paragraph" || b.type === "cta") return b.text;
        if (b.type === "note") return `**${b.title}:** ${b.text}`;
        if (b.type === "quote") return `> ${b.text}`;
        if (b.type === "list") return (b.items || []).map((i: string) => `- ${i}`).join("\n");
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      category_id: categoryId,
      title: d.title_ar,
      title_en: d.title_en || null,
      slug,
      excerpt: autoExcerpt || null,
      excerpt_en: d.excerpt_en || null,
      content: blocks.length ? plainFromBlocks : d.content_ar,
      content_en: d.content_en || null,
      content_blocks: blocks,
      faq: faq.filter((f) => f.q.trim() && f.a.trim()),
      cover_image_url: d.cover_image_url || null,
      author: "MDink Solutions",
      meta_title: metaTitle || null,
      meta_description: metaDesc || null,
      is_featured: d.is_featured,
      is_published: d.status === "published",
      next_slug: d.next_slug || null,
      related_slugs: relatedList,
      display_order: d.sort_order,
      published_at: publishedAt,
    };
    const { error } = editingId
      ? await db.from("blog_posts").update(payload).eq("id", editingId)
      : await db.from("blog_posts").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ المقال ✓");
    qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] });
    qc.invalidateQueries({ queryKey: ["public-blog-posts-v3"] });
    startNew();
    setEditorOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا المقال نهائيًا؟")) return;
    const { error } = await db.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] });
    qc.invalidateQueries({ queryKey: ["public-blog-posts-v3"] });
    toast.success("تم الحذف");
  }

  async function togglePublish(id: string, isPublished: boolean) {
    const { error } = await db.from("blog_posts").update({ is_published: !isPublished }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] });
    qc.invalidateQueries({ queryKey: ["public-blog-posts-v3"] });
    toast.success(isPublished ? "تم الإخفاء" : "تم النشر ✓");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة المدونة</h1>
        <p className="mt-1 text-muted-foreground">
          اكتب المقال كما يظهر للزائر — عنوان، صورة، ثم فقرة فقرة. الرابط والسيو يُضبطان تلقائيًا.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "gradient-hero text-brand-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "articles" && (
        <BlogManageLive
          onEdit={(b) => {
            startEdit(b);
            setEditorOpen(true);
          }}
          onNew={() => {
            startNew();
            setEditorOpen(true);
          }}
          onDelete={remove}
          onTogglePublish={togglePublish}
          onCategories={() => setTab("categories")}
        />
      )}

      {tab === "categories" && <CategoriesManager />}

      {/* محرّر المقال — بوب أب */}
      <ArticleEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        form={form}
        patch={patch}
        blocks={blocks}
        setBlocks={setBlocks}
        faq={faq}
        setFaq={setFaq}
        categories={categories}
        editingId={editingId}
        saving={saving}
        onSave={save}
      />
    </div>
  );
}
