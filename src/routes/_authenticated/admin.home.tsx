import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Plus, Trash2, GripVertical, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { VideoUpload } from "@/components/VideoUpload";
import { HomeLivePreview } from "./-home-live-preview";

export const Route = createFileRoute("/_authenticated/admin/home")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminHome,
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
  "CalendarCheck",
  "Stethoscope",
  "Video",
  "Palette",
];

const SECTION_LABELS: Record<string, string> = {
  hero: "الهيرو (القسم العلوي)",
  stats: "الإحصائيات",
  services: "الخدمات المختصرة",
  why: "لماذا MDink + المنظومة",
  cta: "دعوة الإجراء النهائية",
};

const TABS = [
  { id: "live", label: "✨ معاينة حية" },
  { id: "hero", label: "الهيرو" },
  { id: "stats", label: "الإحصائيات" },
  { id: "services", label: "الخدمات" },
  { id: "why", label: "لماذا MDink" },
  { id: "cta", label: "دعوة الإجراء" },
  { id: "sections", label: "ترتيب الأقسام" },
];

function AdminHome() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("live");
  const [c, setC] = useState<Record<string, any>>({});

  const { data } = useQuery({
    queryKey: ["page-sections-admin", "home"],
    queryFn: async () => {
      const rows =
        (await (supabase as any).from("page_sections").select("*").eq("page_slug", "home")).data ??
        [];
      const merged: Record<string, any> = {};
      const bySection: Record<string, any> = {};
      rows.forEach((r: any) => {
        bySection[r.section_key] = r;
        Object.assign(merged, r.content_json ?? {});
      });
      const hero = bySection["hero"];
      const why = bySection["why_mdink"];
      if (hero) {
        merged.hero_title_ar = hero.title ?? merged.hero_title_ar;
        merged.hero_subtitle_ar = hero.subtitle ?? merged.hero_subtitle_ar;
        if (hero.content_json?.image_url) merged.hero_image = hero.content_json.image_url;
        if (hero.content_json?.bg_image_url) merged.hero_bg_image = hero.content_json.bg_image_url;
      }
      if (why) {
        merged.why_title_ar = why.title ?? merged.why_title_ar;
        merged.why_intro_ar = why.subtitle ?? merged.why_intro_ar;
        if (why.video_url) merged.why_video_url = why.video_url;
        if (why.content_json?.why_video_poster)
          merged.why_video_poster = why.content_json.why_video_poster;
      }
      const system = bySection["system"];
      if (system) {
        merged.system_title_ar = system.title ?? merged.system_title_ar;
        merged.system_intro_ar = system.subtitle ?? merged.system_intro_ar;
        if (system.video_url) merged.system_video_url = system.video_url;
        if (system.content_json?.title_en) merged.system_title_en = system.content_json.title_en;
        if (system.content_json?.intro_en) merged.system_intro_en = system.content_json.intro_en;
        if (system.content_json?.video_title)
          merged.system_video_title = system.content_json.video_title;
        if (system.content_json?.video_thumbnail)
          merged.system_video_thumbnail = system.content_json.video_thumbnail;
        if (Array.isArray(system.content_json?.items))
          merged.system_items_json = system.content_json.items;
      }
      return merged;
    },
  });

  useEffect(() => {
    if (data) setC(data);
  }, [data]);

  const set = (k: string, v: any) => setC((p) => ({ ...p, [k]: v }));
  const arr = (k: string): any[] => (Array.isArray(c[k]) ? c[k] : []);
  const setArr = (k: string, items: any[]) => set(k, items);

  async function save() {
    setSaving(true);
    const db = supabase as any;
    // اكتب سكشن hero و why_mdink في page_sections (ما يقرأه الموقع العام)
    const heroSection = {
      page_slug: "home",
      section_key: "hero",
      title: c.hero_title_ar ?? null,
      subtitle: c.hero_subtitle_ar ?? null,
      content_json: {
        ...(c.badge_ar ? { badge_ar: c.badge_ar } : {}),
        ...(c.hero_image ? { image_url: c.hero_image } : {}),
        ...(c.hero_bg_image ? { bg_image_url: c.hero_bg_image } : {}),
        title_en: c.hero_title_en ?? null,
        subtitle_en: c.hero_subtitle_en ?? null,
      },
      is_visible: true,
      display_order: 1,
      updated_at: new Date().toISOString(),
    };
    const whySection = {
      page_slug: "home",
      section_key: "why_mdink",
      title: c.why_title_ar ?? null,
      subtitle: c.why_intro_ar ?? null,
      video_url: c.why_video_url ?? null,
      content_json: {
        ...(Array.isArray(c.why_points) ? { points: c.why_points } : {}),
        ...(c.why_video_poster ? { why_video_poster: c.why_video_poster } : {}),
      },
      is_visible: true,
      display_order: 2,
      updated_at: new Date().toISOString(),
    };
    const systemSection = {
      page_slug: "home",
      section_key: "system",
      title: c.system_title_ar ?? null,
      subtitle: c.system_intro_ar ?? null,
      video_url: c.system_video_url ?? null,
      content_json: {
        title_en: c.system_title_en ?? null,
        intro_en: c.system_intro_en ?? null,
        ...(c.system_video_title ? { video_title: c.system_video_title } : {}),
        ...(c.system_video_thumbnail ? { video_thumbnail: c.system_video_thumbnail } : {}),
        ...(Array.isArray(c.system_items_json) ? { items: c.system_items_json } : {}),
      },
      is_visible: true,
      display_order: 3,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db
      .from("page_sections")
      .upsert([heroSection, whySection, systemSection], { onConflict: "page_slug,section_key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["page-sections-admin", "home"] });
    qc.invalidateQueries({ queryKey: ["page-sections-public", "home"] });
    toast.success("تم حفظ الصفحة الرئيسية ✓");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">إدارة الصفحة الرئيسية</h1>
          <p className="mt-1 text-muted-foreground">
            تحكم كامل في كل قسم، نص، رقم، وصورة — بالعربي والإنجليزي.
          </p>
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="gradient-hero text-brand-foreground shadow-brand"
        >
          <Save className="ml-2 h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ كل التغييرات"}
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? "gradient-hero text-brand-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ——— HERO ——— */}
      {tab === "live" && <HomeLivePreview c={c} set={set} arr={arr} setArr={setArr} />}

      {tab === "hero" && (
        <Card>
          <Grid>
            <Field label="الشارة (Badge) عربي" v={c.badge_ar} on={(v) => set("badge_ar", v)} />
            <Field label="Badge English" v={c.badge_en} on={(v) => set("badge_en", v)} />
            <Field
              label="العنوان الرئيسي عربي"
              v={c.hero_title_ar}
              on={(v) => set("hero_title_ar", v)}
              area
            />
            <Field
              label="Hero title English"
              v={c.hero_title_en}
              on={(v) => set("hero_title_en", v)}
              area
            />
            <Field
              label="النص الفرعي عربي"
              v={c.hero_subtitle_ar}
              on={(v) => set("hero_subtitle_ar", v)}
              area
            />
            <Field
              label="Subtitle English"
              v={c.hero_subtitle_en}
              on={(v) => set("hero_subtitle_en", v)}
              area
            />
            <Field
              label="زر أساسي عربي"
              v={c.primary_cta_ar}
              on={(v) => set("primary_cta_ar", v)}
            />
            <Field
              label="Primary CTA English"
              v={c.primary_cta_en}
              on={(v) => set("primary_cta_en", v)}
            />
            <Field
              label="زر ثانوي عربي"
              v={c.secondary_cta_ar}
              on={(v) => set("secondary_cta_ar", v)}
            />
            <Field
              label="Secondary CTA English"
              v={c.secondary_cta_en}
              on={(v) => set("secondary_cta_en", v)}
            />
          </Grid>

          <Divider>عناصر الثقة (تحت الأزرار)</Divider>
          <ListEditor
            items={arr("trust_ar")}
            onChange={(items) => setArr("trust_ar", items)}
            render={(val, i, upd) => (
              <Input value={val} onChange={(e) => upd(e.target.value)} placeholder="عربي" />
            )}
            addLabel="إضافة عنصر ثقة (عربي)"
            newItem={() => ""}
          />
          <ListEditor
            items={arr("trust_en")}
            onChange={(items) => setArr("trust_en", items)}
            render={(val, i, upd) => (
              <Input
                dir="ltr"
                value={val}
                onChange={(e) => upd(e.target.value)}
                placeholder="English"
              />
            )}
            addLabel="Add trust item (English)"
            newItem={() => ""}
          />

          <Divider>كارت المعاينة</Divider>
          <Grid>
            <Field
              label="اسم الطبيب عربي"
              v={c.preview_doctor_ar}
              on={(v) => set("preview_doctor_ar", v)}
            />
            <Field
              label="Doctor name English"
              v={c.preview_doctor_en}
              on={(v) => set("preview_doctor_en", v)}
            />
            <Field
              label="التخصص عربي"
              v={c.preview_specialty_ar}
              on={(v) => set("preview_specialty_ar", v)}
            />
            <Field
              label="Specialty English"
              v={c.preview_specialty_en}
              on={(v) => set("preview_specialty_en", v)}
            />
            <Field label="رابط المعاينة" v={c.preview_url} on={(v) => set("preview_url", v)} />
            <Field
              label="نص شارة منشور عربي"
              v={c.published_label_ar}
              on={(v) => set("published_label_ar", v)}
            />
          </Grid>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <ImageUpload
              label="صورة الهيرو الرئيسية (تحل محل كارت المعاينة القديم)"
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
              label="صورة كارت الطبيب (اختياري)"
              value={c.preview_card_image || ""}
              onChange={(v) => set("preview_card_image", v)}
              folder="home"
            />
          </div>

          <Divider>فيديو قسم المنظومة الرقمية</Divider>
          <p className="mb-2 text-sm text-muted-foreground">
            ارفع فيديو من جهازك أو الصق رابط (YouTube / Shorts / Vimeo / MP4) يظهر في قسم "المنظومة الرقمية" بدل الصندوق الثابت. اتركه فارغًا لعرض المحتوى النصي.
          </p>
          <VideoUpload
            label="فيديو المنظومة"
            value={c.system_video_url || ""}
            onChange={(v) => set("system_video_url", v)}
            folder="home"
          />
          <Grid>
            <Field
              label="عنوان الفيديو (اختياري)"
              v={c.system_video_title || ""}
              on={(v) => set("system_video_title", v)}
            />
          </Grid>
          <div className="mt-4">
            <ImageUpload
              label="صورة مصغّرة للفيديو (اختياري)"
              value={c.system_video_thumbnail || ""}
              onChange={(v) => set("system_video_thumbnail", v)}
              folder="home"
            />
          </div>

          <Divider>أرقام كارت المعاينة (4 مربعات)</Divider>
          <CardStatsEditor
            items={arr("dashboard_card_json")}
            onChange={(items) => setArr("dashboard_card_json", items)}
          />
        </Card>
      )}

      {/* ——— STATS ——— */}
      {tab === "stats" && (
        <Card>
          <p className="mb-4 text-sm text-muted-foreground">
            شريط الإحصائيات تحت الهيرو (الأرقام الكبيرة).
          </p>
          <StatsEditor
            items={arr("stats_json")}
            onChange={(items) => setArr("stats_json", items)}
          />
        </Card>
      )}

      {/* ——— SERVICES ——— */}
      {tab === "services" && (
        <Card>
          <Grid>
            <Field
              label="عنوان القسم عربي"
              v={c.services_title_ar}
              on={(v) => set("services_title_ar", v)}
            />
            <Field
              label="Section title English"
              v={c.services_title_en}
              on={(v) => set("services_title_en", v)}
            />
            <Field
              label="وصف القسم عربي"
              v={c.services_intro_ar}
              on={(v) => set("services_intro_ar", v)}
              area
            />
            <Field
              label="Section intro English"
              v={c.services_intro_en}
              on={(v) => set("services_intro_en", v)}
              area
            />
          </Grid>
          <Divider>كروت الخدمات المختصرة</Divider>
          <ServicesEditor
            items={arr("services_json")}
            onChange={(items) => setArr("services_json", items)}
          />
        </Card>
      )}

      {/* ——— WHY ——— */}
      {tab === "why" && (
        <Card>
          <Grid>
            <Field label="عنوان لماذا عربي" v={c.why_title_ar} on={(v) => set("why_title_ar", v)} />
            <Field
              label="Why title English"
              v={c.why_title_en}
              on={(v) => set("why_title_en", v)}
            />
            <Field
              label="وصف لماذا عربي"
              v={c.why_intro_ar}
              on={(v) => set("why_intro_ar", v)}
              area
            />
            <Field
              label="Why intro English"
              v={c.why_intro_en}
              on={(v) => set("why_intro_en", v)}
              area
            />
            <Field label="زر التحدث عربي" v={c.talk_ar} on={(v) => set("talk_ar", v)} />
            <Field label="Talk button English" v={c.talk_en} on={(v) => set("talk_en", v)} />
          </Grid>

          <Divider>فيديو تعريفي (قسم لماذا MDink)</Divider>
          <p className="mb-2 text-sm text-muted-foreground">
            ارفع فيديو من جهازك أو الصق رابط (YouTube / Shorts / Vimeo / MP4). يظهر بدل الصندوق الثابت "سيظهر هنا فيديو". اتركه فارغًا لعرض الصندوق الافتراضي.
          </p>
          <div className="grid gap-6 md:grid-cols-2">
            <VideoUpload
              label="فيديو لماذا MDink"
              value={c.why_video_url || ""}
              onChange={(v) => set("why_video_url", v)}
              folder="home"
            />
            <ImageUpload
              label="صورة مصغّرة للفيديو (اختياري — للروابط)"
              value={c.why_video_poster || ""}
              onChange={(v) => set("why_video_poster", v)}
              folder="home"
            />
          </div>

          <Divider>قائمة المميزات</Divider>
          <BilingualListEditor
            items={arr("advantages_json")}
            onChange={(items) => setArr("advantages_json", items)}
          />

          <Divider>كارت المنظومة المتكاملة</Divider>
          <Grid>
            <Field
              label="التسمية عربي"
              v={c.system_label_ar}
              on={(v) => set("system_label_ar", v)}
            />
            <Field
              label="Label English"
              v={c.system_label_en}
              on={(v) => set("system_label_en", v)}
            />
            <Field
              label="العنوان عربي"
              v={c.system_title_ar}
              on={(v) => set("system_title_ar", v)}
            />
            <Field
              label="Title English"
              v={c.system_title_en}
              on={(v) => set("system_title_en", v)}
            />
            <Field label="الوصف عربي" v={c.system_intro_ar} on={(v) => set("system_intro_ar", v)} />
            <Field
              label="Intro English"
              v={c.system_intro_en}
              on={(v) => set("system_intro_en", v)}
            />
          </Grid>
          <Divider>عناصر المنظومة</Divider>
          <BilingualListEditor
            items={arr("system_items_json")}
            onChange={(items) => setArr("system_items_json", items)}
          />
        </Card>
      )}

      {/* ——— CTA ——— */}
      {tab === "cta" && (
        <Card>
          <Grid>
            <Field
              label="العنوان عربي"
              v={c.cta_title_ar}
              on={(v) => set("cta_title_ar", v)}
              area
            />
            <Field
              label="Title English"
              v={c.cta_title_en}
              on={(v) => set("cta_title_en", v)}
              area
            />
            <Field label="النص عربي" v={c.cta_text_ar} on={(v) => set("cta_text_ar", v)} area />
            <Field label="Text English" v={c.cta_text_en} on={(v) => set("cta_text_en", v)} area />
            <Field
              label="زر أساسي عربي"
              v={c.cta_primary_ar}
              on={(v) => set("cta_primary_ar", v)}
            />
            <Field
              label="Primary English"
              v={c.cta_primary_en}
              on={(v) => set("cta_primary_en", v)}
            />
            <Field
              label="زر ثانوي عربي"
              v={c.cta_secondary_ar}
              on={(v) => set("cta_secondary_ar", v)}
            />
            <Field
              label="Secondary English"
              v={c.cta_secondary_en}
              on={(v) => set("cta_secondary_en", v)}
            />
          </Grid>
        </Card>
      )}

      {/* ——— SECTIONS ORDER ——— */}
      {tab === "sections" && (
        <Card>
          <p className="mb-4 text-sm text-muted-foreground">
            رتّب الأقسام (أعلى/أسفل) أو أخفِ أي قسم من الصفحة الرئيسية.
          </p>
          <SectionsManager
            order={
              Array.isArray(c.sections_order)
                ? c.sections_order
                : ["hero", "stats", "services", "why", "cta"]
            }
            hidden={Array.isArray(c.sections_hidden) ? c.sections_hidden : []}
            onOrder={(o) => set("sections_order", o)}
            onHidden={(h) => set("sections_hidden", h)}
          />
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={save}
          disabled={saving}
          className="gradient-hero text-brand-foreground shadow-brand"
        >
          <Save className="ml-2 h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ كل التغييرات"}
        </Button>
      </div>
    </div>
  );
}

/* ————————————————— UI Helpers ————————————————— */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-6 shadow-card">{children}</div>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2">{children}</div>;
}
function Divider({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-6 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-sm font-semibold text-brand">{children}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
function Field({
  label,
  v,
  on,
  area,
}: {
  label: string;
  v: any;
  on: (v: string) => void;
  area?: boolean;
}) {
  const isEn = /English/i.test(label);
  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">{label}</div>
      {area ? (
        <Textarea
          rows={2}
          dir={isEn ? "ltr" : "rtl"}
          value={v ?? ""}
          onChange={(e) => on(e.target.value)}
        />
      ) : (
        <Input dir={isEn ? "ltr" : "rtl"} value={v ?? ""} onChange={(e) => on(e.target.value)} />
      )}
    </div>
  );
}

function ListEditor({
  items,
  onChange,
  render,
  addLabel,
  newItem,
}: {
  items: any[];
  onChange: (items: any[]) => void;
  render: (val: any, i: number, upd: (v: any) => void) => React.ReactNode;
  addLabel: string;
  newItem: () => any;
}) {
  return (
    <div className="space-y-2">
      {items.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1">
            {render(val, i, (v) => {
              const n = [...items];
              n[i] = v;
              onChange(n);
            })}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, newItem()])}>
        <Plus className="ml-1 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

function BilingualListEditor({
  items,
  onChange,
}: {
  items: any[];
  onChange: (items: any[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
          <div className="grid flex-1 gap-2 md:grid-cols-2">
            <Input
              value={it.ar ?? ""}
              placeholder="عربي"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], ar: e.target.value };
                onChange(n);
              }}
            />
            <Input
              dir="ltr"
              value={it.en ?? ""}
              placeholder="English"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], en: e.target.value };
                onChange(n);
              }}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => onChange([...items, { ar: "", en: "" }])}>
        <Plus className="ml-1 h-4 w-4" /> إضافة عنصر
      </Button>
    </div>
  );
}

function StatsEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
          <div className="grid flex-1 gap-2 md:grid-cols-3">
            <Input
              value={it.value ?? ""}
              placeholder="القيمة (+50)"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], value: e.target.value };
                onChange(n);
              }}
            />
            <Input
              value={it.label_ar ?? ""}
              placeholder="التسمية عربي"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], label_ar: e.target.value };
                onChange(n);
              }}
            />
            <Input
              dir="ltr"
              value={it.label_en ?? ""}
              placeholder="Label English"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], label_en: e.target.value };
                onChange(n);
              }}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onChange([...items, { value: "", label_ar: "", label_en: "" }])}
      >
        <Plus className="ml-1 h-4 w-4" /> إضافة إحصائية
      </Button>
    </div>
  );
}

function CardStatsEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-border p-3">
          <div className="grid flex-1 gap-2 md:grid-cols-4">
            <Input
              value={it.value ?? ""}
              placeholder="القيمة"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], value: e.target.value };
                onChange(n);
              }}
            />
            <Input
              value={it.label_ar ?? ""}
              placeholder="عربي"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], label_ar: e.target.value };
                onChange(n);
              }}
            />
            <Input
              dir="ltr"
              value={it.label_en ?? ""}
              placeholder="English"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], label_en: e.target.value };
                onChange(n);
              }}
            />
            <IconSelect
              value={it.icon}
              onChange={(v) => {
                const n = [...items];
                n[i] = { ...n[i], icon: v };
                onChange(n);
              }}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([...items, { value: "", label_ar: "", label_en: "", icon: "Users" }])
        }
      >
        <Plus className="ml-1 h-4 w-4" /> إضافة مربع
      </Button>
    </div>
  );
}

function ServicesEditor({ items, onChange }: { items: any[]; onChange: (items: any[]) => void }) {
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">خدمة #{i + 1}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={it.title_ar ?? ""}
              placeholder="عنوان عربي"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], title_ar: e.target.value };
                onChange(n);
              }}
            />
            <Input
              dir="ltr"
              value={it.title_en ?? ""}
              placeholder="Title English"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], title_en: e.target.value };
                onChange(n);
              }}
            />
            <Textarea
              rows={2}
              value={it.desc_ar ?? ""}
              placeholder="وصف عربي"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], desc_ar: e.target.value };
                onChange(n);
              }}
            />
            <Textarea
              rows={2}
              dir="ltr"
              value={it.desc_en ?? ""}
              placeholder="Description English"
              onChange={(e) => {
                const n = [...items];
                n[i] = { ...n[i], desc_en: e.target.value };
                onChange(n);
              }}
            />
            <div className="md:col-span-2">
              <IconSelect
                value={it.icon}
                onChange={(v) => {
                  const n = [...items];
                  n[i] = { ...n[i], icon: v };
                  onChange(n);
                }}
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        size="sm"
        variant="outline"
        onClick={() =>
          onChange([
            ...items,
            { title_ar: "", title_en: "", desc_ar: "", desc_en: "", icon: "Globe" },
          ])
        }
      >
        <Plus className="ml-1 h-4 w-4" /> إضافة خدمة
      </Button>
    </div>
  );
}

function IconSelect({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value || "Globe"}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
    >
      {ICON_OPTIONS.map((ic) => (
        <option key={ic} value={ic}>
          {ic}
        </option>
      ))}
    </select>
  );
}

function SectionsManager({
  order,
  hidden,
  onOrder,
  onHidden,
}: {
  order: string[];
  hidden: string[];
  onOrder: (o: string[]) => void;
  onHidden: (h: string[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const n = [...order];
    const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onOrder(n);
  }
  function toggle(id: string) {
    onHidden(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
  }
  return (
    <div className="space-y-2">
      {order.map((id, i) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{SECTION_LABELS[id] ?? id}</span>
          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => move(i, 1)}
            disabled={i === order.length - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => toggle(id)}>
            {hidden.includes(id) ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-brand" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
