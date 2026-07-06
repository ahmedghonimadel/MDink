import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Check,
  X,
  ShieldCheck,
  Home as HomeIcon,
  ExternalLink,
} from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { VideoUpload } from "@/components/VideoUpload";
import { openExternal } from "@/lib/external-links";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminReviews,
});

const db = supabase as any;

type T = {
  id?: string;
  name_ar?: string;
  name_en?: string;
  role_ar?: string;
  role_en?: string;
  title_ar?: string;
  title_en?: string;
  excerpt_ar?: string;
  excerpt_en?: string;
  full_text_ar?: string;
  full_text_en?: string;
  media_type?: "video" | "image" | "text";
  media_url?: string | null;
  thumbnail_url?: string | null;
  profile_url?: string | null;
  platform_type?: string | null;
  rating?: number;
  is_verified?: boolean;
  is_featured?: boolean;
  show_on_home?: boolean;
  is_published?: boolean;
  sort_order?: number;
};

const emptyT = (): T => ({
  name_ar: "",
  name_en: "",
  role_ar: "",
  role_en: "",
  title_ar: "",
  title_en: "",
  excerpt_ar: "",
  excerpt_en: "",
  full_text_ar: "",
  full_text_en: "",
  media_type: "text",
  media_url: "",
  thumbnail_url: "",
  profile_url: "",
  platform_type: "facebook",
  rating: 5,
  is_verified: false,
  is_featured: false,
  show_on_home: false,
  is_published: true,
  sort_order: 100,
});

function AdminReviews() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"published" | "submissions">("published");

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">آراء عملائنا</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          إدارة الشهادات (فيديو / صور / مكتوبة) ومراجعة الآراء المُرسَلة من الزوار قبل نشرها.
        </p>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("published")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "published"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          الشهادات المنشورة
        </button>
        <button
          onClick={() => setTab("submissions")}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === "submissions"
              ? "border-brand text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          الآراء المُرسَلة
        </button>
      </div>

      {tab === "published" ? <PublishedTab qc={qc} /> : <SubmissionsTab qc={qc} />}
    </div>
  );
}

/* ───────────── Published testimonials ───────────── */
function PublishedTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: rows = [] } = useQuery({
    queryKey: ["admin-testimonials-v2"],
    queryFn: async () => {
      const vids = (await db.from("video_testimonials").select("*").order("display_order")).data ?? [];
      const writ = (await db.from("written_testimonials").select("*").order("display_order")).data ?? [];
      const mappedV = vids.map((v: any) => ({
        id: v.id,
        _table: "video_testimonials",
        name_ar: v.client_name,
        name_en: v.client_name,
        role_ar: v.client_specialty || "",
        title_ar: v.client_title || "",
        media_type: "video",
        media_url: v.video_url,
        thumbnail_url: v.thumbnail_url,
        rating: v.rating,
        is_verified: v.is_verified,
        is_published: v.is_active,
        sort_order: v.display_order,
      }));
      const mappedW = writ.map((w: any) => ({
        id: w.id,
        _table: "written_testimonials",
        name_ar: w.client_name,
        name_en: w.client_name,
        role_ar: w.client_specialty || "",
        title_ar: w.client_title || "",
        excerpt_ar: w.review_text || "",
        full_text_ar: w.review_text || "",
        media_type: "image",
        media_url: w.review_image_url,
        thumbnail_url: w.review_image_url,
        profile_url: w.original_post_url,
        rating: w.rating,
        is_verified: w.is_verified,
        is_published: w.is_active,
        sort_order: w.display_order,
      }));
      return [...mappedV, ...mappedW];
    },
  });

  const [items, setItems] = useState<T[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setItems(rows as T[]);
  }, [rows]);

  const update = (i: number, patch: Partial<T>) =>
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  function addItem() {
    setItems((prev) => [emptyT(), ...prev]);
  }

  async function removeItem(i: number) {
    const it = items[i];
    if (!confirm("هل أنت متأكد من حذف هذه الشهادة؟")) return;
    if (it.id) {
      const table = (it as any)._table || (it.media_type === "video" ? "video_testimonials" : "written_testimonials");
      const { error } = await db.from(table).delete().eq("id", it.id);
      if (error) return toast.error("تعذّر الحذف");
    }
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-testimonials-v2"] });
  }

  async function saveItem(i: number) {
    const it = items[i];
    if (!it.name_ar?.trim()) return toast.error("اسم العميل (عربي) مطلوب");
    if ((it.media_type === "image" || it.media_type === "video") && !it.media_url?.trim())
      return toast.error("رفع صورة/فيديو مطلوب لهذا النوع");
    setSaving(true);
    const isVideo = it.media_type === "video";
    const table = (it as any)._table || (isVideo ? "video_testimonials" : "written_testimonials");
    const payload: any = isVideo
      ? {
          client_name: it.name_ar,
          client_title: it.title_ar || null,
          client_specialty: it.role_ar || null,
          video_url: it.media_url || null,
          thumbnail_url: it.thumbnail_url || null,
          rating: it.rating ?? 5,
          is_verified: !!it.is_verified,
          is_active: it.is_published !== false,
          display_order: it.sort_order ?? 100,
        }
      : {
          client_name: it.name_ar,
          client_title: it.title_ar || null,
          client_specialty: it.role_ar || null,
          review_text: it.full_text_ar || it.excerpt_ar || null,
          review_image_url: it.media_url || null,
          original_post_url: it.profile_url || null,
          button_text: "عرض الرأي الكامل",
          rating: it.rating ?? 5,
          is_verified: !!it.is_verified,
          is_active: it.is_published !== false,
          display_order: it.sort_order ?? 100,
        };
    const res = it.id
      ? await db.from(table).update(payload).eq("id", it.id)
      : await db.from(table).insert(payload);
    setSaving(false);
    if (res.error) return toast.error("تعذّر الحفظ: " + res.error.message);
    toast.success("تم الحفظ");
    qc.invalidateQueries({ queryKey: ["admin-testimonials-v2"] });
    qc.invalidateQueries({ queryKey: ["public-video-testimonials-v2"] });
    qc.invalidateQueries({ queryKey: ["public-written-testimonials-v2"] });
  }

  return (
    <div className="space-y-4">
      <Button onClick={addItem} className="gap-2">
        <Plus className="h-4 w-4" /> إضافة شهادة
      </Button>

      {items.map((it, i) => (
        <div key={it.id ?? `new-${i}`} className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <select
              value={it.media_type}
              onChange={(e) => update(i, { media_type: e.target.value as any })}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="video">فيديو</option>
              <option value="image">صورة</option>
              <option value="text">نص</option>
            </select>
            <div className="flex-1" />
            <IconToggle
              on={it.is_published !== false}
              onIcon={<Eye className="h-4 w-4" />}
              offIcon={<EyeOff className="h-4 w-4" />}
              label={it.is_published !== false ? "ظاهر" : "مخفي"}
              onClick={() => update(i, { is_published: it.is_published === false })}
            />
            <IconToggle
              on={!!it.is_featured}
              onIcon={<Star className="h-4 w-4 fill-current" />}
              offIcon={<Star className="h-4 w-4" />}
              label="مميّز"
              onClick={() => update(i, { is_featured: !it.is_featured })}
            />
            <IconToggle
              on={!!it.show_on_home}
              onIcon={<HomeIcon className="h-4 w-4" />}
              offIcon={<HomeIcon className="h-4 w-4" />}
              label="بالرئيسية"
              onClick={() => update(i, { show_on_home: !it.show_on_home })}
            />
            <IconToggle
              on={!!it.is_verified}
              onIcon={<ShieldCheck className="h-4 w-4" />}
              offIcon={<ShieldCheck className="h-4 w-4" />}
              label="موثّق"
              onClick={() => update(i, { is_verified: !it.is_verified })}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Labeled label="اسم العميل (عربي)">
              <Input value={it.name_ar ?? ""} onChange={(e) => update(i, { name_ar: e.target.value })} />
            </Labeled>
            <Labeled label="Client Name (EN)">
              <Input value={it.name_en ?? ""} onChange={(e) => update(i, { name_en: e.target.value })} />
            </Labeled>
            <Labeled label="الصفة (عربي)">
              <Input value={it.role_ar ?? ""} onChange={(e) => update(i, { role_ar: e.target.value })} />
            </Labeled>
            <Labeled label="Role (EN)">
              <Input value={it.role_en ?? ""} onChange={(e) => update(i, { role_en: e.target.value })} />
            </Labeled>
            <Labeled label="عنوان الشهادة (عربي)">
              <Input value={it.title_ar ?? ""} onChange={(e) => update(i, { title_ar: e.target.value })} />
            </Labeled>
            <Labeled label="Title (EN)">
              <Input value={it.title_en ?? ""} onChange={(e) => update(i, { title_en: e.target.value })} />
            </Labeled>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Labeled label="مقتطف (عربي)">
              <Textarea rows={2} value={it.excerpt_ar ?? ""} onChange={(e) => update(i, { excerpt_ar: e.target.value })} />
            </Labeled>
            <Labeled label="Excerpt (EN)">
              <Textarea rows={2} value={it.excerpt_en ?? ""} onChange={(e) => update(i, { excerpt_en: e.target.value })} />
            </Labeled>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Labeled label="النص الكامل (عربي)">
              <Textarea rows={3} value={it.full_text_ar ?? ""} onChange={(e) => update(i, { full_text_ar: e.target.value })} />
            </Labeled>
            <Labeled label="Full text (EN)">
              <Textarea rows={3} value={it.full_text_en ?? ""} onChange={(e) => update(i, { full_text_en: e.target.value })} />
            </Labeled>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Labeled label={it.media_type === "video" ? "رابط الفيديو / رفع فيديو" : "الصورة"}>
              {it.media_type === "video" ? (
                <VideoUpload
                  value={it.media_url ?? ""}
                  onChange={(url) => update(i, { media_url: url })}
                  folder="testimonials"
                />
              ) : (
                <ImageUpload
                  value={it.media_url ?? ""}
                  onChange={(url) => update(i, { media_url: url, thumbnail_url: url })}
                  folder="testimonials"
                />
              )}
            </Labeled>
            <div className="grid grid-cols-2 gap-3">
              <Labeled label="التقييم (1-5)">
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={it.rating ?? 5}
                  onChange={(e) => update(i, { rating: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="الترتيب">
                <Input
                  type="number"
                  value={it.sort_order ?? 100}
                  onChange={(e) => update(i, { sort_order: Number(e.target.value) })}
                />
              </Labeled>
              <Labeled label="رابط البروفايل">
                <Input dir="ltr" value={it.profile_url ?? ""} onChange={(e) => update(i, { profile_url: e.target.value })} />
              </Labeled>
              <Labeled label="المنصّة">
                <select
                  value={it.platform_type ?? "facebook"}
                  onChange={(e) => update(i, { platform_type: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="facebook">Facebook</option>
                  <option value="instagram">Instagram</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="other">أخرى</option>
                </select>
              </Labeled>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => saveItem(i)} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> حفظ
            </Button>
            {it.profile_url && (
              <Button variant="outline" className="gap-2" onClick={() => openExternal(it.profile_url!)}>
                <ExternalLink className="h-4 w-4" /> فتح البروفايل
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" className="gap-2 text-destructive" onClick={() => removeItem(i)}>
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">لا توجد شهادات بعد.</p>
      )}
    </div>
  );
}

/* ───────────── Submitted reviews (moderation) ───────────── */
function SubmissionsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: subs = [] } = useQuery({
    queryKey: ["admin-pending-reviews"],
    queryFn: async () => {
      const rows =
        (await db
          .from("written_testimonials")
          .select("*")
          .eq("is_active", false)
          .order("created_at", { ascending: false })).data ?? [];
      // خريطة إلى الشكل الذي يتوقعه العرض
      return rows.map((w: any) => ({
        id: w.id,
        full_name: w.client_name,
        job_title: w.client_title,
        review_text: w.review_text,
        review_type: w.review_image_url ? "image" : "text",
        media_url: w.review_image_url,
        profile_url: w.original_post_url,
        status: "pending",
      }));
    },
  });

  async function setStatus(id: string, status: string) {
    // رفض = حذف الرأي المعلّق
    if (status === "rejected") {
      const { error } = await db.from("written_testimonials").delete().eq("id", id);
      if (error) return toast.error("تعذّر الرفض");
      toast.success("تم الرفض");
    }
    qc.invalidateQueries({ queryKey: ["admin-pending-reviews"] });
  }

  async function approveToPublished(s: any) {
    // اعتماد = تفعيل الرأي المعلّق (is_active=true) ليظهر للعامة
    const { error } = await db
      .from("written_testimonials")
      .update({ is_active: true, is_verified: true })
      .eq("id", s.id);
    if (error) return toast.error("تعذّر النشر: " + error.message);
    toast.success("تم نشر الرأي في صفحة آراء العملاء");
    qc.invalidateQueries({ queryKey: ["admin-pending-reviews"] });
    qc.invalidateQueries({ queryKey: ["admin-testimonials-v2"] });
    qc.invalidateQueries({ queryKey: ["public-written-testimonials-v2"] });
  }

  if (!subs.length)
    return <p className="py-8 text-center text-sm text-muted-foreground">لا توجد آراء مُرسَلة.</p>;

  return (
    <div className="space-y-4">
      {subs.map((s: any) => (
        <div key={s.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-semibold">{s.full_name}</div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{s.review_type}</span>
            <StatusBadge status={s.status} />
            <div className="flex-1" />
            {s.profile_url && (
              <button
                onClick={() => openExternal(s.profile_url)}
                className="inline-flex items-center gap-1 text-xs text-brand hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> البروفايل
              </button>
            )}
          </div>
          {s.job_title && <div className="mt-1 text-xs text-muted-foreground">{s.job_title}</div>}
          {s.review_text && <p className="mt-2 text-sm leading-relaxed">{s.review_text}</p>}
          {s.media_url && (
            <a
              href={s.media_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-brand hover:underline"
              dir="ltr"
            >
              {s.media_url}
            </a>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" className="gap-1" onClick={() => approveToPublished(s)}>
              <Check className="h-4 w-4" /> قبول ونشر
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setStatus(s.id, "rejected")}>
              <X className="h-4 w-4" /> رفض
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1 text-destructive"
              onClick={async () => {
                if (!confirm("حذف هذا الطلب نهائيًا؟")) return;
                await db.from("written_testimonials").delete().eq("id", s.id);
                qc.invalidateQueries({ queryKey: ["admin-testimonial-submissions"] });
              }}
            >
              <Trash2 className="h-4 w-4" /> حذف
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-accent/20 text-accent-foreground",
    approved: "bg-brand/15 text-brand",
    rejected: "bg-destructive/15 text-destructive",
  };
  const label: Record<string, string> = {
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted"}`}>
      {label[status] ?? status}
    </span>
  );
}

function IconToggle({
  on,
  onIcon,
  offIcon,
  label,
  onClick,
}: {
  on: boolean;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        on
          ? "border-brand/40 bg-brand/10 text-brand"
          : "border-border bg-background text-muted-foreground hover:text-foreground"
      }`}
    >
      {on ? onIcon : offIcon} {label}
    </button>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
