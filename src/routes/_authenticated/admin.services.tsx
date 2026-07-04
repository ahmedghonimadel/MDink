import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { joinLines, splitLines } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { ServicesLivePreview } from "./-services-live-preview";

export const Route = createFileRoute("/_authenticated/admin/services")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminServices,
});

const ICON_OPTIONS = [
  "Globe",
  "TrendingUp",
  "Megaphone",
  "Sparkles",
  "ShieldCheck",
  "LayoutDashboard",
  "Camera",
  "Users",
  "Video",
  "Palette",
  "Stethoscope",
  "MessageCircle",
  "BarChart3",
  "LifeBuoy",
  "FileText",
];

const schema = z.object({
  title_ar: z.string().trim().min(2, "العنوان العربي مطلوب").max(160),
  title_en: z.string().trim().max(160).optional().or(z.literal("")),
  description_ar: z.string().trim().min(2, "الوصف العربي مطلوب").max(1000),
  description_en: z.string().trim().max(1000).optional().or(z.literal("")),
  checkmarks_ar: z.string().trim().optional().or(z.literal("")),
  checkmarks_en: z.string().trim().optional().or(z.literal("")),
  icon: z.string().trim().max(60).optional().or(z.literal("")),
  image_url: z.string().trim().max(800).optional().or(z.literal("")),
  alt_ar: z.string().trim().max(200).optional().or(z.literal("")),
  alt_en: z.string().trim().max(200).optional().or(z.literal("")),
  sort_order: z.coerce.number().int().min(0).max(9999),
  is_published: z.boolean(),
});

type FormState = z.infer<typeof schema>;
const empty: FormState = {
  title_ar: "",
  title_en: "",
  description_ar: "",
  description_en: "",
  checkmarks_ar: "",
  checkmarks_en: "",
  icon: "Globe",
  image_url: "",
  alt_ar: "",
  alt_en: "",
  sort_order: 0,
  is_published: true,
};

function AdminServices() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [tab, setTab] = useState("live");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services-v2"],
    queryFn: async () => {
      const rows = (await db.from("services").select("*").order("display_order")).data ?? [];
      // خريطة الحقول الجديدة → ما تتوقعه واجهة الإدارة
      return rows.map((s: any) => ({
        ...s,
        title_ar: s.title,
        title_en: s.title_en,
        description_ar: s.description,
        description_en: s.description_en,
        checkmarks_ar: s.bullets,
        checkmarks_en: s.bullets,
        sort_order: s.display_order,
        is_published: s.is_active,
        image_url: s.image_url ?? "",
      }));
    },
  });

  // Page header content من page_sections
  const { data: pageContent } = useQuery({
    queryKey: ["page-sections-admin", "services"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "services")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });
  const [page, setPage] = useState<Record<string, any>>({});
  useEffect(() => {
    if (pageContent) setPage(pageContent);
  }, [pageContent]);

  function edit(row: any) {
    setEditingId(row.id);
    setForm({
      title_ar: row.title_ar ?? "",
      title_en: row.title_en ?? "",
      description_ar: row.description_ar ?? "",
      description_en: row.description_en ?? "",
      checkmarks_ar: joinLines(row.checkmarks_ar),
      checkmarks_en: joinLines(row.checkmarks_en),
      icon: row.icon ?? "Globe",
      image_url: row.image_url ?? "",
      alt_ar: row.alt_ar ?? "",
      alt_en: row.alt_en ?? "",
      sort_order: row.sort_order ?? 0,
      is_published: !!row.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
    const d = parsed.data;
    const payload = {
      title: d.title_ar,
      title_en: d.title_en || null,
      description: d.description_ar || null,
      description_en: d.description_en || null,
      bullets: splitLines(d.checkmarks_ar || ""),
      icon: d.icon || null,
      display_order: d.sort_order,
      is_active: d.is_published,
    };
    const { error } = editingId
      ? await db.from("services").update(payload).eq("id", editingId)
      : await db.from("services").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الخدمة ✓");
    setEditingId(null);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["admin-services-v2"] });
    qc.invalidateQueries({ queryKey: ["public-services-v2"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف الخدمة نهائياً؟")) return;
    const { error } = await db.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-services-v2"] });
  }

  async function togglePublish(row: any) {
    const { error } = await db
      .from("services")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-services-v2"] });
    qc.invalidateQueries({ queryKey: ["public-services-v2"] });
  }

  async function reorder(row: any, dir: -1 | 1) {
    const sorted = [...services].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((s) => s.id === row.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await db.from("services").update({ display_order: swap.sort_order }).eq("id", row.id);
    await db.from("services").update({ display_order: row.sort_order }).eq("id", swap.id);
    qc.invalidateQueries({ queryKey: ["admin-services-v2"] });
    qc.invalidateQueries({ queryKey: ["public-services-v2"] });
  }

  async function savePage() {
    const { error } = await db.from("page_sections").upsert(
      {
        page_slug: "services",
        section_key: "intro",
        content_json: page,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cms-page", "services_page"] });
    qc.invalidateQueries({ queryKey: ["cms-page-public", "services_page"] });
    toast.success("تم حفظ عناوين الصفحة ✓");
  }

  const setP = (k: string, v: string) => setPage((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">إدارة خدمات MDink</h1>
          <p className="mt-1 text-muted-foreground">
            تحكم كامل في كروت الخدمات + عنوان الصفحة — بالعربي والإنجليزي.
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

      {tab === "live" && <ServicesLivePreview page={page} setPage={setPage} services={services} />}

      {tab === "edit" && (
        <>
          {/* Page header settings */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="mb-4 text-xl font-bold">عنوان صفحة الخدمات</h2>
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
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-brand">
                قسم دعوة الإجراء (CTA) في آخر الصفحة
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Field
                  label="عنوان CTA عربي"
                  value={page.cta_title_ar || ""}
                  onChange={(v) => setP("cta_title_ar", v)}
                />
                <Field
                  label="CTA Title English"
                  value={page.cta_title_en || ""}
                  onChange={(v) => setP("cta_title_en", v)}
                />
                <Field
                  label="نص CTA عربي"
                  value={page.cta_text_ar || ""}
                  onChange={(v) => setP("cta_text_ar", v)}
                  textarea
                />
                <Field
                  label="CTA Text English"
                  value={page.cta_text_en || ""}
                  onChange={(v) => setP("cta_text_en", v)}
                  textarea
                />
                <Field
                  label="زر أساسي عربي"
                  value={page.cta_primary_ar || ""}
                  onChange={(v) => setP("cta_primary_ar", v)}
                />
                <Field
                  label="Primary English"
                  value={page.cta_primary_en || ""}
                  onChange={(v) => setP("cta_primary_en", v)}
                />
                <Field
                  label="زر ثانوي عربي"
                  value={page.cta_secondary_ar || ""}
                  onChange={(v) => setP("cta_secondary_ar", v)}
                />
                <Field
                  label="Secondary English"
                  value={page.cta_secondary_en || ""}
                  onChange={(v) => setP("cta_secondary_en", v)}
                />
              </div>
            </details>
            <Button onClick={savePage} className="mt-4 gradient-hero text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> حفظ عناوين الصفحة
            </Button>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? "تعديل خدمة" : "خدمة جديدة"}</h2>
                {editingId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setForm(empty);
                    }}
                  >
                    <Plus className="ml-1 h-4 w-4" /> جديد
                  </Button>
                )}
              </div>
              <div className="mt-4 grid gap-3">
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
                <Field
                  label="الوصف عربي"
                  value={form.description_ar}
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
                  label="نقاط (Checkmarks) عربي — كل نقطة في سطر"
                  value={form.checkmarks_ar || ""}
                  onChange={(v) => setForm({ ...form, checkmarks_ar: v })}
                  textarea
                />
                <Field
                  label="Checkmarks English — one per line"
                  value={form.checkmarks_en || ""}
                  onChange={(v) => setForm({ ...form, checkmarks_en: v })}
                  textarea
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>الأيقونة</Label>
                    <select
                      value={form.icon || "Globe"}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Field
                    label="الترتيب"
                    type="number"
                    value={String(form.sort_order)}
                    onChange={(v) => setForm({ ...form, sort_order: Number(v) })}
                  />
                </div>
                <ImageUpload
                  label="صورة الخدمة (اختياري)"
                  value={form.image_url || ""}
                  onChange={(v) => setForm({ ...form, image_url: v })}
                  folder="services"
                />
                {form.image_url ? (
                  <div className="grid gap-3 sm:grid-cols-2">
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                  />{" "}
                  منشورة
                </label>
                <Button onClick={save} className="gradient-hero text-brand-foreground">
                  <Save className="ml-2 h-4 w-4" /> حفظ الخدمة
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="text-xl font-bold">الخدمات ({services.length})</h2>
              <div className="mt-4 space-y-3">
                {services.map((service: any, i: number) => (
                  <div
                    key={service.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                  >
                    {service.image_url ? (
                      <img
                        src={service.image_url}
                        alt={service.title_ar}
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand/10 text-xs text-brand">
                        {service.icon || "—"}
                      </div>
                    )}
                    <button onClick={() => edit(service)} className="min-w-0 flex-1 text-right">
                      <div className="truncate font-semibold">{service.title_ar}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {service.title_en || "English not set"}
                      </div>
                    </button>
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => reorder(service, -1)}
                        disabled={i === 0}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => reorder(service, 1)}
                        disabled={i === services.length - 1}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePublish(service)}
                      title={service.is_published ? "إخفاء" : "نشر"}
                    >
                      {service.is_published ? (
                        <Eye className="h-4 w-4 text-brand" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(service.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                    لا توجد خدمات بعد.
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
          rows={3}
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
