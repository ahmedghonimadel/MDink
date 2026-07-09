import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, CheckCircle2, Plus, Trash2, Eye, EyeOff, Star } from "lucide-react";
import { EditableText } from "@/components/Editable";
import { ImageUpload } from "@/components/ImageUpload";
import { supabase } from "@/integrations/supabase/client";

/**
 * الصفحة الحية لإدارة "من نحن" — بنفس تصميم /about بالكامل.
 * كل النصوص تُعدّل في مكانها (تُحفظ بزر "حفظ كل التغييرات" أسفل الصفحة)،
 * وأعضاء الفريق واللحظات تُدار مباشرة (إضافة/حذف/صورة تُحفظ فورًا).
 */
export function AboutLivePreview({
  content,
  set,
  setContent,
  team,
}: {
  content: Record<string, any>;
  set: (k: string, v: string) => void;
  setContent: (fn: (c: Record<string, any>) => Record<string, any>) => void;
  team: any[];
}) {
  const db = supabase as any;
  const qc = useQueryClient();
  const [lang, setLang] = useState<"ar" | "en">("ar");

  // ——— قيم افتراضية للأقسام الثابتة (نفس /about) ———
  const D_DIFF = {
    ar: [
      { t: "نفهم خصوصية القطاع الطبي", d: "خبرة متخصصة في تسويق ومواقع القطاع الطبي." },
      { t: "نهتم بالتفاصيل الصغيرة قبل الكبيرة", d: "الجودة في التفاصيل هي ما يبني الثقة." },
      { t: "نؤمن بالعلاقة قبل الخدمة", d: "نبني شراكة طويلة، لا صفقة عابرة." },
      { t: "نتابع بصدق ووضوح", d: "تواصل واضح ومتابعة مستمرة في كل مرحلة." },
      { t: "نجمع بين الاحتراف والراحة", d: "احترافية عالية بتعامل مريح وإنساني." },
      { t: "نعمل كأن نجاحك جزء من نجاحنا", d: "نجاحك هو مقياسنا الحقيقي." },
    ],
    en: [
      { t: "We Understand the Medical Sector", d: "Specialized experience in medical marketing and websites." },
      { t: "We Care About the Small Details", d: "Quality in the details is what builds trust." },
      { t: "We Believe in Relationships Before Services", d: "We build a lasting partnership, not a one-off deal." },
      { t: "We Follow Up with Clarity and Sincerity", d: "Clear communication and continuous follow-up at every stage." },
      { t: "We Combine Professionalism with Comfort", d: "High professionalism with a comfortable, human approach." },
      { t: "We Treat Your Success as Part of Our Own", d: "Your success is our real measure." },
    ],
  };
  const D_PROC = {
    ar: ["نفهم احتياجك", "نخطط بوضوح", "ننفذ بعناية", "نتابع باستمرار", "نطور بناءً على النتائج"],
    en: ["We Understand Your Needs", "We Plan Clearly", "We Execute with Care", "We Follow Up Consistently", "We Improve Based on Results"],
  };

  const diffs = Array.isArray(content[`differentiators_${lang}`]) ? content[`differentiators_${lang}`] : D_DIFF[lang];
  const procs = Array.isArray(content[`process_${lang}`]) ? content[`process_${lang}`] : D_PROC[lang];
  const gallery = Array.isArray(content.gallery) ? content.gallery : [];

  const setArr = (key: string, arr: any[]) => setContent((c) => ({ ...c, [key]: arr }));
  const updDiff = (i: number, field: "t" | "d", v: string) => {
    const a = diffs.map((x: any) => ({ ...x }));
    a[i][field] = v;
    setArr(`differentiators_${lang}`, a);
  };

  // ——— الفريق (حفظ فوري في team_members) ———
  const refreshTeam = () => {
    qc.invalidateQueries({ queryKey: ["admin-about-team"] });
    qc.invalidateQueries({ queryKey: ["public-team-v3"] });
  };
  async function saveMemberField(id: string, column: string, value: any) {
    const { error } = await db.from("team_members").update({ [column]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    refreshTeam();
    toast.success("تم الحفظ ✓");
  }
  async function addMember() {
    const maxOrder = team.reduce((m, t) => Math.max(m, t.sort_order ?? 0), 0);
    const { error } = await db.from("team_members").insert({
      name_ar: "عضو جديد",
      role_ar: "الدور",
      is_visible: true,
      is_founder: false,
      sort_order: maxOrder + 1,
    });
    if (error) return toast.error(error.message);
    refreshTeam();
    toast.success("تمت إضافة عضو");
  }
  async function deleteMember(id: string) {
    if (!confirm("حذف العضو نهائيًا؟")) return;
    const { error } = await db.from("team_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refreshTeam();
    toast.success("تم الحذف");
  }
  async function toggleMember(id: string, isVisible: boolean) {
    const { error } = await db.from("team_members").update({ is_visible: !isVisible }).eq("id", id);
    if (error) return toast.error(error.message);
    refreshTeam();
  }

  // ——— اللحظات (content.gallery) ———
  const updGallery = (i: number, field: string, v: string) => {
    const a = gallery.map((x: any) => ({ ...x }));
    a[i][field] = v;
    setArr("gallery", a);
  };

  // زر حذف صغير
  const Del = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-white opacity-0 shadow transition group-hover/item:opacity-100"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  );

  return (
    <div className="space-y-8">
      {/* شريط أدوات */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-sm text-muted-foreground backdrop-blur">
        <span>👇 صفحة حية بنفس شكل /about — اضغطي القلم لتعديل أي نص.</span>
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <button type="button" onClick={() => setLang("ar")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "ar" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}>عربي</button>
          <button type="button" onClick={() => setLang("en")} className={`rounded-full px-3 py-1 text-xs font-semibold transition ${lang === "en" ? "gradient-hero text-brand-foreground" : "text-muted-foreground"}`}>English</button>
        </div>
      </div>

      {/* الهيرو */}
      <section className="rounded-3xl border border-border gradient-soft p-8 text-center sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
          <Heart className="h-3.5 w-3.5" />
          <EditableText value={content[`hero_badge_${lang}`] || ""} onSave={(v) => set(`hero_badge_${lang}`, v)} placeholder="الشارة" />
        </div>
        <EditableText as="h1" value={content[`hero_title_${lang}`] || ""} onSave={(v) => set(`hero_title_${lang}`, v)} placeholder="من نحن" className="mt-5 block text-4xl font-extrabold sm:text-5xl" />
        <EditableText as="p" multiline value={content[`hero_subtitle_${lang}`] || ""} onSave={(v) => set(`hero_subtitle_${lang}`, v)} placeholder="النص الفرعي" className="mx-auto mt-6 block max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg" />
      </section>

      {/* حكايتنا */}
      <section className="mx-auto max-w-4xl text-center">
        <EditableText as="h2" value={content[`story_title_${lang}`] || ""} onSave={(v) => set(`story_title_${lang}`, v)} placeholder="حكايتنا" className="block text-2xl font-bold sm:text-3xl" />
        <EditableText as="p" multiline value={content[`story_body_${lang}`] || ""} onSave={(v) => set(`story_body_${lang}`, v)} placeholder="نص الحكاية" className="mx-auto mt-4 block max-w-3xl text-base leading-loose text-muted-foreground" />
      </section>

      {/* ما الذي يميزنا */}
      <section className="rounded-2xl border-y border-border bg-card p-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{lang === "en" ? "What Makes Us Different?" : "ما الذي يميزنا؟"}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {diffs.map((d: any, i: number) => (
            <div key={i} className="group/item relative rounded-2xl border border-border bg-background p-6 shadow-card">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand"><CheckCircle2 className="h-6 w-6" /></div>
              <EditableText as="h3" value={d.t || ""} onSave={(v) => updDiff(i, "t", v)} placeholder="العنوان" className="mt-4 block text-base font-bold" />
              <EditableText as="p" multiline value={d.d || ""} onSave={(v) => updDiff(i, "d", v)} placeholder="الوصف" className="mt-2 block text-sm leading-relaxed text-muted-foreground" />
              <Del onClick={() => setArr(`differentiators_${lang}`, diffs.filter((_: any, j: number) => j !== i))} />
            </div>
          ))}
          <button type="button" onClick={() => setArr(`differentiators_${lang}`, [...diffs, { t: "", d: "" }])} className="flex min-h-[140px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 text-sm text-brand hover:bg-brand/5"><Plus className="h-5 w-5" /> إضافة ميزة</button>
        </div>
      </section>

      {/* رؤية / رسالة / قيم */}
      <section className="grid gap-6 md:grid-cols-3">
        {(["vision", "mission", "values"] as const).map((k) => (
          <div key={k} className="rounded-2xl border border-border bg-card p-8 text-center">
            <h3 className="text-xl font-bold text-brand">{k === "vision" ? (lang === "en" ? "Vision" : "رؤيتنا") : k === "mission" ? (lang === "en" ? "Mission" : "رسالتنا") : lang === "en" ? "Values" : "قيمنا"}</h3>
            <EditableText as="p" multiline value={content[`${k}_${lang}`] || ""} onSave={(v) => set(`${k}_${lang}`, v)} placeholder={k} className="mt-3 block text-sm leading-relaxed text-muted-foreground" />
          </div>
        ))}
      </section>

      {/* الفريق */}
      <section className="rounded-2xl border-y border-border bg-card p-8">
        <div className="text-center">
          <EditableText as="h2" value={content[`team_title_${lang}`] || ""} onSave={(v) => set(`team_title_${lang}`, v)} placeholder="عنوان الفريق" className="block text-2xl font-bold sm:text-3xl" />
          <EditableText as="p" multiline value={content[`team_text_${lang}`] || ""} onSave={(v) => set(`team_text_${lang}`, v)} placeholder="وصف قسم الفريق" className="mx-auto mt-2 block max-w-2xl text-muted-foreground" />
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((m: any) => (
            <div key={m.id} className={`group/item relative rounded-2xl border border-border bg-background p-6 text-center shadow-card ${m.is_visible ? "" : "opacity-50"}`}>
              <div className="absolute left-3 top-3 flex gap-1">
                <button type="button" onClick={() => toggleMember(m.id, m.is_visible)} title={m.is_visible ? "إخفاء" : "إظهار"} className="rounded-lg p-1 text-muted-foreground hover:bg-accent">{m.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>
                <button type="button" onClick={() => saveMemberField(m.id, "is_founder", !m.is_founder)} title="مؤسِّس" className={`rounded-lg p-1 hover:bg-accent ${m.is_founder ? "text-brand" : "text-muted-foreground"}`}><Star className="h-4 w-4" fill={m.is_founder ? "currentColor" : "none"} /></button>
                <button type="button" onClick={() => deleteMember(m.id)} title="حذف" className="rounded-lg p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mx-auto w-32">
                <ImageUpload value={m.image_url || ""} onChange={(v) => saveMemberField(m.id, "image_url", v)} folder="team" />
              </div>
              <EditableText as="h3" value={(lang === "ar" ? m.name_ar : m.name_en) || ""} onSave={(v) => saveMemberField(m.id, lang === "ar" ? "name_ar" : "name_en", v)} placeholder="الاسم" className="mt-3 block text-lg font-bold" />
              <EditableText value={(lang === "ar" ? m.role_ar : m.role_en) || ""} onSave={(v) => saveMemberField(m.id, lang === "ar" ? "role_ar" : "role_en", v)} placeholder="الدور" className="mt-1 block text-sm text-brand" />
              <EditableText as="p" multiline value={(lang === "ar" ? m.bio_ar : m.bio_en) || ""} onSave={(v) => saveMemberField(m.id, lang === "ar" ? "bio_ar" : "bio_en", v)} placeholder="نبذة" className="mt-2 block text-sm leading-relaxed text-muted-foreground" />
            </div>
          ))}
          <button type="button" onClick={addMember} className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 text-brand hover:bg-brand/5"><Plus className="h-8 w-8" /><span className="text-sm font-semibold">إضافة عضو</span></button>
        </div>
      </section>

      {/* لحظات فريق MDink */}
      <section className="mx-auto max-w-7xl">
        <div className="text-center">
          <EditableText as="h2" value={content[`life_title_${lang}`] || ""} onSave={(v) => set(`life_title_${lang}`, v)} placeholder="عنوان اللحظات" className="block text-2xl font-bold sm:text-3xl" />
          <EditableText as="p" multiline value={content[`life_text_${lang}`] || ""} onSave={(v) => set(`life_text_${lang}`, v)} placeholder="نص اللحظات" className="mx-auto mt-2 block max-w-2xl text-muted-foreground" />
        </div>
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((g: any, i: number) => (
            <div key={i} className="group/item relative rounded-2xl border border-border bg-card p-2">
              <ImageUpload value={g.image_url || ""} onChange={(v) => updGallery(i, "image_url", v)} folder="about" />
              <EditableText value={(lang === "ar" ? g.caption_ar : g.caption_en) || ""} onSave={(v) => updGallery(i, lang === "ar" ? "caption_ar" : "caption_en", v)} placeholder="تعليق (اختياري)" className="mt-1 block text-center text-xs text-muted-foreground" />
              <Del onClick={() => setArr("gallery", gallery.filter((_: any, j: number) => j !== i))} />
            </div>
          ))}
          <button type="button" onClick={() => setArr("gallery", [...gallery, { image_url: "", caption_ar: "", caption_en: "" }])} className="flex min-h-[140px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 text-sm text-brand hover:bg-brand/5"><Plus className="h-5 w-5" /> لحظة</button>
        </div>
      </section>

      {/* كيف نعمل معك */}
      <section className="rounded-2xl border-y border-border bg-card p-8">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">{lang === "en" ? "How We Work With You" : "كيف نعمل معك؟"}</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {procs.map((step: string, i: number) => (
            <div key={i} className="group/item relative rounded-2xl border border-border bg-background p-6 shadow-card">
              <div className="flex h-10 w-10 items-center justify-center rounded-full gradient-hero text-base font-bold text-brand-foreground">{i + 1}</div>
              <EditableText as="p" multiline value={step} onSave={(v) => setArr(`process_${lang}`, procs.map((x: string, j: number) => (j === i ? v : x)))} placeholder="خطوة" className="mt-4 block text-sm font-semibold leading-relaxed" />
              <Del onClick={() => setArr(`process_${lang}`, procs.filter((_: any, j: number) => j !== i))} />
            </div>
          ))}
          <button type="button" onClick={() => setArr(`process_${lang}`, [...procs, ""])} className="flex min-h-[120px] items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand/40 text-sm text-brand hover:bg-brand/5"><Plus className="h-5 w-5" /> خطوة</button>
        </div>
      </section>

      {/* العلاقة قبل الخدمة */}
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-brand/20 bg-brand/5 p-10 text-center">
        <Heart className="mx-auto h-10 w-10 text-brand" />
        <EditableText as="h2" value={content[`relationship_title_${lang}`] || ""} onSave={(v) => set(`relationship_title_${lang}`, v)} placeholder="عنوان العلاقة" className="mt-4 block text-2xl font-extrabold sm:text-3xl" />
        <EditableText as="p" multiline value={content[`relationship_text_${lang}`] || ""} onSave={(v) => set(`relationship_text_${lang}`, v)} placeholder="نص العلاقة" className="mx-auto mt-4 block max-w-2xl text-base leading-relaxed text-muted-foreground" />
      </section>

      {/* CTA */}
      <section className="overflow-hidden rounded-3xl gradient-hero p-10 text-center text-brand-foreground shadow-brand sm:p-16">
        <EditableText as="h2" value={content[`cta_title_${lang}`] || ""} onSave={(v) => set(`cta_title_${lang}`, v)} placeholder="عنوان دعوة الإجراء" className="mx-auto block max-w-3xl text-2xl font-bold sm:text-3xl" />
        <EditableText as="p" multiline value={content[`cta_subtitle_${lang}`] || ""} onSave={(v) => set(`cta_subtitle_${lang}`, v)} placeholder="نص دعوة الإجراء" className="mx-auto mt-3 block max-w-2xl opacity-90" />
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="inline-flex items-center rounded-md bg-white px-8 py-2.5 text-sm font-medium text-brand shadow"><EditableText value={content[`cta_primary_${lang}`] || ""} onSave={(v) => set(`cta_primary_${lang}`, v)} placeholder="الزر الأساسي" /></span>
          <span className="inline-flex items-center rounded-md border border-white/40 px-8 py-2.5 text-sm font-medium text-brand-foreground"><EditableText value={content[`cta_secondary_${lang}`] || ""} onSave={(v) => set(`cta_secondary_${lang}`, v)} placeholder="الزر الثانوي" /></span>
        </div>
      </section>
    </div>
  );
}
