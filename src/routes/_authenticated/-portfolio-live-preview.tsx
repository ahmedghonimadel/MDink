import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Plus, Trash2, Eye, EyeOff, Star, ChevronUp, ChevronDown } from "lucide-react";
import { EditableText } from "@/components/Editable";
import { ImageUpload } from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/external-links";

const CATEGORIES = [
  { key: "medical_websites", ar: "مواقع طبية", en: "Medical Websites" },
  { key: "social_media", ar: "سوشيال ميديا", en: "Social Media" },
  { key: "medical_photography", ar: "تصوير طبي", en: "Medical Photography" },
  { key: "seo_results", ar: "SEO ونتائج بحث", en: "SEO & Search Results" },
  { key: "monthly_work", ar: "أعمال شهرية", en: "Monthly Work" },
];

/**
 * الصفحة الحية لإدارة الأعمال — بنفس تصميم /portfolio.
 * كل عمل يُعدّل في مكانه ويُحفظ فورًا في portfolio_projects بالأعمدة الصحيحة
 * (title / short_description / project_url / cover_image_url / category).
 * عناوين الصفحة تُحفظ بزر "حفظ" أسفل الصفحة.
 */
export function PortfolioLivePreview({
  page,
  setP,
  items,
}: {
  page: Record<string, any>;
  setP: (k: string, v: string) => void;
  items: any[];
}) {
  const db = supabase as any;
  const qc = useQueryClient();
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-portfolio-v2"] });
    qc.invalidateQueries({ queryKey: ["public-portfolio-projects-v2"] });
  };
  async function saveField(id: string, column: string, value: any) {
    const { error } = await db.from("portfolio_projects").update({ [column]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تم الحفظ ✓");
  }
  async function addProject() {
    const maxOrder = items.reduce((m, p) => Math.max(m, p.sort_order ?? 0), 0);
    const { error } = await db.from("portfolio_projects").insert({
      title: "عمل جديد",
      category: "medical_websites",
      is_active: true,
      is_featured: false,
      display_order: maxOrder + 1,
    });
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تمت إضافة عمل");
  }
  async function deleteProject(id: string) {
    if (!confirm("حذف العمل نهائيًا؟")) return;
    const { error } = await db.from("portfolio_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تم الحذف");
  }
  async function reorder(id: string, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((s) => s.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const cur = sorted[idx];
    await db.from("portfolio_projects").update({ display_order: swap.sort_order ?? 0 }).eq("id", cur.id);
    await db.from("portfolio_projects").update({ display_order: cur.sort_order ?? 0 }).eq("id", swap.id);
    refresh();
  }

  return (
    <div className="space-y-8">
      {/* شريط أدوات */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-sm text-muted-foreground backdrop-blur">
        <span>👇 صفحة حية بنفس شكل /portfolio — تعديل الأعمال يُحفظ فورًا.</span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button type="button" onClick={() => setLang("ar")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "ar" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}>عربي</button>
          <button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}>English</button>
        </div>
      </div>

      {/* هيرو الصفحة */}
      <section className="rounded-3xl border border-border gradient-soft p-8 text-center sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
          <EditableText value={page[`badge_${lang}`] || ""} onSave={(v) => setP(`badge_${lang}`, v)} placeholder="الشارة" />
        </div>
        <EditableText as="h1" value={page[`title_${lang}`] || ""} onSave={(v) => setP(`title_${lang}`, v)} placeholder="عنوان الصفحة" className="mt-5 block text-3xl font-extrabold sm:text-4xl" />
        <EditableText as="p" multiline value={page[`intro_${lang}`] || ""} onSave={(v) => setP(`intro_${lang}`, v)} placeholder="مقدمة الصفحة" className="mx-auto mt-4 block max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg" />
        <p className="mt-3 text-xs text-amber-600">⚠️ عناوين الصفحة تُحفظ بزر "حفظ كل التغييرات" أسفل الصفحة (مش فوري).</p>
      </section>

      {/* الأعمال */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <EditableText as="h2" value={page[`rest_${lang}`] || ""} onSave={(v) => setP(`rest_${lang}`, v)} placeholder="عنوان قسم الأعمال" className="block text-2xl font-bold" />
          <span className="text-sm text-muted-foreground">{items.length} عمل</span>
        </div>
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any) => (
            <article
              key={item.id}
              className={`group/item relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card ${item.is_published ? "" : "opacity-50"}`}
            >
              {/* أدوات */}
              <div className="absolute right-2 top-2 z-10 flex gap-0.5 rounded-lg bg-background/85 p-0.5 backdrop-blur">
                <button type="button" onClick={() => reorder(item.id, -1)} title="لأعلى" className="rounded p-1 text-muted-foreground hover:bg-accent"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => reorder(item.id, 1)} title="لأسفل" className="rounded p-1 text-muted-foreground hover:bg-accent"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" onClick={() => saveField(item.id, "is_featured", !item.is_featured)} title="مميّز" className={`rounded p-1 hover:bg-accent ${item.is_featured ? "text-brand" : "text-muted-foreground"}`}><Star className="h-4 w-4" fill={item.is_featured ? "currentColor" : "none"} /></button>
                <button type="button" onClick={() => saveField(item.id, "is_active", !item.is_published)} title={item.is_published ? "إخفاء" : "إظهار"} className="rounded p-1 text-muted-foreground hover:bg-accent">{item.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                <button type="button" onClick={() => deleteProject(item.id)} title="حذف" className="rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>

              <ImageUpload value={item.cover_image_url || ""} onChange={(v) => saveField(item.id, "cover_image_url", v)} folder="portfolio" />

              <div className="flex flex-1 flex-col p-5">
                <select
                  value={item.category || "medical_websites"}
                  onChange={(e) => saveField(item.id, "category", e.target.value)}
                  className="mb-2 w-fit rounded-full border border-brand/25 bg-brand/5 px-2.5 py-1 text-[11px] font-medium text-brand"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.key} value={cat.key}>{lang === "en" ? cat.en : cat.ar}</option>
                  ))}
                </select>
                <EditableText
                  as="h3"
                  value={(lang === "ar" ? item.title_ar : item.title_en) || ""}
                  onSave={(v) => saveField(item.id, lang === "ar" ? "title" : "title_en", v)}
                  placeholder="عنوان العمل"
                  className="block text-lg font-bold"
                />
                <EditableText
                  as="p"
                  multiline
                  value={(lang === "ar" ? item.description_ar : item.description_en) || ""}
                  onSave={(v) => saveField(item.id, lang === "ar" ? "short_description" : "short_description_en", v)}
                  placeholder="وصف العمل"
                  className="mt-2 block text-sm leading-relaxed text-muted-foreground"
                />
                <div className="mt-3 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <EditableText
                      value={item.website_url || ""}
                      onSave={(v) => saveField(item.id, "project_url", v)}
                      placeholder="رابط العمل (https://...)"
                      className="block truncate text-xs text-brand"
                    />
                  </div>
                  {item.website_url ? (
                    <button onClick={() => openExternal(item.website_url)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand/20" title="فتح الرابط">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

          {/* إضافة عمل */}
          <button type="button" onClick={addProject} className="flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 text-brand transition-colors hover:bg-brand/5">
            <Plus className="h-8 w-8" />
            <span className="text-sm font-semibold">إضافة عمل</span>
          </button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">⭐ = يظهر في قسم "المميّزة" · 👁️ = إظهار/إخفاء · ↕️ = الترتيب</p>
      </section>

      {/* دعوة الإجراء (CTA) */}
      <section className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
        <EditableText as="h2" value={page[`cta_title_${lang}`] || ""} onSave={(v) => setP(`cta_title_${lang}`, v)} placeholder="عنوان دعوة الإجراء" className="mx-auto block max-w-3xl text-2xl font-bold sm:text-3xl" />
        <EditableText as="p" multiline value={page[`cta_text_${lang}`] || ""} onSave={(v) => setP(`cta_text_${lang}`, v)} placeholder="نص دعوة الإجراء" className="mx-auto mt-3 block max-w-2xl opacity-90" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center rounded-md bg-white px-8 py-2.5 text-sm font-medium text-brand shadow"><EditableText value={page[`cta_primary_${lang}`] || ""} onSave={(v) => setP(`cta_primary_${lang}`, v)} placeholder="الزر الأساسي" /></span>
          <span className="inline-flex items-center rounded-md border border-white/40 px-8 py-2.5 text-sm font-medium text-brand-foreground"><EditableText value={page[`cta_secondary_${lang}`] || ""} onSave={(v) => setP(`cta_secondary_${lang}`, v)} placeholder="الزر الثانوي" /></span>
        </div>
      </section>
    </div>
  );
}
