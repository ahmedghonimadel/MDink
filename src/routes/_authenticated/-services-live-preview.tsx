import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { EditableText } from "@/components/Editable";
import { pickIcon, splitLines, joinLines } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

/**
 * الصفحة الحية لإدارة الخدمات — بنفس تصميم صفحة /services العامة.
 * كل نص يُعدّل في مكانه ويُحفظ فورًا في جدول services بالأعمدة الصحيحة
 * (title / title_en / description / description_en / bullets / icon).
 * مع إضافة/حذف/إظهار الخدمات ومفتاح عربي/إنجليزي.
 */
export function ServicesLivePreview({
  page,
  setPage,
  services,
}: {
  page: Record<string, any>;
  setPage: (fn: (p: Record<string, any>) => Record<string, any>) => void;
  services: any[];
}) {
  const db = supabase as any;
  const qc = useQueryClient();
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const setP = (k: string, v: string) => setPage((p) => ({ ...p, [k]: v }));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-services-v2"] });
    qc.invalidateQueries({ queryKey: ["public-services-v2"] });
  };

  // حفظ فوري لعمود في جدول services (بالاسم الحقيقي للعمود)
  async function saveField(id: string, column: string, value: any) {
    const { error } = await db.from("services").update({ [column]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تم الحفظ ✓");
  }

  async function addService() {
    const maxOrder = services.reduce((m, s) => Math.max(m, s.sort_order ?? 0), 0);
    const { error } = await db.from("services").insert({
      title: "خدمة جديدة",
      icon: "Sparkles",
      display_order: maxOrder + 1,
      is_active: true,
      bullets: [],
    });
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تمت إضافة خدمة");
  }

  async function deleteService(id: string) {
    if (!confirm("حذف الخدمة نهائيًا؟")) return;
    const { error } = await db.from("services").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
    toast.success("تم الحذف");
  }

  async function toggleActive(id: string, isActive: boolean) {
    const { error } = await db.from("services").update({ is_active: !isActive }).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  return (
    <div className="space-y-6">
      {/* شريط أدوات */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-sm text-muted-foreground backdrop-blur">
        <span>👇 صفحة حية بنفس شكل /services — اضغطي القلم لتعديل أي نص (يُحفظ فورًا).</span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setLang("ar")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "ar" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}
          >
            عربي
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}
          >
            English
          </button>
        </div>
      </div>

      {/* هيرو الصفحة */}
      <section className="rounded-3xl border border-border gradient-soft p-8 text-center sm:p-12">
        <EditableText
          as="h1"
          value={page[`title_${lang}`] || ""}
          onSave={(v) => setP(`title_${lang}`, v)}
          placeholder="عنوان الصفحة"
          className="block text-3xl font-bold sm:text-4xl"
        />
        <EditableText
          as="p"
          multiline
          value={page[`intro_${lang}`] || ""}
          onSave={(v) => setP(`intro_${lang}`, v)}
          placeholder="مقدمة الصفحة"
          className="mx-auto mt-3 block max-w-2xl text-muted-foreground"
        />
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ عنوان ومقدمة الصفحة يُحفظوا بزر "حفظ عناوين الصفحة" تحت (مش فوري).
        </p>
      </section>

      {/* شبكة الخدمات — نفس تصميم الموقع */}
      <section>
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s: any) => {
            const Icon = pickIcon(s.icon);
            const checks = Array.isArray(s.checkmarks_ar) ? s.checkmarks_ar : [];
            const titleCol = lang === "ar" ? "title" : "title_en";
            const descCol = lang === "ar" ? "description" : "description_en";
            const titleVal = lang === "ar" ? s.title_ar : s.title_en;
            const descVal = lang === "ar" ? s.description_ar : s.description_en;
            return (
              <article
                key={s.id}
                className={`group/item relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand ${s.is_published ? "" : "opacity-50"}`}
              >
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(s.id, s.is_published)}
                        title={s.is_published ? "إخفاء" : "إظهار"}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                      >
                        {s.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteService(s.id)}
                        title="حذف"
                        className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-muted-foreground">
                    أيقونة: <EditableText value={s.icon || ""} onSave={(v) => saveField(s.id, "icon", v)} placeholder="Globe" />
                  </div>
                  <EditableText
                    as="h2"
                    value={titleVal || ""}
                    onSave={(v) => saveField(s.id, titleCol, v)}
                    placeholder="عنوان الخدمة"
                    className="mt-3 block text-lg font-bold"
                  />
                  <EditableText
                    as="p"
                    multiline
                    value={descVal || ""}
                    onSave={(v) => saveField(s.id, descCol, v)}
                    placeholder="وصف الخدمة"
                    className="mt-2 block text-sm leading-relaxed text-muted-foreground"
                  />
                  <div className="mt-4 border-t border-border pt-4">
                    {checks.map((point: string, pi: number) => (
                      <div key={pi} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" /> {point}
                      </div>
                    ))}
                    <div className="mt-2 text-[10px] text-muted-foreground">النقاط (كل نقطة في سطر):</div>
                    <EditableText
                      as="div"
                      multiline
                      value={joinLines(checks)}
                      onSave={(v) => saveField(s.id, "bullets", splitLines(v))}
                      placeholder="نقطة في كل سطر"
                      className="block whitespace-pre-line text-xs text-brand/70"
                    />
                  </div>
                </div>
              </article>
            );
          })}

          {/* إضافة خدمة */}
          <button
            type="button"
            onClick={addService}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 text-brand transition-colors hover:bg-brand/5"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-semibold">إضافة خدمة</span>
          </button>
        </div>
      </section>
    </div>
  );
}
