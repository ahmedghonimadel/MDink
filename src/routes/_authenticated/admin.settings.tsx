import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  beforeLoad: requireSuperAdmin,
  component: AdminSettings,
});

type Field = {
  key: string;
  label: string;
  help: string;
  type?: "text" | "url" | "tel" | "email" | "textarea";
  schema: z.ZodTypeAny;
};

const FIELDS: Field[] = [
  {
    key: "site_name",
    label: "اسم الموقع (عربي)",
    help: "يظهر بجانب اللوجو",
    type: "text",
    schema: z.string().trim().min(2).max(80),
  },
  {
    key: "site_name_en",
    label: "Site name (English)",
    help: "Shown next to the logo",
    type: "text",
    schema: z.string().trim().min(2).max(80),
  },
  {
    key: "contact_phone",
    label: "رقم الهاتف",
    help: "يظهر في صفحة التواصل والفوتر",
    type: "tel",
    schema: z.string().trim().min(5).max(40),
  },
  {
    key: "contact_email",
    label: "البريد الإلكتروني",
    help: "يظهر في صفحة التواصل والفوتر",
    type: "email",
    schema: z.string().trim().email().max(160),
  },
  {
    key: "whatsapp_number",
    label: "رقم واتساب (دولي بدون +)",
    help: "مثال: 201020658409",
    type: "text",
    schema: z
      .string()
      .trim()
      .regex(/^\d{8,15}$/, "أرقام فقط، 8-15 رقم"),
  },
  {
    key: "footer_about_text",
    label: "نص الفوتر التعريفي (عربي)",
    help: "حتى 500 حرف",
    type: "textarea",
    schema: z.string().trim().min(10).max(500),
  },
  {
    key: "footer_about_text_en",
    label: "Footer text (English)",
    help: "Up to 500 chars",
    type: "textarea",
    schema: z.string().trim().min(10).max(500),
  },
];

function sanitize(v: string) {
  // strip control chars + <script> style payloads — defense in depth on top of RLS
  // eslint-disable-next-line no-control-regex -- intentional: removing control characters is the purpose
  return v.replace(/[\u0000-\u001F\u007F]/g, "").replace(/<\s*\/?\s*script[^>]*>/gi, "");
}

function AdminSettings() {
  const qc = useQueryClient();
  // خريطة مفاتيح الواجهة ↔ أعمدة site_settings
  const KEY_TO_COL: Record<string, string> = {
    site_name: "brand_name",
    site_name_en: "brand_name_en",
    site_logo: "logo_url",
    contact_phone: "phone",
    whatsapp_number: "whatsapp_number",
    contact_email: "email",
    footer_about_text: "footer_about_text",
    footer_about_text_en: "footer_about_text_en",
  };
  const { data, isLoading } = useQuery({
    queryKey: ["admin-site-settings-row"],
    queryFn: async () => {
      const row =
        (await (supabase as any).from("site_settings").select("*").limit(1).maybeSingle()).data ?? {};
      // حوّل صف site_settings إلى شكل key/value الذي تتوقعه الواجهة
      const asKV: { key: string; value: string; description?: string }[] = [];
      for (const [k, col] of Object.entries(KEY_TO_COL)) {
        asKV.push({ key: k, value: row[col] ?? "" });
      }
      return { row, asKV };
    },
  });

  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const next: Record<string, string> = {};
    for (const r of data.asKV) next[r.key] = r.value ?? "";
    setForm(next);
  }, [data]);

  async function upsertSetting(patch: Record<string, any>) {
    const db = supabase as any;
    const existing = (await db.from("site_settings").select("id").limit(1).maybeSingle()).data;
    const payload = { ...patch, updated_at: new Date().toISOString() };
    return existing?.id
      ? db.from("site_settings").update(payload).eq("id", existing.id)
      : db.from("site_settings").insert(payload);
  }

  async function saveLogo(url: string) {
    setForm((s) => ({ ...s, site_logo: url }));
    const { error } = await upsertSetting({ logo_url: url });
    if (error) {
      toast.error("تعذّر حفظ اللوجو: " + error.message);
      return;
    }
    toast.success("تم تحديث اللوجو ✓");
    qc.invalidateQueries({ queryKey: ["site_settings_map"] });
    qc.invalidateQueries({ queryKey: ["admin-site-settings-row"] });
  }

  async function save(field: Field) {
    const raw = sanitize(form[field.key] ?? "");
    const parsed = field.schema.safeParse(raw);
    if (!parsed.success) {
      toast.error(`${field.label}: ${parsed.error.issues[0]?.message ?? "قيمة غير صحيحة"}`);
      return;
    }
    setSaving(field.key);
    const col = KEY_TO_COL[field.key];
    let error: any = null;
    if (col) {
      ({ error } = await upsertSetting({ [col]: String(parsed.data) }));
    } else {
      // مفاتيح روابط السوشيال والفوتر تُدار من صفحة "التواصل والسوشيال"
      toast.message("هذا الحقل يُدار من صفحة التواصل والسوشيال");
    }
    setSaving(null);
    if (error) {
      toast.error("تعذّر الحفظ: " + error.message);
      return;
    }
    toast.success(`${field.label} تم تحديثه`);
    qc.invalidateQueries({ queryKey: ["site_settings_map"] });
    qc.invalidateQueries({ queryKey: ["admin-site-settings-row"] });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إعدادات الموقع</h1>
        <p className="mt-1 text-muted-foreground">
          يتم تحديث المحتوى مباشرة على كل صفحات الموقع بعد الحفظ. كل حقل هنا يُحفظ فعليًا.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          روابط السوشيال (فيسبوك، إنستجرام، تيك توك…) تُدار من صفحة{" "}
          <a href="/admin/contact-settings" className="font-semibold text-brand hover:underline">
            التواصل والسوشيال
          </a>
          .
        </p>
      </header>

      {isLoading ? (
        <div className="text-muted-foreground">جاري التحميل…</div>
      ) : (
        <>
          {/* Logo upload */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <Label className="text-sm font-semibold">شعار الموقع (اللوجو)</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              يظهر في الهيدر والفوتر وصفحة الدخول ولوحة التحكم. اتركه فارغًا لاستخدام اللوجو
              الافتراضي.
            </p>
            <div className="mt-3">
              <ImageUpload
                label=""
                value={form.site_logo || ""}
                onChange={saveLogo}
                folder="branding"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                <Label htmlFor={f.key} className="text-sm font-semibold">
                  {f.label}
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>
                {f.type === "textarea" ? (
                  <Textarea
                    id={f.key}
                    rows={4}
                    maxLength={500}
                    dir={/English/i.test(f.label) ? "ltr" : "rtl"}
                    className="mt-3"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                ) : (
                  <Input
                    id={f.key}
                    type={f.type ?? "text"}
                    maxLength={300}
                    dir={/English|url|tel/i.test(f.label + (f.type ?? "")) ? "ltr" : "rtl"}
                    className="mt-3"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  />
                )}
                <Button
                  size="sm"
                  onClick={() => save(f)}
                  disabled={saving === f.key}
                  className="mt-4 gradient-hero text-brand-foreground"
                >
                  <Save className="ml-1 h-4 w-4" /> {saving === f.key ? "جاري الحفظ…" : "حفظ"}
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
