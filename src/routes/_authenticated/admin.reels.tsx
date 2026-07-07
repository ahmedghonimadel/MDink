import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { openExternal } from "@/lib/external-links";

export const Route = createFileRoute("/_authenticated/admin/reels")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminReels,
});

const PLATFORMS = ["Instagram", "TikTok", "Facebook", "YouTube Shorts"];

const empty = {
  title_ar: "",
  title_en: "",
  notes_ar: "",
  notes_en: "",
  reel_url: "",
  thumbnail_url: "",
  alt_ar: "",
  alt_en: "",
  views: "0",
  likes: "0",
  comments: "0",
  platform: "Instagram",
  sort_order: "0",
  is_published: true,
};

function AdminReels() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const { data: reels = [] } = useQuery({
    queryKey: ["admin-reels-v2"],
    queryFn: async () =>
      (await db.from("reels").select("*").order("display_order")).data ?? [],
  });

  function edit(reel: any) {
    setEditingId(reel.id);
    setForm({
      title_ar: reel.title_ar ?? reel.title ?? "",
      title_en: reel.title_en ?? "",
      notes_ar: reel.notes_ar ?? reel.notes ?? "",
      notes_en: reel.notes_en ?? "",
      reel_url: reel.video_url ?? reel.reel_url ?? "",
      thumbnail_url: reel.thumbnail_url ?? "",
      alt_ar: reel.alt_ar ?? "",
      alt_en: reel.alt_en ?? "",
      views: String(reel.views ?? 0),
      likes: String(reel.likes ?? 0),
      comments: String(reel.comments ?? 0),
      platform: reel.platform ?? "Instagram",
      sort_order: String(reel.display_order ?? reel.sort_order ?? 0),
      is_published: reel.is_active ?? reel.is_published ?? true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.title_ar.trim() || !form.reel_url.trim())
      return toast.error("اكتب عنوان عربي ورابط الريل");
    const payload = {
      title: form.title_ar.trim(),
      video_url: form.reel_url.trim(),
      thumbnail_url: form.thumbnail_url.trim() || null,
      views: Number(form.views) || 0,
      likes: Number(form.likes) || 0,
      comments: Number(form.comments) || 0,
      platform: form.platform.trim() || "Instagram",
      display_order: Number(form.sort_order) || 0,
      is_active: form.is_published,
    };
    const { error } = editingId
      ? await db.from("reels").update(payload).eq("id", editingId)
      : await db.from("reels").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الريل ✓");
    setEditingId(null);
    setForm(empty);
    qc.invalidateQueries({ queryKey: ["admin-reels-v2"] });
    qc.invalidateQueries({ queryKey: ["public-reel-campaigns"] });
  }

  async function remove(id: string) {
    if (!confirm("حذف حملة الريلز نهائياً؟")) return;
    const { error } = await db.from("reels").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-reels-v2"] });
  }

  async function togglePublish(reel: any) {
    await db.from("reels").update({ is_active: !(reel.is_active ?? reel.is_published) }).eq("id", reel.id);
    qc.invalidateQueries({ queryKey: ["admin-reels-v2"] });
    qc.invalidateQueries({ queryKey: ["public-reel-campaigns"] });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة Reels Campaigns</h1>
        <p className="mt-1 text-muted-foreground">
          العناوين، الصور المصغرة (رفع من الجهاز)، الروابط، والأرقام اليدوية.
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{editingId ? "تعديل ريل" : "ريل جديد"}</h2>
            {editingId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm(empty);
                }}
              >
                <Plus className="ml-1 h-4 w-4" /> جديد
              </Button>
            )}
          </div>
          <div className="mt-4 grid gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="العنوان عربي"
                value={form.title_ar}
                onChange={(v) => setForm({ ...form, title_ar: v })}
              />
              <Field
                label="Title English"
                value={form.title_en}
                onChange={(v) => setForm({ ...form, title_en: v })}
              />
              <Field
                label="ملاحظات عربي"
                value={form.notes_ar}
                onChange={(v) => setForm({ ...form, notes_ar: v })}
                textarea
              />
              <Field
                label="Notes English"
                value={form.notes_en}
                onChange={(v) => setForm({ ...form, notes_en: v })}
                textarea
              />
            </div>
            <Field
              label="رابط الريل (Reel URL)"
              value={form.reel_url}
              onChange={(v) => setForm({ ...form, reel_url: v })}
            />
            <ImageUpload
              label="الصورة المصغرة (Thumbnail)"
              value={form.thumbnail_url}
              onChange={(v) => setForm({ ...form, thumbnail_url: v })}
              folder="reels"
            />
            {form.thumbnail_url ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="وصف الصورة عربي"
                  value={form.alt_ar}
                  onChange={(v) => setForm({ ...form, alt_ar: v })}
                />
                <Field
                  label="Alt English"
                  value={form.alt_en}
                  onChange={(v) => setForm({ ...form, alt_en: v })}
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-5">
              <Field
                label="مشاهدات"
                type="number"
                value={form.views}
                onChange={(v) => setForm({ ...form, views: v })}
              />
              <Field
                label="إعجابات"
                type="number"
                value={form.likes}
                onChange={(v) => setForm({ ...form, likes: v })}
              />
              <Field
                label="تعليقات"
                type="number"
                value={form.comments}
                onChange={(v) => setForm({ ...form, comments: v })}
              />
              <div>
                <Label>المنصة</Label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-2 py-2 text-sm"
                >
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <Field
                label="الترتيب"
                type="number"
                value={form.sort_order}
                onChange={(v) => setForm({ ...form, sort_order: v })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />{" "}
              منشور
            </label>
            <Button onClick={save} className="gradient-hero text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> حفظ الريل
            </Button>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-xl font-bold">الريلز ({reels.length})</h2>
          <div className="mt-4 space-y-3">
            {reels.map((reel: any) => (
              <div
                key={reel.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
              >
                {reel.thumbnail_url ? (
                  <img
                    src={reel.thumbnail_url}
                    alt={reel.title_ar ?? reel.title}
                    loading="lazy"
                    className="h-14 w-14 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-lg gradient-hero" />
                )}
                <button onClick={() => edit(reel)} className="min-w-0 flex-1 text-right">
                  <div className="truncate font-semibold">{reel.title_ar ?? reel.title}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {reel.platform} · {reel.views} مشاهدة · {reel.likes} إعجاب
                  </div>
                </button>
                {reel.reel_url ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openExternal(reel.reel_url)}
                    title="فتح الريل للتأكد أنه يعمل"
                  >
                    <ExternalLink className="h-4 w-4 text-brand" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => togglePublish(reel)}
                  title={reel.is_published ? "إخفاء" : "نشر"}
                >
                  {reel.is_published ? (
                    <Eye className="h-4 w-4 text-brand" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(reel.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            {reels.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                لا توجد ريلز بعد.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  textarea,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  textarea?: boolean;
  type?: string;
}) {
  const isEn = /English/i.test(label);
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
          type={type}
          dir={isEn ? "ltr" : "rtl"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
