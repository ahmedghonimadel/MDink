import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { BlocksEditor } from "@/components/admin/BlocksEditor";
import { FaqEditor } from "@/components/admin/FaqEditor";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import type { Block } from "@/components/BlockRenderer";
import type { FaqItem } from "@/components/FaqAccordion";
import { BlogLivePreview } from "./-blog-live-preview";

export const Route = createFileRoute("/_authenticated/admin/blogs")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminBlogs,
});

const blogSchema = z.object({
  title_ar: z.string().trim().min(3, "العنوان العربي مطلوب").max(200),
  title_en: z.string().trim().max(200).optional().or(z.literal("")),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/i, "حروف وأرقام وشرطات فقط")
    .max(120),
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function AdminBlogs() {
  const qc = useQueryClient();
  const db = supabase as any;
  const { data: blogs = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts-v2"],
    queryFn: async () => {
      const rows =
        (await db
          .from("blog_posts")
          .select("*, blog_categories(name, name_en)")
          .order("created_at", { ascending: false })).data ?? [];
      return rows.map((p: any) => ({
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
    },
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [faq, setFaq] = useState<FaqItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("edit");

  // التصنيفات من القاعدة (dropdown ديناميكي)
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
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    const parsed = blogSchema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");

    // تحقّق: slug فريد (ليس مستخدمًا في مقال آخر)
    const dupe = (
      await db.from("blog_posts").select("id").eq("slug", parsed.data.slug).maybeSingle()
    ).data;
    if (dupe && dupe.id !== editingId) {
      return toast.error("هذا الـslug مستخدم في مقال آخر — اختر رابطًا مختلفًا");
    }

    // تحقّق: next_slug يشير لمقال منشور موجود (إن وُجد)
    if (parsed.data.next_slug) {
      if (parsed.data.next_slug === parsed.data.slug) {
        return toast.error("المقال التالي لا يمكن أن يكون نفس المقال");
      }
      const nx = (
        await db
          .from("blog_posts")
          .select("id, is_published")
          .eq("slug", parsed.data.next_slug)
          .maybeSingle()
      ).data;
      if (!nx) return toast.error(`المقال التالي "${parsed.data.next_slug}" غير موجود`);
      if (!nx.is_published) return toast.error("المقال التالي موجود لكنه غير منشور");
    }

    // تحقّق: related_slugs كلها موجودة (إن وُجدت)
    const relatedList = parsed.data.related_slugs
      ? parsed.data.related_slugs.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
    if (relatedList.length) {
      const { data: found } = await db
        .from("blog_posts")
        .select("slug")
        .in("slug", relatedList);
      const foundSlugs = new Set((found ?? []).map((r: any) => r.slug));
      const missing = relatedList.filter((s) => !foundSlugs.has(s));
      if (missing.length) {
        return toast.error(`مقالات مرتبطة غير موجودة: ${missing.join("، ")}`);
      }
    }

    setSaving(true);
    // الحفاظ على published_at الأصلي عند التعديل
    const existing = editingId ? blogs.find((b: any) => b.id === editingId) : null;
    const publishedAt =
      parsed.data.status === "published"
        ? existing?.published_at || new Date().toISOString()
        : null;

    // حل التصنيف: ابحث عنه بالاسم أو أنشئه، واحصل على category_id
    let categoryId: string | null = null;
    const catName = (parsed.data.category_ar || "").trim();
    if (catName) {
      const found = (await db.from("blog_categories").select("id").eq("name", catName).maybeSingle())
        .data;
      if (found?.id) categoryId = found.id;
      else {
        const slug =
          slugify(parsed.data.category_en || catName) + "-" + Math.random().toString(36).slice(2, 5);
        const ins = await db
          .from("blog_categories")
          .insert({ name: catName, name_en: parsed.data.category_en || null, slug })
          .select("id")
          .maybeSingle();
        categoryId = ins.data?.id ?? null;
      }
    }

    // نص بسيط من البلوكات للتوافق مع عمود content القديم
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
      title: parsed.data.title_ar,
      title_en: parsed.data.title_en || null,
      slug: parsed.data.slug,
      excerpt: parsed.data.excerpt_ar || null,
      excerpt_en: parsed.data.excerpt_en || null,
      content: blocks.length ? plainFromBlocks : parsed.data.content_ar,
      content_en: parsed.data.content_en || null,
      content_blocks: blocks,
      faq: faq.filter((f) => f.q.trim() && f.a.trim()),
      cover_image_url: parsed.data.cover_image_url || null,
      author: "فريق MDink Solutions",
      meta_title: parsed.data.meta_title_ar || null,
      meta_description: parsed.data.meta_description_ar || null,
      is_featured: parsed.data.is_featured,
      is_published: parsed.data.status === "published",
      next_slug: parsed.data.next_slug || null,
      related_slugs: relatedList,
      display_order: parsed.data.sort_order,
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
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا المقال نهائيًا؟")) return;
    const { error } = await db.from("blog_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-blog-posts-v2"] });
    toast.success("تم الحذف");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة المدونة</h1>
        <p className="mt-1 text-muted-foreground">
          المقالات ثنائية اللغة. المقال الذي لا يحتوي English لن يظهر في نسخة English للزوار.
        </p>
      </header>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "edit", label: "✍️ تعديل المقال" },
          { id: "preview", label: "✨ معاينة المقال" },
          { id: "categories", label: "🏷️ التصنيفات" },
        ].map((t) => (
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

      {tab === "preview" && <BlogLivePreview form={form} />}

      {tab === "categories" && <CategoriesManager />}

      {tab === "edit" && (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingId ? "تعديل مقال" : "مقال جديد"}</h2>
              {editingId && (
                <Button size="sm" variant="ghost" onClick={startNew}>
                  <Plus className="ml-1 h-4 w-4" /> مقال جديد
                </Button>
              )}
            </div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="العنوان عربي"
                  value={form.title_ar}
                  onChange={(v) => setForm({ ...form, title_ar: v })}
                />
                <Field
                  label="Title English"
                  value={form.title_en || ""}
                  onChange={(v) => setForm({ ...form, title_en: v })}
                />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field
                    label="Slug (الرابط)"
                    value={form.slug}
                    onChange={(v) => setForm({ ...form, slug: v })}
                    placeholder="my-article-slug"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({ ...form, slug: slugify(form.title_en || form.title_ar) })
                  }
                >
                  توليد تلقائي
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block text-sm font-medium">التصنيف</Label>
                  <select
                    value={form.category_ar || ""}
                    onChange={(e) => {
                      const selected = categories.find((c: any) => c.name === e.target.value);
                      setForm({
                        ...form,
                        category_ar: e.target.value,
                        category_en: selected?.name_en ?? form.category_en,
                      });
                    }}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">— اختر تصنيفًا —</option>
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                        {c.is_active ? "" : " (مخفي)"}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="Category English"
                  value={form.category_en || ""}
                  onChange={(v) => setForm({ ...form, category_en: v })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="المقتطف عربي"
                  value={form.excerpt_ar || ""}
                  onChange={(v) => setForm({ ...form, excerpt_ar: v })}
                  textarea
                />
                <Field
                  label="Excerpt English"
                  value={form.excerpt_en || ""}
                  onChange={(v) => setForm({ ...form, excerpt_en: v })}
                  textarea
                />
              </div>
              {/* محرر البلوكات — المصدر الأساسي للمحتوى */}
              <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4">
                <BlocksEditor blocks={blocks} onChange={setBlocks} />
              </div>

              {/* محرر الأسئلة الشائعة */}
              <div className="rounded-2xl border border-border bg-background p-4">
                <FaqEditor items={faq} onChange={setFaq} />
              </div>

              {/* المحرر النصي القديم — اختياري (يُستخدم فقط إن لم توجد بلوكات) */}
              <details className="rounded-2xl border border-border bg-background p-4">
                <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                  محرّر نصي قديم (اختياري — يُستخدم فقط إذا تركت البلوكات فارغة)
                </summary>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">المحتوى عربي</label>
                    <RichTextEditor
                      value={form.content_ar || ""}
                      onChange={(v) => setForm({ ...form, content_ar: v })}
                      placeholder="اكتب محتوى المقال هنا..."
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Content English</label>
                    <RichTextEditor
                      value={form.content_en || ""}
                      onChange={(v) => setForm({ ...form, content_en: v })}
                      placeholder="Write the article content here..."
                      dir="ltr"
                    />
                  </div>
                </div>
              </details>

              <ImageUpload
                label="صورة الغلاف"
                value={form.cover_image_url || ""}
                onChange={(v) => setForm({ ...form, cover_image_url: v })}
                folder="blog"
              />
              {form.cover_image_url ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Field
                    label="وصف الصورة عربي"
                    value={form.alt_ar || ""}
                    onChange={(v) => setForm({ ...form, alt_ar: v })}
                  />
                  <Field
                    label="Alt English"
                    value={form.alt_en || ""}
                    onChange={(v) => setForm({ ...form, alt_en: v })}
                  />
                </div>
              ) : null}

              <details>
                <summary className="cursor-pointer text-sm font-medium text-brand">
                  إعدادات SEO للمقال (اختياري)
                </summary>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <Field
                    label="Meta title عربي"
                    value={form.meta_title_ar || ""}
                    onChange={(v) => setForm({ ...form, meta_title_ar: v })}
                  />
                  <Field
                    label="Meta title English"
                    value={form.meta_title_en || ""}
                    onChange={(v) => setForm({ ...form, meta_title_en: v })}
                  />
                  <Field
                    label="Meta description عربي"
                    value={form.meta_description_ar || ""}
                    onChange={(v) => setForm({ ...form, meta_description_ar: v })}
                    textarea
                  />
                  <Field
                    label="Meta description English"
                    value={form.meta_description_en || ""}
                    onChange={(v) => setForm({ ...form, meta_description_en: v })}
                    textarea
                  />
                </div>
              </details>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <Label>الحالة</Label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value as "draft" | "published" })
                    }
                    className="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="draft">مسودة</option>
                    <option value="published">منشور</option>
                  </select>
                </div>
                <Field
                  label="ترتيب التثبيت (للمميز)"
                  type="number"
                  value={String(form.sort_order)}
                  onChange={(v) => setForm({ ...form, sort_order: Number(v) })}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="سلاج المقال التالي (next slug)"
                  value={form.next_slug || ""}
                  onChange={(v) => setForm({ ...form, next_slug: v })}
                />
                <Field
                  label="سلاجات المقالات المرتبطة (مفصولة بفاصلة)"
                  value={form.related_slugs || ""}
                  onChange={(v) => setForm({ ...form, related_slugs: v })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                />
                <Star className="h-4 w-4 text-accent" /> مقال مميز (يظهر في المقدمة — حد أقصى 5)
              </label>
              <Button
                onClick={save}
                disabled={saving}
                className="gradient-hero text-brand-foreground"
              >
                <Save className="ml-1 h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ المقال"}
              </Button>
            </div>
          </section>
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="text-lg font-bold">المقالات ({blogs.length})</h2>
            {isLoading ? (
              <div className="mt-3 text-sm text-muted-foreground">جاري التحميل...</div>
            ) : (
              <ul className="mt-4 space-y-3">
                {blogs.map((blog: any) => (
                  <li
                    key={blog.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background/40 p-3"
                  >
                    <button onClick={() => startEdit(blog)} className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-1 truncate font-semibold">
                        {blog.is_featured ? (
                          <Star className="h-3 w-3 flex-shrink-0 fill-accent text-accent" />
                        ) : null}
                        {blog.title_ar ?? blog.title}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {blog.status === "published" ? (
                          <Eye className="h-3 w-3 text-brand" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        <span>{blog.status === "published" ? "منشور" : "مسودة"}</span>
                        <span>·</span>
                        <span>
                          {blog.title_en && blog.content_en ? "English ✓" : "English ناقص"}
                        </span>
                      </div>
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => remove(blog.id)}
                      aria-label="حذف"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  placeholder,
  rows = 3,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  placeholder?: string;
  rows?: number;
  type?: string;
}) {
  const isEn = /English/i.test(label);
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <Textarea
          className="mt-1.5"
          rows={rows}
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          className="mt-1.5"
          type={type}
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
