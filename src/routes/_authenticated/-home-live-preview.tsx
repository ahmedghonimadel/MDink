import { EditableText, EditableImage } from "@/components/Editable";
import { pickIcon } from "@/lib/cms";
import { Sparkles, CheckCircle2, Stethoscope } from "lucide-react";

/**
 * معاينة حية لإدارة الصفحة الرئيسية.
 * تعرض الصفحة بنفس تصميم الموقع العام (index.tsx) تمامًا، وكل نص/صورة عليه
 * أيقونة قلم للتعديل في مكانه — حتى لا يختلف ما يراه الأدمن عمّا يراه الزائر.
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
  const stats = arr("stats_json");
  const services = arr("services_json");
  const dashboardCard = arr("dashboard_card_json");
  const trust = arr("trust_ar");

  function updateArrItem(key: string, idx: number, field: string, value: string) {
    const items = [...arr(key)];
    items[idx] = { ...items[idx], [field]: value };
    setArr(key, items);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 دي معاينة حية بنفس تصميم الموقع بالظبط. مرّري الماوس على أي نص أو صورة واضغطي القلم
        لتعديله في مكانه. لا تنسي "حفظ كل التغييرات" فوق.
      </div>

      {/* ===== HERO — مطابق للموقع ===== */}
      <section className="relative overflow-hidden rounded-3xl border border-border gradient-soft p-8 sm:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              <EditableText
                value={c.badge_ar || ""}
                onSave={(v) => set("badge_ar", v)}
                placeholder="الشارة"
              />
            </div>
            <h1
              className="mt-6 max-w-[760px] font-bold tracking-tight"
              style={{ fontSize: "clamp(1.9rem, 4.2vw, 3.5rem)", lineHeight: 1.3 }}
            >
              <span className="bg-gradient-to-l from-brand to-primary bg-clip-text text-transparent">
                <EditableText
                  multiline
                  value={c.hero_title_ar || ""}
                  onSave={(v) => set("hero_title_ar", v)}
                  placeholder="العنوان الرئيسي"
                />
              </span>
            </h1>
            <div className="mt-6 max-w-xl text-base leading-loose text-muted-foreground sm:text-lg">
              <EditableText
                multiline
                value={c.hero_subtitle_ar || ""}
                onSave={(v) => set("hero_subtitle_ar", v)}
                placeholder="النص الفرعي"
              />
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <span className="inline-flex items-center rounded-md gradient-hero px-8 py-2.5 text-sm font-medium text-brand-foreground shadow-brand">
                <EditableText
                  value={c.primary_cta_ar || ""}
                  onSave={(v) => set("primary_cta_ar", v)}
                  placeholder="الزر الأساسي"
                />
              </span>
              <span className="inline-flex items-center rounded-md border border-border px-8 py-2.5 text-sm font-medium">
                <EditableText
                  value={c.secondary_cta_ar || ""}
                  onSave={(v) => set("secondary_cta_ar", v)}
                  placeholder="الزر الثانوي"
                />
              </span>
            </div>
            {trust.length ? (
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
                {trust.map((item: string, i: number) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-brand" /> {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {/* العمود البصري — مطابق للموقع */}
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
                        <EditableImage
                          value={c.preview_card_image}
                          onSave={(v) => set("preview_card_image", v)}
                          alt="الطبيب"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Stethoscope className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <EditableText
                        as="div"
                        value={c.preview_doctor_ar || ""}
                        onSave={(v) => set("preview_doctor_ar", v)}
                        placeholder="اسم الطبيب"
                        className="block text-sm font-semibold"
                      />
                      <EditableText
                        as="div"
                        value={c.preview_specialty_ar || ""}
                        onSave={(v) => set("preview_specialty_ar", v)}
                        placeholder="التخصص"
                        className="block text-[11px] leading-snug text-muted-foreground"
                      />
                    </div>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[10px] font-medium text-brand">
                    <EditableText
                      value={c.published_label_ar || ""}
                      onSave={(v) => set("published_label_ar", v)}
                      placeholder="منشور"
                    />
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {dashboardCard.map((s: any, i: number) => {
                    const Icon = pickIcon(s.icon);
                    return (
                      <div key={i} className="rounded-xl border border-border bg-background p-4">
                        <Icon className="h-4 w-4 text-brand" />
                        <EditableText
                          as="div"
                          value={s.value || ""}
                          onSave={(v) => updateArrItem("dashboard_card_json", i, "value", v)}
                          placeholder="الرقم"
                          className="mt-2 block text-xl font-bold"
                        />
                        <EditableText
                          as="div"
                          value={s.label_ar || ""}
                          onSave={(v) => updateArrItem("dashboard_card_json", i, "label_ar", v)}
                          placeholder="الوصف"
                          className="block text-xs text-muted-foreground"
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 block rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 text-xs">
                  <EditableText
                    as="div"
                    value={c.preview_label_ar || ""}
                    onSave={(v) => set("preview_label_ar", v)}
                    placeholder="نص المعاينة"
                    className="block font-medium text-brand"
                  />
                  <EditableText
                    as="div"
                    value={c.preview_url || ""}
                    onSave={(v) => set("preview_url", v)}
                    placeholder="رابط المعاينة"
                    className="mt-1 block text-muted-foreground"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== STATS — شريط مطابق للموقع ===== */}
      {stats.length ? (
        <section className="overflow-hidden rounded-2xl border-y border-border bg-card">
          <div className="grid grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4">
            {stats.map((s: any, i: number) => (
              <div key={i} className="text-center">
                <EditableText
                  as="div"
                  value={s.value || ""}
                  onSave={(v) => updateArrItem("stats_json", i, "value", v)}
                  placeholder="الرقم"
                  className="block text-3xl font-extrabold text-brand sm:text-4xl"
                />
                <EditableText
                  as="div"
                  value={s.label_ar || ""}
                  onSave={(v) => updateArrItem("stats_json", i, "label_ar", v)}
                  placeholder="الوصف"
                  className="mt-1 block text-sm text-muted-foreground"
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== SERVICES — مطابق للموقع ===== */}
      {services.length ? (
        <section className="rounded-2xl border border-border bg-card p-8">
          <div className="mb-12 text-center">
            <EditableText
              as="h2"
              value={c.services_title_ar || ""}
              onSave={(v) => set("services_title_ar", v)}
              placeholder="عنوان الخدمات"
              className="block text-3xl font-bold sm:text-4xl"
            />
            <EditableText
              as="p"
              value={c.services_intro_ar || ""}
              onSave={(v) => set("services_intro_ar", v)}
              placeholder="مقدمة الخدمات"
              className="mt-3 block text-muted-foreground"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s: any, i: number) => {
              const Icon = pickIcon(s.icon);
              return (
                <div
                  key={i}
                  className="group rounded-2xl border border-border bg-background p-6 shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:gradient-hero group-hover:text-brand-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <EditableText
                    as="h3"
                    value={s.title_ar || ""}
                    onSave={(v) => updateArrItem("services_json", i, "title_ar", v)}
                    placeholder="عنوان الخدمة"
                    className="mt-4 block text-lg font-semibold"
                  />
                  <EditableText
                    as="p"
                    multiline
                    value={s.description_ar || s.desc_ar || ""}
                    onSave={(v) => updateArrItem("services_json", i, "description_ar", v)}
                    placeholder="وصف الخدمة"
                    className="mt-2 block text-sm text-muted-foreground"
                  />
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        لإضافة/حذف عناصر (إحصائيات، خدمات، أرقام) أو تعديل أقسام «لماذا MDink» و«المنظومة» استخدمي
        التبويبات فوق. المعاينة الحية للتعديل السريع في المكان بنفس شكل الموقع.
      </div>
    </div>
  );
}
