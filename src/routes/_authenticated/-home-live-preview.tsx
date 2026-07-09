import { useState } from "react";
import { EditableText, EditableImage } from "@/components/Editable";
import { VideoUpload } from "@/components/VideoUpload";
import { ImageUpload } from "@/components/ImageUpload";
import { pickIcon } from "@/lib/cms";
import { Sparkles, CheckCircle2, Stethoscope, Plus, X } from "lucide-react";

/**
 * الصفحة الحية لإدارة الصفحة الرئيسية — كل الأقسام في صفحة واحدة بنفس تصميم
 * الموقع العام (index.tsx)، مع تعديل مباشر (نص/صورة/فيديو) وإضافة/حذف للعناصر،
 * ومفتاح عربي/إنجليزي لتعديل اللغتين في نفس المكان.
 */
export function HomeLivePreview({
  c,
  set,
  arr,
  setArr,
}: {
  c: Record<string, any>;
  set: (k: string, v: any) => void;
  arr: (k: string) => any[];
  setArr: (k: string, items: any[]) => void;
}) {
  const [lang, setLang] = useState<"ar" | "en">("ar");
  const L = (base: string) => `${base}_${lang}`;

  const stats = arr("stats_json");
  const services = arr("services_json");
  const advantages = arr("advantages_json");
  const systemItems = arr("system_items_json");
  const dashboardCard = arr("dashboard_card_json");
  const trust = arr(L("trust"));

  const upd = (key: string, i: number, field: string, value: string) => {
    const items = [...arr(key)];
    items[i] = { ...items[i], [field]: value };
    setArr(key, items);
  };
  const addItem = (key: string, blank: any) => setArr(key, [...arr(key), blank]);
  const removeItem = (key: string, i: number) =>
    setArr(
      key,
      arr(key).filter((_: any, j: number) => j !== i),
    );
  const setStr = (key: string, i: number, v: string) => {
    const n = [...arr(key)];
    n[i] = v;
    setArr(key, n);
  };

  // زر حذف صغير أعلى كل عنصر
  const DelBtn = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow transition group-hover/item:opacity-100"
      aria-label="حذف"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-8">
      {/* شريط أدوات */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-sm text-muted-foreground backdrop-blur">
        <span>👇 صفحة حية بنفس شكل الموقع — اضغطي القلم لتعديل أي نص/صورة في مكانه.</span>
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

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-border gradient-soft p-8 sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div dir={lang === "en" ? "ltr" : "rtl"}>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <EditableText value={c[L("badge")] || ""} onSave={(v) => set(L("badge"), v)} placeholder="الشارة" />
            </div>
            <h1
              className="mt-6 max-w-[760px] font-bold tracking-tight text-brand"
              style={{ fontSize: "clamp(1.9rem, 4.2vw, 3.5rem)", lineHeight: 1.3 }}
            >
              <EditableText
                multiline
                value={c[L("hero_title")] || ""}
                onSave={(v) => set(L("hero_title"), v)}
                placeholder="العنوان الرئيسي"
                className="block"
              />
            </h1>
            <div className="mt-6 max-w-xl text-base leading-loose text-muted-foreground sm:text-lg">
              <EditableText
                multiline
                value={c[L("hero_subtitle")] || ""}
                onSave={(v) => set(L("hero_subtitle"), v)}
                placeholder="النص الفرعي"
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-md gradient-hero px-8 py-2.5 text-sm font-medium text-brand-foreground shadow-brand">
                <EditableText value={c[L("primary_cta")] || ""} onSave={(v) => set(L("primary_cta"), v)} placeholder="الزر الأساسي" />
              </span>
              <span className="inline-flex items-center rounded-md border border-border px-8 py-2.5 text-sm font-medium">
                <EditableText value={c[L("secondary_cta")] || ""} onSave={(v) => set(L("secondary_cta"), v)} placeholder="الزر الثانوي" />
              </span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {trust.map((item: string, i: number) => (
                <div key={i} className="group/item relative flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  <EditableText value={item} onSave={(v) => setStr(L("trust"), i, v)} placeholder="عنصر ثقة" />
                  <DelBtn onClick={() => removeItem(L("trust"), i)} />
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(L("trust"), "")}
                className="flex items-center gap-1 rounded-full border border-dashed border-brand/40 px-3 py-1 text-brand hover:bg-brand/5"
              >
                <Plus className="h-3.5 w-3.5" /> إضافة
              </button>
            </div>
          </div>

          {/* العمود البصري */}
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-3xl gradient-hero opacity-20 blur-2xl" />
            {c.hero_image ? (
              <EditableImage
                value={c.hero_image}
                onSave={(v) => set("hero_image", v)}
                alt="صورة الهيرو"
                className="aspect-[4/5] max-h-[560px] w-full rounded-3xl border border-border object-cover shadow-brand"
              />
            ) : (
              <div className="rounded-3xl border border-border bg-card p-6 shadow-brand">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl gradient-hero text-brand-foreground">
                      {c.preview_card_image ? (
                        <EditableImage value={c.preview_card_image} onSave={(v) => set("preview_card_image", v)} alt="الطبيب" className="h-full w-full object-cover" />
                      ) : (
                        <Stethoscope className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <EditableText as="div" value={c[L("preview_doctor")] || ""} onSave={(v) => set(L("preview_doctor"), v)} placeholder="اسم الطبيب" className="block text-sm font-semibold" />
                      <EditableText as="div" value={c[L("preview_specialty")] || ""} onSave={(v) => set(L("preview_specialty"), v)} placeholder="التخصص" className="block text-[11px] leading-snug text-muted-foreground" />
                    </div>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-medium text-brand">
                    <EditableText value={c[L("published_label")] || ""} onSave={(v) => set(L("published_label"), v)} placeholder="منشور" />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {dashboardCard.map((s: any, i: number) => {
                    const Icon = pickIcon(s.icon);
                    return (
                      <div key={i} className="group/item relative rounded-xl border border-border bg-background p-4">
                        <Icon className="h-4 w-4 text-brand" />
                        <EditableText as="div" value={s.value || ""} onSave={(v) => upd("dashboard_card_json", i, "value", v)} placeholder="الرقم" className="mt-2 block text-xl font-bold" />
                        <EditableText as="div" value={s[L("label")] || ""} onSave={(v) => upd("dashboard_card_json", i, L("label"), v)} placeholder="الوصف" className="block text-xs text-muted-foreground" />
                        <DelBtn onClick={() => removeItem("dashboard_card_json", i)} />
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => addItem("dashboard_card_json", { icon: "Sparkles", value: "", label_ar: "", label_en: "" })} className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-brand/40 p-4 text-xs text-brand hover:bg-brand/5">
                    <Plus className="h-4 w-4" /> إضافة
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* صور الهيرو — رفع / تغيير / حذف */}
      <div className="rounded-2xl border border-dashed border-brand/30 bg-muted/20 p-5">
        <div className="mb-3 text-sm font-semibold">🖼️ صور الهيرو</div>
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageUpload
            label="صورة الهيرو الرئيسية (تظهر بدل كارت الطبيب)"
            value={c.hero_image || ""}
            onChange={(v) => set("hero_image", v)}
            folder="home"
          />
          <ImageUpload
            label="صورة خلفية الهيرو (اختياري)"
            value={c.hero_bg_image || ""}
            onChange={(v) => set("hero_bg_image", v)}
            folder="home"
          />
          <ImageUpload
            label="صورة كارت الطبيب"
            value={c.preview_card_image || ""}
            onChange={(v) => set("preview_card_image", v)}
            folder="home"
          />
        </div>
      </div>

      {/* ===== STATS ===== */}
      <section className="overflow-hidden rounded-2xl border-y border-border bg-card">
        <div className="grid grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
          {stats.map((s: any, i: number) => (
            <div key={i} className="group/item relative text-center">
              <EditableText as="div" value={s.value || ""} onSave={(v) => upd("stats_json", i, "value", v)} placeholder="الرقم" className="block text-3xl font-extrabold text-brand sm:text-4xl" />
              <EditableText as="div" value={s[L("label")] || ""} onSave={(v) => upd("stats_json", i, L("label"), v)} placeholder="الوصف" className="mt-1 block text-sm text-muted-foreground" />
              <DelBtn onClick={() => removeItem("stats_json", i)} />
            </div>
          ))}
          <button type="button" onClick={() => addItem("stats_json", { value: "", label_ar: "", label_en: "" })} className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-brand/40 p-4 text-xs text-brand hover:bg-brand/5">
            <Plus className="h-4 w-4" /> إضافة رقم
          </button>
        </div>
      </section>

      {/* ===== SERVICES ===== */}
      <section className="rounded-2xl border border-border bg-card p-8">
        <div className="mb-10 text-center">
          <EditableText as="h2" value={c[L("services_title")] || ""} onSave={(v) => set(L("services_title"), v)} placeholder="عنوان الخدمات" className="block text-3xl font-bold sm:text-4xl" />
          <EditableText as="p" value={c[L("services_intro")] || ""} onSave={(v) => set(L("services_intro"), v)} placeholder="مقدمة الخدمات" className="mt-3 block text-muted-foreground" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s: any, i: number) => {
            const Icon = pickIcon(s.icon);
            return (
              <div key={i} className="group/item group relative rounded-2xl border border-border bg-background p-6 shadow-card transition-all hover:border-brand/40">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="mt-2 text-[10px] text-muted-foreground">
                  أيقونة: <EditableText value={s.icon || ""} onSave={(v) => upd("services_json", i, "icon", v)} placeholder="Sparkles" />
                </div>
                <EditableText as="h3" value={s[`title_${lang}`] || ""} onSave={(v) => upd("services_json", i, `title_${lang}`, v)} placeholder="عنوان الخدمة" className="mt-2 block text-lg font-semibold" />
                <EditableText as="p" multiline value={s[`desc_${lang}`] || ""} onSave={(v) => upd("services_json", i, `desc_${lang}`, v)} placeholder="وصف الخدمة" className="mt-2 block text-sm text-muted-foreground" />
                <DelBtn onClick={() => removeItem("services_json", i)} />
              </div>
            );
          })}
          <button type="button" onClick={() => addItem("services_json", { icon: "Sparkles", title_ar: "", title_en: "", desc_ar: "", desc_en: "" })} className="flex min-h-[140px] items-center justify-center gap-1 rounded-2xl border border-dashed border-brand/40 p-6 text-sm text-brand hover:bg-brand/5">
            <Plus className="h-5 w-5" /> إضافة خدمة
          </button>
        </div>
      </section>

      {/* ===== WHY MDINK ===== */}
      <section className="rounded-2xl border border-border bg-card p-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <EditableText as="h2" value={c[L("why_title")] || ""} onSave={(v) => set(L("why_title"), v)} placeholder="عنوان لماذا MDink" className="block text-3xl font-bold sm:text-4xl" />
            <EditableText as="p" multiline value={c[L("why_intro")] || ""} onSave={(v) => set(L("why_intro"), v)} placeholder="وصف القسم" className="mt-3 block text-sm text-muted-foreground sm:text-base" />
            <ul className="mt-6 space-y-3">
              {advantages.map((a: any, i: number) => (
                <li key={i} className="group/item relative flex items-start gap-3">
                  <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <EditableText value={a[lang] || ""} onSave={(v) => upd("advantages_json", i, lang, v)} placeholder="ميزة" className="block text-sm" />
                  <DelBtn onClick={() => removeItem("advantages_json", i)} />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => addItem("advantages_json", { ar: "", en: "" })} className="mt-3 flex items-center gap-1 rounded-full border border-dashed border-brand/40 px-3 py-1 text-xs text-brand hover:bg-brand/5">
              <Plus className="h-3.5 w-3.5" /> إضافة ميزة
            </button>
            <div className="mt-8">
              <span className="inline-flex items-center rounded-md gradient-hero px-8 py-2.5 text-sm font-medium text-brand-foreground shadow-brand">
                <EditableText value={c[L("talk")] || ""} onSave={(v) => set(L("talk"), v)} placeholder="زر التحدث" />
              </span>
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs text-muted-foreground">فيديو القسم (ارفعي أو الصقي رابط):</div>
            <VideoUpload value={c.why_video_url || ""} onChange={(v) => set("why_video_url", v)} folder="home" />
            <div className="mb-2 mt-4 text-xs text-muted-foreground">صورة مصغّرة للفيديو (للروابط):</div>
            <ImageUpload value={c.why_video_poster || ""} onChange={(v) => set("why_video_poster", v)} folder="home" />
          </div>
        </div>
      </section>

      {/* ===== SYSTEM ===== */}
      <section className="rounded-2xl border border-border bg-card p-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand">
          <EditableText value={c[L("system_label")] || ""} onSave={(v) => set(L("system_label"), v)} placeholder="تسمية القسم" />
        </div>
        <EditableText as="h2" value={c[L("system_title")] || ""} onSave={(v) => set(L("system_title"), v)} placeholder="عنوان المنظومة" className="block text-3xl font-bold sm:text-4xl" />
        <EditableText as="p" multiline value={c[L("system_intro")] || ""} onSave={(v) => set(L("system_intro"), v)} placeholder="وصف المنظومة" className="mt-3 block max-w-3xl text-sm text-muted-foreground sm:text-base" />
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs text-muted-foreground">فيديو المنظومة (ارفعي أو الصقي رابط):</div>
            <VideoUpload value={c.system_video_url || ""} onChange={(v) => set("system_video_url", v)} folder="home" />
            <div className="mb-1 mt-4 text-xs text-muted-foreground">عنوان الفيديو (اختياري):</div>
            <EditableText
              value={c.system_video_title || ""}
              onSave={(v) => set("system_video_title", v)}
              placeholder="عنوان الفيديو"
              className="block rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
            />
            <div className="mb-2 mt-4 text-xs text-muted-foreground">صورة مصغّرة لفيديو المنظومة:</div>
            <ImageUpload value={c.system_video_thumbnail || ""} onChange={(v) => set("system_video_thumbnail", v)} folder="home" />
          </div>
          <div>
            <ul className="space-y-3">
              {systemItems.map((item: any, i: number) => (
                <li key={i} className="group/item relative flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
                  <EditableText value={item[lang] || ""} onSave={(v) => upd("system_items_json", i, lang, v)} placeholder="عنصر" className="block text-sm sm:text-base" />
                  <DelBtn onClick={() => removeItem("system_items_json", i)} />
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => addItem("system_items_json", { ar: "", en: "" })} className="mt-3 flex items-center gap-1 rounded-full border border-dashed border-brand/40 px-3 py-1 text-xs text-brand hover:bg-brand/5">
              <Plus className="h-3.5 w-3.5" /> إضافة عنصر
            </button>
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
        <EditableText as="h2" value={c[L("cta_title")] || ""} onSave={(v) => set(L("cta_title"), v)} placeholder="عنوان دعوة الإجراء" className="block text-3xl font-bold sm:text-4xl" />
        <EditableText as="p" multiline value={c[L("cta_text")] || ""} onSave={(v) => set(L("cta_text"), v)} placeholder="نص دعوة الإجراء" className="mx-auto mt-3 block max-w-2xl opacity-90" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center rounded-md bg-white px-8 py-2.5 text-sm font-medium text-brand shadow">
            <EditableText value={c[L("cta_primary")] || ""} onSave={(v) => set(L("cta_primary"), v)} placeholder="الزر الأساسي" />
          </span>
          <span className="inline-flex items-center rounded-md border border-white/40 px-8 py-2.5 text-sm font-medium text-brand-foreground">
            <EditableText value={c[L("cta_secondary")] || ""} onSave={(v) => set(L("cta_secondary"), v)} placeholder="الزر الثانوي" />
          </span>
        </div>
      </section>
    </div>
  );
}
