import { EditableText, EditableImage } from "@/components/Editable";
import { pickIcon } from "@/lib/cms";

/**
 * معاينة حية لإدارة الصفحة الرئيسية.
 * تعرض الصفحة بتصميم قريب مما يراه الزائر، وكل نص/صورة عليه أيقونة قلم للتعديل في مكانه.
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

  function updateArrItem(key: string, idx: number, field: string, value: string) {
    const items = [...arr(key)];
    items[idx] = { ...items[idx], [field]: value };
    setArr(key, items);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 دي معاينة حية للصفحة. مرّري الماوس على أي نص أو صورة، واضغطي على القلم الصغير لتعديله في
        مكانه. لا تنسي "حفظ كل التغييرات" فوق.
      </div>

      {/* ===== HERO ===== */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card p-8">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-brand/30 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand">
              <EditableText
                value={c.badge_ar || ""}
                onSave={(v) => set("badge_ar", v)}
                placeholder="الشارة العربية"
              />
            </div>
            <EditableText
              as="h1"
              multiline
              value={c.hero_title_ar || ""}
              onSave={(v) => set("hero_title_ar", v)}
              placeholder="العنوان الرئيسي"
              className="block text-2xl font-extrabold leading-tight sm:text-3xl"
            />
            <EditableText
              as="p"
              multiline
              value={c.hero_subtitle_ar || ""}
              onSave={(v) => set("hero_subtitle_ar", v)}
              placeholder="النص الفرعي"
              className="mt-4 block text-muted-foreground"
            />
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-xl gradient-hero px-5 py-2.5 text-sm font-semibold text-brand-foreground">
                <EditableText
                  value={c.primary_cta_ar || ""}
                  onSave={(v) => set("primary_cta_ar", v)}
                  placeholder="الزر الأساسي"
                />
              </span>
              <span className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold">
                <EditableText
                  value={c.secondary_cta_ar || ""}
                  onSave={(v) => set("secondary_cta_ar", v)}
                  placeholder="الزر الثانوي"
                />
              </span>
            </div>
          </div>

          {/* بطاقة معاينة الطبيب */}
          <div className="rounded-3xl border border-border bg-background p-6 shadow-brand">
            <div className="mb-4 flex items-center gap-3">
              <EditableImage
                value={c.preview_card_image || ""}
                onSave={(v) => set("preview_card_image", v)}
                alt="الطبيب"
                className="h-12 w-12 rounded-xl object-cover"
              />
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
                  className="block text-xs text-muted-foreground"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {dashboardCard.map((s: any, i: number) => {
                const Icon = pickIcon(s.icon);
                return (
                  <div key={i} className="rounded-xl border border-border bg-card p-4">
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
            <div className="mt-4 rounded-xl border border-dashed border-brand/40 bg-brand/5 p-4 text-xs">
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
        </div>
      </section>

      {/* ===== STATS ===== */}
      {stats.length ? (
        <section className="rounded-2xl border border-border bg-card p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((s: any, i: number) => (
              <div key={i} className="text-center">
                <EditableText
                  as="div"
                  value={s.value || ""}
                  onSave={(v) => updateArrItem("stats_json", i, "value", v)}
                  placeholder="الرقم"
                  className="block text-3xl font-extrabold text-brand"
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

      {/* ===== SERVICES ===== */}
      {services.length ? (
        <section className="rounded-2xl border border-border bg-card p-8">
          <EditableText
            as="h2"
            value={c.services_title_ar || ""}
            onSave={(v) => set("services_title_ar", v)}
            placeholder="عنوان الخدمات"
            className="mb-6 block text-center text-2xl font-bold"
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s: any, i: number) => {
              const Icon = pickIcon(s.icon);
              return (
                <div key={i} className="rounded-2xl border border-border bg-background p-6">
                  <Icon className="h-8 w-8 text-brand" />
                  <EditableText
                    as="h3"
                    value={s.title_ar || ""}
                    onSave={(v) => updateArrItem("services_json", i, "title_ar", v)}
                    placeholder="عنوان الخدمة"
                    className="mt-3 block font-bold"
                  />
                  <EditableText
                    as="p"
                    multiline
                    value={s.description_ar || ""}
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
        لإضافة أو حذف عناصر (إحصائيات، خدمات، أرقام)، استخدمي التبويبات الأخرى فوق. المعاينة الحية
        للتعديل السريع في المكان.
      </div>
    </div>
  );
}
