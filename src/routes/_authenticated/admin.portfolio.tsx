import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, Star, ExternalLink } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { openExternal } from "@/lib/external-links";
import { PortfolioLivePreview } from "./-portfolio-live-preview";

export const Route = createFileRoute("/_authenticated/admin/portfolio")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminPortfolio,
});

const ICON_OPTIONS = [
  "TrendingUp",
  "Search",
  "Users",
  "Award",
  "Globe",
  "Heart",
  "Megaphone",
  "Video",
  "Stethoscope",
];
const CATEGORIES = [
  { value: "case_study", label: "دراسة حالة (Case Study)" },
  { value: "more", label: "المزيد من أعمالنا" },
];

const schema = z.object({
  title_ar: z.string().trim().min(2, "اسم العمل العربي مطلوب").max(180),
  title_en: z.string().trim().max(180).optional().or(z.literal("")),
  client_name_ar: z.string().trim().max(180).optional().or(z.literal("")),
  client_name_en: z.string().trim().max(180).optional().or(z.literal("")),
  specialty_ar: z.string().trim().max(180).optional().or(z.literal("")),
  specialty_en: z.string().trim().max(180).optional().or(z.literal("")),
  description_ar: z.string().trim().max(2000).optional().or(z.literal("")),
  description_en: z.string().trim().max(2000).optional().or(z.literal("")),
  challenge_ar: z.string().trim().max(2000).optional().or(z.literal("")),
  challenge_en: z.string().trim().max(2000).optional().or(z.literal("")),
  result_ar: z.string().trim().max(2000).optional().or(z.literal("")),
  result_en: z.string().trim().max(2000).optional().or(z.literal("")),
  website_url: z.string().trim().max(800).optional().or(z.literal("")),
  image_url: z.string().trim().max(500000).optional().or(z.literal("")),
  alt_ar: z.string().trim().max(200).optional().or(z.literal("")),
  alt_en: z.string().trim().max(200).optional().or(z.literal("")),
  category: z.string(),
  sort_order: z.coerce.number().int().min(0).max(9999),
  is_featured: z.boolean(),
  is_published: z.boolean(),
});

type FormState = z.infer<typeof schema>;
const empty: FormState = {
  title_ar: "",
  title_en: "",
  client_name_ar: "",
  client_name_en: "",
  specialty_ar: "",
  specialty_en: "",
  description_ar: "",
  description_en: "",
  challenge_ar: "",
  challenge_en: "",
  result_ar: "",
  result_en: "",
  website_url: "",
  image_url: "",
  alt_ar: "",
  alt_en: "",
  category: "case_study",
  sort_order: 0,
  is_featured: false,
  is_published: true,
};

type Metric = { label_ar: string; label_en: string; value: string; icon: string };

function AdminPortfolio() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [tab, setTab] = useState("live");

  const { data: items = [] } = useQuery({
    queryKey: ["admin-portfolio-v2"],
    queryFn: async () => {
      const rows = (await db.from("portfolio_projects").select("*").order("display_order")).data ?? [];
      return rows.map((p: any) => ({
        ...p,
        title_ar: p.title,
        title_en: p.title_en,
        client_name_ar: p.client_name,
        description_ar: p.short_description,
        description_en: p.short_description_en,
        website_url: p.project_url,
        image_url: p.cover_image_url ?? "",
        sort_order: p.display_order,
        is_published: p.is_active,
      }));
    },
  });

  // Page header content من page_sections
  const { data: pageContent } = useQuery({
    queryKey: ["page-sections-admin", "portfolio"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "portfolio")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });
  const [page, setPage] = useState<Record<string, any>>({});
  useEffect(() => {
    if (pageContent) setPage(pageContent);
  }, [pageContent]);
  const setP = (k: string, v: string) => setPage((p) => ({ ...p, [k]: v }));

  function metricsFrom(item: any): Metric[] {
    if (Array.isArray(item.metrics_json) && item.metrics_json.length) return item.metrics_json;
    if (item.metrics && typeof item.metrics === "object" && !Array.isArray(item.metrics)) {
      return Object.entries(item.metrics)
        .filter(([k]) => k !== "result")
        .map(([label, value]) => ({
          label_ar: label,
          label_en: label,
          value: String(value),
          icon: "TrendingUp",
        }));
    }
    return [];
  }

  function edit(item: any) {
    setEditingId(item.id);
    setForm({
      title_ar: item.title_ar ?? item.title ?? "",
      title_en: item.title_en ?? "",
      client_name_ar: item.client_name_ar ?? item.client_name ?? "",
      client_name_en: item.client_name_en ?? "",
      specialty_ar: item.specialty_ar ?? item.specialty ?? "",
      specialty_en: item.specialty_en ?? "",
      description_ar: item.description_ar ?? item.description ?? "",
      description_en: item.description_en ?? "",
      challenge_ar: item.challenge_ar ?? "",
      challenge_en: item.challenge_en ?? "",
      result_ar: item.result_ar ?? "",
      result_en: item.result_en ?? "",
      website_url: item.website_url ?? item.url ?? "",
      image_url: item.image_url ?? "",
      alt_ar: item.alt_ar ?? "",
      alt_en: item.alt_en ?? "",
      category: item.category ?? "case_study",
      sort_order: item.sort_order ?? 0,
      is_featured: !!item.is_featured,
      is_published: !!item.is_published,
    });
    setMetrics(metricsFrom(item));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(empty);
    setMetrics([]);
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
    const slug =
      slugify(parsed.data.title_en || parsed.data.title_ar) +
      "-" +
      Math.random().toString(36).slice(2, 6);
    const payload: any = {
      title: parsed.data.title_ar,
      title_en: parsed.data.title_en || null,
      client_name: parsed.data.client_name_ar || null,
      category: parsed.data.category,
      short_description: parsed.data.description_ar || null,
      short_description_en: parsed.data.description_en || null,
      tags: metrics,
      project_url: parsed.data.website_url || null,
      button_text: parsed.data.website_url ? "زيارة الرابط" : null,
      cover_image_url: parsed.data.image_url || null,
      display_order: parsed.data.sort_order,
      is_featured: parsed.data.is_featured,
      is_active: parsed.data.is_published,
    };
    const { error } = editingId
      ? await db.from("portfolio_projects").update(payload).eq("id", editingId)
      : await db.from("portfolio_projects").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ العمل ✓");
    reset();
    qc.invalidateQueries({ queryKey: ["admin-portfolio-v2"] });
    qc.invalidateQueries({ queryKey: ["public-portfolio-projects-v2"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف العمل نهائياً؟")) return;
    const { error } = await db.from("portfolio_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-portfolio-v2"] });
  }

  async function togglePublish(item: any) {
    await db.from("portfolio_projects").update({ is_active: !item.is_active }).eq("id", item.id);
    qc.invalidateQueries({ queryKey: ["admin-portfolio-v2"] });
    qc.invalidateQueries({ queryKey: ["public-portfolio-projects-v2"] });
  }

  async function savePage() {
    const { error } = await db.from("page_sections").upsert(
      {
        page_slug: "portfolio",
        section_key: "intro",
        content_json: page,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["page-sections-admin", "portfolio"] });
    toast.success("تم حفظ عناوين الصفحة ✓");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">إدارة الأعمال Portfolio</h1>
          <p className="mt-1 text-muted-foreground">
            دراسات الحالة، المقاييس، الصور، والمزيد من أعمالنا — تحكم كامل بالعربي والإنجليزي.
          </p>
        </div>
        <Button onClick={savePage} className="gradient-hero text-brand-foreground shadow-brand">
          <Save className="ml-2 h-4 w-4" /> حفظ عناوين الصفحة
        </Button>
      </header>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "live", label: "✨ معاينة حية" },
          { id: "edit", label: "تعديل تفصيلي" },
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

      {tab === "live" && <PortfolioLivePreview page={page} setP={setP} items={items} />}

      {tab === "edit" && (
        <>
          {/* Page header */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-xl font-bold">عناوين صفحة الأعمال</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="العنوان عربي"
                value={page.title_ar || ""}
                onChange={(v) => setP("title_ar", v)}
              />
              <Field
                label="Title English"
                value={page.title_en || ""}
                onChange={(v) => setP("title_en", v)}
              />
              <Field
                label="الوصف عربي"
                value={page.intro_ar || ""}
                onChange={(v) => setP("intro_ar", v)}
                textarea
              />
              <Field
                label="Intro English"
                value={page.intro_en || ""}
                onChange={(v) => setP("intro_en", v)}
                textarea
              />
              <Field
                label="عنوان المزيد عربي"
                value={page.more_title_ar || ""}
                onChange={(v) => setP("more_title_ar", v)}
              />
              <Field
                label="More title English"
                value={page.more_title_en || ""}
                onChange={(v) => setP("more_title_en", v)}
              />
              <Field
                label="عنوان الريلز عربي"
                value={page.reels_title_ar || ""}
                onChange={(v) => setP("reels_title_ar", v)}
              />
              <Field
                label="Reels title English"
                value={page.reels_title_en || ""}
                onChange={(v) => setP("reels_title_en", v)}
              />
            </div>
            <Button onClick={savePage} className="mt-4 gradient-hero text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> حفظ عناوين الصفحة
            </Button>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? "تعديل عمل" : "عمل جديد"}</h2>
                {editingId && (
                  <Button variant="ghost" onClick={reset}>
                    <Plus className="ml-1 h-4 w-4" /> جديد
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>نوع العمل</Label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  label="اسم العمل عربي"
                  value={form.title_ar}
                  onChange={(v) => setForm({ ...form, title_ar: v })}
                />
                <Field
                  label="Title English"
                  value={form.title_en || ""}
                  onChange={(v) => setForm({ ...form, title_en: v })}
                />
                <Field
                  label="اسم العميل عربي"
                  value={form.client_name_ar || ""}
                  onChange={(v) => setForm({ ...form, client_name_ar: v })}
                />
                <Field
                  label="Client English"
                  value={form.client_name_en || ""}
                  onChange={(v) => setForm({ ...form, client_name_en: v })}
                />
                <Field
                  label="التخصص عربي"
                  value={form.specialty_ar || ""}
                  onChange={(v) => setForm({ ...form, specialty_ar: v })}
                />
                <Field
                  label="Specialty English"
                  value={form.specialty_en || ""}
                  onChange={(v) => setForm({ ...form, specialty_en: v })}
                />
                <Field
                  label="وصف عربي"
                  value={form.description_ar || ""}
                  onChange={(v) => setForm({ ...form, description_ar: v })}
                  textarea
                />
                <Field
                  label="Description English"
                  value={form.description_en || ""}
                  onChange={(v) => setForm({ ...form, description_en: v })}
                  textarea
                />
                <Field
                  label="التحدي عربي"
                  value={form.challenge_ar || ""}
                  onChange={(v) => setForm({ ...form, challenge_ar: v })}
                  textarea
                />
                <Field
                  label="Challenge English"
                  value={form.challenge_en || ""}
                  onChange={(v) => setForm({ ...form, challenge_en: v })}
                  textarea
                />
                <Field
                  label="النتيجة عربي"
                  value={form.result_ar || ""}
                  onChange={(v) => setForm({ ...form, result_ar: v })}
                  textarea
                />
                <Field
                  label="Result English"
                  value={form.result_en || ""}
                  onChange={(v) => setForm({ ...form, result_en: v })}
                  textarea
                />
                <Field
                  label="رابط الموقع"
                  value={form.website_url || ""}
                  onChange={(v) => setForm({ ...form, website_url: v })}
                />
                <Field
                  label="الترتيب"
                  type="number"
                  value={String(form.sort_order)}
                  onChange={(v) => setForm({ ...form, sort_order: Number(v) })}
                />
              </div>

              <div className="mt-4">
                <ImageUpload
                  label="صورة العمل (اختياري — بديل الخلفية الزرقاء)"
                  value={form.image_url || ""}
                  onChange={(v) => setForm({ ...form, image_url: v })}
                  folder="portfolio"
                />
                {form.image_url ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="وصف الصورة (alt) عربي"
                      value={form.alt_ar || ""}
                      onChange={(v) => setForm({ ...form, alt_ar: v })}
                    />
                    <Field
                      label="Image alt English"
                      value={form.alt_en || ""}
                      onChange={(v) => setForm({ ...form, alt_en: v })}
                    />
                  </div>
                ) : null}
              </div>

              {/* Metrics editor */}
              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold text-brand">
                  المقاييس (الأرقام والإحصائيات)
                </div>
                <div className="space-y-2">
                  {metrics.map((m, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-xl border border-border p-2"
                    >
                      <div className="grid flex-1 gap-2 sm:grid-cols-4">
                        <Input
                          placeholder="القيمة (+312%)"
                          value={m.value}
                          onChange={(e) => {
                            const n = [...metrics];
                            n[i] = { ...n[i], value: e.target.value };
                            setMetrics(n);
                          }}
                        />
                        <Input
                          placeholder="التسمية عربي"
                          value={m.label_ar}
                          onChange={(e) => {
                            const n = [...metrics];
                            n[i] = { ...n[i], label_ar: e.target.value };
                            setMetrics(n);
                          }}
                        />
                        <Input
                          dir="ltr"
                          placeholder="Label English"
                          value={m.label_en}
                          onChange={(e) => {
                            const n = [...metrics];
                            n[i] = { ...n[i], label_en: e.target.value };
                            setMetrics(n);
                          }}
                        />
                        <select
                          value={m.icon}
                          onChange={(e) => {
                            const n = [...metrics];
                            n[i] = { ...n[i], icon: e.target.value };
                            setMetrics(n);
                          }}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm"
                        >
                          {ICON_OPTIONS.map((ic) => (
                            <option key={ic} value={ic}>
                              {ic}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setMetrics(metrics.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setMetrics([
                        ...metrics,
                        { label_ar: "", label_en: "", value: "", icon: "TrendingUp" },
                      ])
                    }
                  >
                    <Plus className="ml-1 h-4 w-4" /> إضافة مقياس
                  </Button>
                </div>
              </div>

              <div className="mt-4 flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_featured}
                    onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  />{" "}
                  مميز
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  />{" "}
                  منشور
                </label>
              </div>
              <Button onClick={save} className="mt-5 gradient-hero text-brand-foreground">
                <Save className="ml-2 h-4 w-4" /> حفظ العمل
              </Button>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-xl font-bold">الأعمال ({items.length})</h2>
              <div className="mt-4 space-y-3">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title_ar ?? item.title}
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg gradient-hero text-sm font-bold text-brand-foreground">
                        {(item.title_ar ?? "?")[0]}
                      </div>
                    )}
                    <button onClick={() => edit(item)} className="min-w-0 flex-1 text-right">
                      <div className="flex items-center gap-1 truncate font-semibold">
                        {item.is_featured ? (
                          <Star className="h-3 w-3 flex-shrink-0 fill-accent text-accent" />
                        ) : null}
                        {item.title_ar ?? item.title}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {item.category === "more" ? "المزيد من أعمالنا" : "دراسة حالة"} ·{" "}
                        {item.website_url || "بدون رابط"}
                      </div>
                    </button>
                    {item.website_url ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openExternal(item.website_url)}
                        title="فتح الرابط للتأكد أنه يعمل"
                      >
                        <ExternalLink className="h-4 w-4 text-brand" />
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePublish(item)}
                      title={item.is_published ? "إخفاء" : "نشر"}
                    >
                      {item.is_published ? (
                        <Eye className="h-4 w-4 text-brand" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    لا توجد أعمال بعد.
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const isEn = /English/i.test(label);
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <Textarea
          className="mt-1.5"
          rows={2}
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="mt-1.5"
          type={type}
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
