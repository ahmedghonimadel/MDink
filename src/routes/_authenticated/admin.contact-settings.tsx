import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContactLivePreview } from "./-contact-live-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireWebsiteAdmin } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/contact-settings")({
  beforeLoad: requireWebsiteAdmin,
  component: ContactSettingsAdmin,
});

function ContactSettingsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    label_ar: "",
    label_en: "",
    value: "",
    url: "",
    icon: "MessageCircle",
    sort_order: "50",
    is_active: true,
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-social-links"],
    queryFn: async () => {
      const data = (await db.from("social_links").select("*").order("display_order")).data ?? [];
      return data.map((r: any) => ({
        ...r,
        label_ar: r.label,
        label_en: r.label,
        value: r.username,
        sort_order: r.display_order,
      }));
    },
  });

  async function save() {
    if (!form.label_ar.trim()) {
      toast.error("اكتب اسم وسيلة التواصل");
      return;
    }
    const { error } = await db.from("social_links").insert({
      platform: (form.label_en || form.label_ar).trim().toLowerCase(),
      label: form.label_ar.trim(),
      username: form.value || null,
      url: form.url,
      icon: form.icon,
      display_order: Number(form.sort_order) || 50,
      is_active: form.is_active,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("تمت إضافة وسيلة التواصل");
      setForm({
        label_ar: "",
        label_en: "",
        value: "",
        url: "",
        icon: "MessageCircle",
        sort_order: "50",
        is_active: true,
      });
      qc.invalidateQueries({ queryKey: ["admin-social-links"] });
      qc.invalidateQueries({ queryKey: ["social-links-public"] });
    }
  }

  async function toggle(id: string, is_active: boolean) {
    const { error } = await db
      .from("social_links")
      .update({ is_active: !is_active })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-social-links"] });
      qc.invalidateQueries({ queryKey: ["social-links-public"] });
    }
  }

  async function remove(id: string) {
    if (!confirm("حذف وسيلة التواصل؟")) return;
    const { error } = await db.from("social_links").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      qc.invalidateQueries({ queryKey: ["admin-social-links"] });
      qc.invalidateQueries({ queryKey: ["social-links-public"] });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إعدادات التواصل والسوشيال</h1>
        <p className="mt-1 text-muted-foreground">
          أضف واتساب، إنستجرام، تيك توك، يوتيوب، أو أي قناة تظهر للزوار.
        </p>
      </header>

      {/* معاينة حية للقنوات */}
      <ContactLivePreview channels={rows} />

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">إضافة قناة</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="الاسم عربي"
            value={form.label_ar}
            onChange={(v) => setForm({ ...form, label_ar: v })}
          />
          <Field
            label="Name English"
            value={form.label_en}
            onChange={(v) => setForm({ ...form, label_en: v })}
          />
          <Field
            label="القيمة الظاهرة"
            value={form.value}
            onChange={(v) => setForm({ ...form, value: v })}
          />
          <Field label="الرابط" value={form.url} onChange={(v) => setForm({ ...form, url: v })} />
          <Field label="Icon" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
          <Field
            label="الترتيب"
            value={form.sort_order}
            onChange={(v) => setForm({ ...form, sort_order: v })}
          />
          <label className="mt-7 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />{" "}
            نشط
          </label>
          <Button onClick={save} className="mt-6 bg-brand text-brand-foreground">
            <Plus className="ml-2 h-4 w-4" /> إضافة
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">القنوات الحالية</h2>
        <div className="mt-4 grid gap-3">
          {rows.map((row: any) => (
            <article
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-bold">
                  {row.label_ar} / {row.label_en}
                </div>
                <div className="truncate text-xs text-muted-foreground">{row.url || row.value}</div>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
                {row.icon}
              </span>
              <Button size="sm" variant="outline" onClick={() => toggle(row.id, !!row.is_active)}>
                {row.is_active ? "إخفاء" : "تفعيل"}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove(row.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </article>
          ))}
        </div>
      </section>

      <SiteSettingsCard />
    </div>
  );
}

function SiteSettingsCard() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [s, setS] = useState<any>(null);
  const { data } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () =>
      (await db.from("site_settings").select("*").limit(1).maybeSingle()).data ?? {},
  });
  useEffect(() => {
    if (data) setS(data);
  }, [data]);
  if (!s) return null;

  async function save() {
    const payload = {
      brand_name: s.brand_name || "MDink Solutions",
      phone: s.phone || null,
      email: s.email || null,
      whatsapp_number: s.whatsapp_number || null,
      whatsapp_default_message: s.whatsapp_default_message || null,
      is_whatsapp_floating_enabled: !!s.is_whatsapp_floating_enabled,
      address: s.address || null,
      updated_at: new Date().toISOString(),
    };
    const { error } = s.id
      ? await db.from("site_settings").update(payload).eq("id", s.id)
      : await db.from("site_settings").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ إعدادات الموقع ✓");
    qc.invalidateQueries({ queryKey: ["admin-site-settings"] });
    qc.invalidateQueries({ queryKey: ["site_settings_map"] });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="mb-4 text-lg font-bold">إعدادات الموقع وواتساب</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="اسم الشركة" value={s.brand_name ?? ""} onChange={(v) => setS({ ...s, brand_name: v })} />
        <Field label="رقم واتساب (بالكود الدولي، مثال 2010...)" value={s.whatsapp_number ?? ""} onChange={(v) => setS({ ...s, whatsapp_number: v })} />
        <Field label="الهاتف" value={s.phone ?? ""} onChange={(v) => setS({ ...s, phone: v })} />
        <Field label="البريد الإلكتروني" value={s.email ?? ""} onChange={(v) => setS({ ...s, email: v })} />
        <div className="sm:col-span-2">
          <Field label="رسالة واتساب الافتراضية" value={s.whatsapp_default_message ?? ""} onChange={(v) => setS({ ...s, whatsapp_default_message: v })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!s.is_whatsapp_floating_enabled}
            onChange={(e) => setS({ ...s, is_whatsapp_floating_enabled: e.target.checked })}
          />
          تفعيل زر واتساب العائم في كل الصفحات
        </label>
      </div>
      <Button onClick={save} className="mt-4 gradient-hero text-brand-foreground">
        حفظ إعدادات الموقع
      </Button>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input className="mt-1.5" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
