import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, ArrowUp, ArrowDown, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function slugify(v: string) {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface CatForm {
  id: string | null;
  name: string;
  name_en: string;
  slug: string;
  description: string;
  description_en: string;
  is_active: boolean;
  display_order: number;
}
const emptyCat: CatForm = {
  id: null,
  name: "",
  name_en: "",
  slug: "",
  description: "",
  description_en: "",
  is_active: true,
  display_order: 0,
};

/**
 * إدارة تصنيفات المدونة: إضافة/تعديل/حذف/إخفاء-إظهار/ترتيب.
 * كل تغيير ينعكس فورًا على dropdown المقالات وعلى فلاتر المدونة العامة.
 */
export function CategoriesManager() {
  const qc = useQueryClient();
  const db = supabase as any;
  const [form, setForm] = useState<CatForm>(emptyCat);
  const [saving, setSaving] = useState(false);

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data } = await db
        .from("blog_categories")
        .select("*")
        .order("display_order", { ascending: true });
      return data ?? [];
    },
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
    qc.invalidateQueries({ queryKey: ["public-blog-categories"] });
  }

  function edit(c: any) {
    setForm({
      id: c.id,
      name: c.name ?? "",
      name_en: c.name_en ?? "",
      slug: c.slug ?? "",
      description: c.description ?? "",
      description_en: c.description_en ?? "",
      is_active: c.is_active ?? true,
      display_order: c.display_order ?? 0,
    });
  }

  async function save() {
    if (form.name.trim().length < 2) return toast.error("اسم التصنيف مطلوب");
    const slug = form.slug.trim() || slugify(form.name_en || form.name);

    // تحقّق تفرّد الـslug
    const dupe = (await db.from("blog_categories").select("id").eq("slug", slug).maybeSingle()).data;
    if (dupe && dupe.id !== form.id) return toast.error("هذا الـslug مستخدم في تصنيف آخر");

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      name_en: form.name_en.trim() || null,
      slug,
      description: form.description.trim() || null,
      description_en: form.description_en.trim() || null,
      is_active: form.is_active,
      display_order: form.display_order,
    };
    const { error } = form.id
      ? await db.from("blog_categories").update(payload).eq("id", form.id)
      : await db.from("blog_categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ التصنيف ✓");
    setForm(emptyCat);
    refresh();
  }

  async function toggleActive(c: any) {
    const { error } = await db
      .from("blog_categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    refresh();
  }

  async function move(c: any, dir: -1 | 1) {
    const sorted = [...cats].sort((a, b) => a.display_order - b.display_order);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const to = idx + dir;
    if (to < 0 || to >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[to];
    await db.from("blog_categories").update({ display_order: b.display_order }).eq("id", a.id);
    await db.from("blog_categories").update({ display_order: a.display_order }).eq("id", b.id);
    refresh();
  }

  async function remove(c: any) {
    // امنع الحذف لو فيه مقالات مرتبطة
    const { count } = await db
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("category_id", c.id);
    if (count && count > 0) {
      return toast.error(`لا يمكن الحذف: ${count} مقال مرتبط بهذا التصنيف. انقلها أولًا أو أخفِ التصنيف.`);
    }
    if (!confirm(`حذف تصنيف "${c.name}" نهائيًا؟`)) return;
    const { error } = await db.from("blog_categories").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("تم حذف التصنيف");
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
      {/* نموذج التصنيف */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{form.id ? "تعديل تصنيف" : "تصنيف جديد"}</h2>
          {form.id && (
            <Button size="sm" variant="ghost" onClick={() => setForm(emptyCat)}>
              <X className="ml-1 h-4 w-4" /> إلغاء
            </Button>
          )}
        </div>
        <div className="mt-4 space-y-3">
          <div>
            <Label className="mb-1.5 block text-sm">الاسم (عربي)</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="التسويق الطبي"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Name (English)</Label>
            <Input
              value={form.name_en}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
              placeholder="Medical Marketing"
            />
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">Slug (الرابط)</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="medical-marketing"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm({ ...form, slug: slugify(form.name_en || form.name) })}
            >
              توليد
            </Button>
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">وصف التصنيف (يظهر عند اختياره)</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="مقالات عملية في تسويق العيادات..."
              rows={2}
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Description (English)</Label>
            <Textarea
              value={form.description_en}
              onChange={(e) => setForm({ ...form, description_en: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              مفعّل (ظاهر للزوار)
            </label>
            <div className="flex items-center gap-2">
              <Label className="text-sm">الترتيب</Label>
              <Input
                type="number"
                value={form.display_order}
                onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                className="w-20"
              />
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="w-full">
            <Save className="ml-1 h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "حفظ التصنيف"}
          </Button>
        </div>
      </section>

      {/* قائمة التصنيفات */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="mb-4 text-lg font-bold">التصنيفات ({cats.length})</h2>
        {isLoading ? (
          <div className="text-muted-foreground">جارٍ التحميل...</div>
        ) : cats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            لا توجد تصنيفات. أضف أول تصنيف.
          </div>
        ) : (
          <div className="space-y-2">
            {[...cats]
              .sort((a, b) => a.display_order - b.display_order)
              .map((c, i, arr) => (
                <div
                  key={c.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    c.is_active ? "border-border bg-background" : "border-dashed border-border bg-muted/30 opacity-70"
                  }`}
                >
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(c, -1)}
                      disabled={i === 0}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="لأعلى"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(c, 1)}
                      disabled={i === arr.length - 1}
                      className="rounded p-0.5 text-muted-foreground hover:bg-accent disabled:opacity-30"
                      aria-label="لأسفل"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.name_en || "—"} · /{c.slug}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleActive(c)}
                    className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
                    aria-label={c.is_active ? "إخفاء" : "إظهار"}
                    title={c.is_active ? "إخفاء" : "إظهار"}
                  >
                    {c.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <Button size="sm" variant="ghost" onClick={() => edit(c)}>
                    تعديل
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove(c)}
                    className="rounded-lg p-2 text-destructive hover:bg-destructive/10"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
