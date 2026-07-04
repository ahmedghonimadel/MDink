import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireWebsiteAdmin } from "@/lib/admin";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/seo")({
  beforeLoad: requireWebsiteAdmin,
  component: SeoAdmin,
});

const PAGES = [
  { key: "home", label: "الصفحة الرئيسية" },
  { key: "services", label: "الخدمات" },
  { key: "portfolio", label: "الأعمال" },
  { key: "reviews", label: "آراء عملائنا" },
  { key: "blog", label: "المدونة" },
  { key: "about", label: "من نحن" },
  { key: "contact", label: "تواصل" },
];

// العناوين الافتراضية لكل صفحة (يُملأ الحقل بها إن كان فارغًا)
const DEFAULT_TITLES: Record<string, { ar: string; en: string }> = {
  home: { ar: "MDink for Digital Solutions", en: "MDink for Digital Solutions" },
  services: { ar: "خدماتنا — MDink Solutions", en: "Services — MDink Solutions" },
  portfolio: { ar: "أعمالنا — MDink Solutions", en: "Portfolio — MDink Solutions" },
  reviews: { ar: "آراء عملائنا — MDink Solutions", en: "Client Reviews — MDink Solutions" },
  blog: { ar: "المدونة — MDink Solutions", en: "Blog — MDink Solutions" },
  about: { ar: "من نحن — MDink Solutions", en: "About Us — MDink Solutions" },
  contact: { ar: "تواصل معنا — MDink Solutions", en: "Contact Us — MDink Solutions" },
};

type SeoRow = {
  page_key: string;
  meta_title_ar: string;
  meta_title_en: string;
  meta_description_ar: string;
  meta_description_en: string;
  og_image_url: string;
  canonical_url: string;
  robots: string;
};

const emptyRow = (key: string): SeoRow => ({
  page_key: key,
  meta_title_ar: DEFAULT_TITLES[key]?.ar ?? "",
  meta_title_en: DEFAULT_TITLES[key]?.en ?? "",
  meta_description_ar: "",
  meta_description_en: "",
  og_image_url: "",
  canonical_url: "",
  robots: "index,follow",
});

function SeoAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [activePage, setActivePage] = useState("home");
  const [row, setRow] = useState<SeoRow>(emptyRow("home"));
  const [saving, setSaving] = useState(false);

  const { data: allRows } = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: async () => (await db.from("seo_settings").select("*")).data ?? [],
  });

  useEffect(() => {
    const found = (allRows ?? []).find((r: any) => r.page_key === activePage);
    setRow(found ? { ...emptyRow(activePage), ...found } : emptyRow(activePage));
  }, [activePage, allRows]);

  async function save() {
    setSaving(true);
    const { error } = await db
      .from("seo_settings")
      .upsert(
        { ...row, page_key: activePage, updated_at: new Date().toISOString() },
        { onConflict: "page_key" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ إعدادات SEO للصفحة ✓");
    qc.invalidateQueries({ queryKey: ["admin-seo-settings"] });
  }

  const set = (k: keyof SeoRow, v: string) => setRow((r) => ({ ...r, [k]: v }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إعدادات SEO لكل صفحة</h1>
        <p className="mt-1 text-muted-foreground">
          عناوين، أوصاف، Open Graph، وCanonical لكل صفحة عامة. صفحات الإدارة والدخول عليها noindex
          تلقائيًا.
        </p>
      </header>

      {/* Page tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {PAGES.map((p) => (
          <button
            key={p.key}
            onClick={() => setActivePage(p.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activePage === p.key
                ? "gradient-hero text-brand-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label="Meta title عربي"
            value={row.meta_title_ar}
            onChange={(v) => set("meta_title_ar", v)}
          />
          <Field
            label="Meta title English"
            value={row.meta_title_en}
            onChange={(v) => set("meta_title_en", v)}
          />
          <Field
            label="Meta description عربي"
            value={row.meta_description_ar}
            onChange={(v) => set("meta_description_ar", v)}
            textarea
          />
          <Field
            label="Meta description English"
            value={row.meta_description_en}
            onChange={(v) => set("meta_description_en", v)}
            textarea
          />
          <Field
            label="Canonical URL"
            value={row.canonical_url}
            onChange={(v) => set("canonical_url", v)}
          />
          <div>
            <Label>Robots</Label>
            <select
              value={row.robots}
              onChange={(e) => set("robots", e.target.value)}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="index,follow">index, follow (مفهرس)</option>
              <option value="noindex,follow">noindex, follow</option>
              <option value="noindex,nofollow">noindex, nofollow (مخفي)</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <ImageUpload
            label="صورة Open Graph (تظهر عند مشاركة الرابط)"
            value={row.og_image_url}
            onChange={(v) => set("og_image_url", v)}
            folder="seo"
          />
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="mt-5 gradient-hero text-brand-foreground"
        >
          <Save className="ml-2 h-4 w-4" /> {saving ? "جاري الحفظ..." : "حفظ إعدادات الصفحة"}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
}) {
  const isEn = /English|URL/i.test(label);
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
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
