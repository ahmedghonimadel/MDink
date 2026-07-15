import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { EditableText } from "@/components/Editable";
import { ImageUpload } from "@/components/ImageUpload";
import { pickIcon, splitLines, joinLines } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

const ICON_OPTIONS = [
  "Globe", "TrendingUp", "Megaphone", "Sparkles", "ShieldCheck", "LayoutDashboard",
  "Camera", "Users", "Video", "Palette", "Stethoscope", "MessageCircle", "BarChart3",
  "LifeBuoy", "FileText",
];

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

  // ترتيب: تبديل display_order مع الكرت المجاور
  async function reorder(id: string, dir: -1 | 1) {
    const sorted = [...services].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const idx = sorted.findIndex((s) => s.id === id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    const cur = sorted[idx];
    await db.from("services").update({ display_order: swap.sort_order ?? 0 }).eq("id", cur.id);
    await db.from("services").update({ display_order: cur.sort_order ?? 0 }).eq("id", swap.id);
    refresh();
  }

  // القيم الافتراضية لأقسام محتوى الصفحة (نفس /services) لعرضها لو الداتابيز فاضية
  const D: Record<string, { ar: any; en: any }> = {
    audience_title: { ar: "نخدم", en: "We serve" },
    audience_items: {
      ar: ["أطباء مستقلين", "عيادات خاصة", "مراكز طبية", "مجمعات عيادات", "مستشفيات", "عيادات نسائية", "مراكز تجميل", "مراكز أسنان", "عيادات جلدية", "مراكز علاج طبيعي"],
      en: ["Independent doctors", "Private clinics", "Medical centers", "Polyclinics", "Hospitals", "Women's clinics", "Aesthetic centers", "Dental centers", "Dermatology clinics", "Physiotherapy centers"],
    },
    content_title: { ar: "محتوى حقيقي من داخل عيادتك", en: "Real content from inside your clinic" },
    content_text: {
      ar: "لا نعتمد على تصميمات عامة فقط. فريق MDink Solutions يساعدك في إنتاج محتوى حقيقي من داخل العيادة أو المركز: تصوير الطبيب، فريق العمل، الأجهزة، المكان، وتجربة الخدمة — ليظهر حضورك الرقمي بشكل أكثر ثقة واحتراف.",
      en: "We don't rely on generic designs alone. The MDink Solutions team helps you produce real content from inside the clinic or center: the doctor, the team, the equipment, the space, and the service experience — so your digital presence looks more trustworthy and professional.",
    },
    content_items: {
      ar: ["تصوير فوتوغرافي احترافي", "فيديوهات قصيرة وريلز", "جرافيك طبي متناسق", "محتوى مناسب للإعلانات والسوشيال"],
      en: ["Professional photography", "Short videos & reels", "Consistent medical graphics", "Content ready for ads & social"],
    },
    steps: {
      ar: ["نفهم تخصصك وجمهورك", "نجهز الخطة والمحتوى", "نصمم ونصور ونبني", "نطلق ونقيس النتائج", "نطور باستمرار"],
      en: ["We understand your specialty and audience", "We prepare the plan and content", "We design, shoot, and build", "We launch and measure results", "We keep improving"],
    },
    cta_title: { ar: "جاهز تبني حضور طبي يليق بثقة مرضاك؟", en: "Ready to build a medical presence worthy of your patients' trust?" },
    cta_text: {
      ar: "سواء كنت طبيبًا مستقلًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — نساعدك في بناء منظومة رقمية واضحة، موثوقة، وقابلة للنمو.",
      en: "Whether you are an independent doctor, a clinic, a medical center, a polyclinic, or a hospital — we help you build a clear, trustworthy, and scalable digital system.",
    },
    cta_primary: { ar: "احجز استشارة مجانية", en: "Book a free consultation" },
    cta_secondary: { ar: "شاهد أعمالنا", en: "View our work" },
  };
  const getText = (base: string) => page[`${base}_${lang}`] ?? D[base][lang];
  const getArr = (base: string): string[] => {
    const v = page[`${base}_items_${lang}`] ?? page[`${base}_${lang}`];
    return Array.isArray(v) ? v : (D[`${base}_items`]?.[lang] ?? D[base]?.[lang]);
  };
  const setArrField = (key: string, arr: any[]) => setPage((p) => ({ ...p, [key]: arr }));
  const updArr = (key: string, cur: string[], i: number, val: string) => {
    const a = [...cur];
    a[i] = val;
    setArrField(key, a);
  };

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

      {/* نخدم (Audience) — نفس ترتيب صفحة /services: تحت الهيرو مباشرةً فوق الخدمات */}
      <section className="rounded-3xl border border-border gradient-soft p-8">
        <EditableText
          value={getText("audience_title")}
          onSave={(v) => setP(`audience_title_${lang}`, v)}
          placeholder="عنوان (نخدم)"
          className="block text-sm font-semibold text-brand"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {getArr("audience").map((item: string, i: number) => {
            const arr = getArr("audience");
            return (
              <span
                key={i}
                className="group/item relative rounded-full border border-brand/25 bg-brand/5 px-3.5 py-1.5 text-xs font-medium"
              >
                <EditableText value={item} onSave={(v) => updArr(`audience_items_${lang}`, arr, i, v)} placeholder="فئة" />
                <button
                  type="button"
                  onClick={() => setArrField(`audience_items_${lang}`, arr.filter((_: any, j: number) => j !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white opacity-0 group-hover/item:opacity-100"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={() => setArrField(`audience_items_${lang}`, [...getArr("audience"), ""])}
            className="rounded-full border border-dashed border-brand/40 px-3 py-1 text-xs text-brand hover:bg-brand/5"
          >
            + إضافة
          </button>
        </div>
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
                {/* صورة الخدمة (اختياري) */}
                <div className="border-b border-border p-3">
                  <ImageUpload
                    label="صورة الخدمة (اختياري)"
                    value={s.image_url || ""}
                    onChange={(v) => saveField(s.id, "image_url", v)}
                    folder="services"
                  />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => reorder(s.id, -1)}
                        title="تحريك لأعلى"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => reorder(s.id, 1)}
                        title="تحريك لأسفل"
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
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
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>الأيقونة:</span>
                    <select
                      value={s.icon || "Globe"}
                      onChange={(e) => saveField(s.id, "icon", e.target.value)}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    >
                      {ICON_OPTIONS.map((ic) => (
                        <option key={ic} value={ic}>
                          {ic}
                        </option>
                      ))}
                    </select>
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

      {/* محتوى حقيقي (Content) */}
      <section className="rounded-2xl border-y border-border bg-card p-8 text-center">
        <EditableText
          as="h2"
          value={getText("content_title")}
          onSave={(v) => setP(`content_title_${lang}`, v)}
          placeholder="عنوان القسم"
          className="block text-2xl font-bold sm:text-3xl"
        />
        <EditableText
          as="p"
          multiline
          value={getText("content_text")}
          onSave={(v) => setP(`content_text_${lang}`, v)}
          placeholder="نص القسم"
          className="mx-auto mt-4 block max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base"
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {getArr("content").map((label: string, i: number) => {
            const arr = getArr("content");
            return (
              <div key={i} className="group/item relative rounded-2xl border border-border bg-background p-6 text-center shadow-card">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <EditableText
                  value={label}
                  onSave={(v) => updArr(`content_items_${lang}`, arr, i, v)}
                  placeholder="ميزة"
                  className="mt-4 block text-sm font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setArrField(`content_items_${lang}`, arr.filter((_: any, j: number) => j !== i))}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover/item:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setArrField(`content_items_${lang}`, [...getArr("content"), ""])}
            className="flex min-h-[120px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 text-sm text-brand hover:bg-brand/5"
          >
            <Plus className="h-5 w-5" /> إضافة
          </button>
        </div>
      </section>

      {/* كيف نبدأ؟ (Steps) */}
      <section>
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          {lang === "en" ? "How do we start?" : "كيف نبدأ؟"}
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {getArr("steps").map((step: string, i: number) => {
            const arr = getArr("steps");
            return (
              <div key={i} className="group/item relative rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-hero text-base font-bold text-brand-foreground">
                  {i + 1}
                </div>
                <EditableText
                  as="p"
                  multiline
                  value={step}
                  onSave={(v) => updArr(`steps_${lang}`, arr, i, v)}
                  placeholder="خطوة"
                  className="mt-4 block text-sm font-medium leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => setArrField(`steps_${lang}`, arr.filter((_: any, j: number) => j !== i))}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 group-hover/item:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => setArrField(`steps_${lang}`, [...getArr("steps"), ""])}
            className="flex min-h-[120px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 text-sm text-brand hover:bg-brand/5"
          >
            <Plus className="h-5 w-5" /> خطوة
          </button>
        </div>
      </section>

      {/* دعوة الإجراء (CTA) */}
      <section className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
        <EditableText
          as="h2"
          value={getText("cta_title")}
          onSave={(v) => setP(`cta_title_${lang}`, v)}
          placeholder="عنوان دعوة الإجراء"
          className="block text-2xl font-bold sm:text-4xl"
        />
        <EditableText
          as="p"
          multiline
          value={getText("cta_text")}
          onSave={(v) => setP(`cta_text_${lang}`, v)}
          placeholder="نص دعوة الإجراء"
          className="mx-auto mt-3 block max-w-2xl opacity-90"
        />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center rounded-md bg-white px-8 py-2.5 text-sm font-medium text-brand shadow">
            <EditableText value={getText("cta_primary")} onSave={(v) => setP(`cta_primary_${lang}`, v)} placeholder="الزر الأساسي" />
          </span>
          <span className="inline-flex items-center rounded-md border border-white/40 px-8 py-2.5 text-sm font-medium text-brand-foreground">
            <EditableText value={getText("cta_secondary")} onSave={(v) => setP(`cta_secondary_${lang}`, v)} placeholder="الزر الثانوي" />
          </span>
        </div>
      </section>
    </div>
  );
}
