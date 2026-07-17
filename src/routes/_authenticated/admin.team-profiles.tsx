import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Eye, EyeOff, Ban, UserCheck, Download, Pencil, Save, X, Check } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import { ALL_ROLES, roleLabel, type RoleKey } from "@/lib/roles";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/team-profiles")({
  beforeLoad: requireSuperAdmin,
  component: TeamProfilesAdmin,
});

const STATUS_LABEL: Record<string, string> = {
  pending_profile: "بانتظار البروفايل",
  active: "نشط",
  suspended: "موقوف",
};

function TeamProfilesAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-team-profiles"],
    queryFn: async () =>
      (await db.from("team_profiles").select("*").order("created_at", { ascending: false })).data ??
      [],
  });

  async function approve(id: string, approved: boolean) {
    const { error } = await db
      .from("team_profiles")
      .update({ public_approved: approved })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-team-profiles"] });
    qc.invalidateQueries({ queryKey: ["public-team-members"] });
    toast.success(approved ? "تمت الموافقة على الظهور العام ✓" : "تم إلغاء الظهور العام");
  }

  async function setStatus(id: string, status: string) {
    const { error } = await db
      .from("team_profiles")
      .update({ account_status: status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-team-profiles"] });
    toast.success("تم تحديث حالة الحساب");
  }

  async function setOrder(id: string, sort_order: number) {
    const { error } = await db.from("team_profiles").update({ sort_order }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-team-profiles"] });
    qc.invalidateQueries({ queryKey: ["public-team-members"] });
  }

  // تعديل بيانات البروفايل من الأدمن
  const [editingId, setEditingId] = useState<string | null>(null);
  const [ef, setEf] = useState<any>({});
  function startEdit(p: any) {
    setEditingId(p.id);
    setEf({
      name_ar: p.name_ar || "",
      display_title: p.display_title || "",
      image_url: p.image_url || "",
      bio_ar: p.bio_ar || "",
      roles: Array.isArray(p.roles) ? p.roles : [],
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEf({});
  }
  function toggleEfRole(k: RoleKey) {
    setEf((s: any) => ({
      ...s,
      roles: s.roles.includes(k) ? s.roles.filter((r: string) => r !== k) : [...s.roles, k],
    }));
  }
  async function saveEdit(id: string) {
    const { error } = await db
      .from("team_profiles")
      .update({
        name_ar: ef.name_ar?.trim() || null,
        name_en: ef.name_ar?.trim() || null,
        display_title: ef.display_title?.trim() || null,
        image_url: ef.image_url || null,
        bio_ar: ef.bio_ar?.trim() || null,
        roles: ef.roles,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ التعديل ✓");
    cancelEdit();
    qc.invalidateQueries({ queryKey: ["admin-team-profiles"] });
    qc.invalidateQueries({ queryKey: ["public-team-v4"] });
  }

  function exportProfiles() {
    exportTableAsExcel(
      "mdink-team-profiles.xls",
      [
        "الاسم",
        "البريد",
        "الهاتف",
        "الأدوار",
        "التخصص الطبي",
        "سنوات الخبرة",
        "حالة الحساب",
        "ظهور عام",
        "موافق عليه",
      ],
      profiles.map((p: any) => [
        p.name_ar,
        p.email,
        p.phone,
        (p.roles || []).map((r: string) => roleLabel(r, "ar")).join(", "),
        p.medical_specialty,
        p.years_experience,
        STATUS_LABEL[p.account_status] ?? p.account_status,
        p.show_in_public_team ? "نعم" : "لا",
        p.public_approved ? "نعم" : "لا",
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">بروفايلات الفريق</h1>
          <p className="mt-1 text-muted-foreground">
            الموافقة على ظهور الأعضاء في الفريق العام وإدارة حالة الحسابات.
          </p>
        </div>
        <Button variant="outline" onClick={exportProfiles} disabled={!profiles.length}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      <div className="grid gap-4">
        {profiles.map((p: any) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt={p.name_ar}
                    loading="lazy"
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold">
                    {(p.name_ar || "?")[0]}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-bold">
                    {p.name_ar}{" "}
                    {p.name_en ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        · {p.name_en}
                      </span>
                    ) : null}
                  </h2>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {[p.email, p.phone].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(p.roles || []).map((r: string) => (
                      <span
                        key={r}
                        className="rounded-full bg-accent/20 px-2 py-0.5 text-[11px] font-medium"
                      >
                        {roleLabel(r, "ar")}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${p.account_status === "active" ? "bg-emerald-500/15 text-emerald-600" : p.account_status === "suspended" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"}`}
              >
                {STATUS_LABEL[p.account_status] ?? p.account_status}
              </span>
            </div>

            {editingId === p.id ? (
              <div className="mt-4 grid gap-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
                <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
                  <div>
                    <Label className="mb-1 block text-xs">الصورة</Label>
                    <ImageUpload
                      label=""
                      value={ef.image_url}
                      onChange={(v) => setEf((s: any) => ({ ...s, image_url: v }))}
                      folder="team"
                    />
                  </div>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">الاسم</Label>
                      <Input
                        className="mt-1"
                        value={ef.name_ar}
                        onChange={(e) => setEf((s: any) => ({ ...s, name_ar: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">المسمّى تحت الاسم (اختياري — يحل محل الدور/المؤسِّس)</Label>
                      <Input
                        className="mt-1"
                        placeholder="مثال: كاتبة محتوى"
                        value={ef.display_title}
                        onChange={(e) => setEf((s: any) => ({ ...s, display_title: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">الأدوار</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {ALL_ROLES.map((r) => {
                      const on = ef.roles?.includes(r.key);
                      return (
                        <button
                          key={r.key}
                          type="button"
                          onClick={() => toggleEfRole(r.key)}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${on ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/40"}`}
                        >
                          {on ? <Check className="h-3 w-3" /> : null} {r.label_ar}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">نبذة (اختياري)</Label>
                  <Textarea
                    className="mt-1"
                    rows={2}
                    value={ef.bio_ar}
                    onChange={(e) => setEf((s: any) => ({ ...s, bio_ar: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => saveEdit(p.id)}
                    className="gradient-hero text-brand-foreground"
                  >
                    <Save className="ml-1 h-4 w-4" /> حفظ
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="ml-1 h-4 w-4" /> إلغاء
                  </Button>
                </div>
              </div>
            ) : null}

            {p.medical_specialty || p.years_experience || p.bio_ar ? (
              <div className="mt-3 grid gap-1 text-sm text-muted-foreground">
                {p.medical_specialty ? (
                  <p>
                    <b>التخصص الطبي:</b> {p.medical_specialty}
                  </p>
                ) : null}
                {p.years_experience ? (
                  <p>
                    <b>سنوات الخبرة:</b> {p.years_experience}
                  </p>
                ) : null}
                {p.bio_ar ? <p>{p.bio_ar}</p> : null}
              </div>
            ) : null}

            {Array.isArray(p.skills) && p.skills.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.skills.map((s: string) => (
                  <span
                    key={s}
                    className="rounded-full border border-border px-2 py-0.5 text-[11px]"
                  >
                    {s}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
              <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                <Pencil className="ml-1 h-4 w-4" /> تعديل
              </Button>
              {p.cv_url ? (
                <Button asChild size="sm" variant="outline">
                  <a href={p.cv_url} target="_blank" rel="noreferrer">
                    السيرة الذاتية
                  </a>
                </Button>
              ) : null}

              {/* الظهور العام */}
              {p.show_in_public_team ? (
                p.public_approved ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => approve(p.id, false)}>
                      <EyeOff className="ml-1 h-4 w-4" /> إلغاء الظهور العام
                    </Button>
                    {/* ترتيب البطاقة في الفريق */}
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      الترتيب:
                      <input
                        type="number"
                        defaultValue={p.sort_order ?? 0}
                        onBlur={(e) => setOrder(p.id, Number(e.target.value) || 0)}
                        className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm"
                        title="رقم أصغر = يظهر أولًا"
                      />
                    </label>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="bg-brand text-brand-foreground"
                    onClick={() => approve(p.id, true)}
                  >
                    <Eye className="ml-1 h-4 w-4" /> الموافقة على الظهور العام
                  </Button>
                )
              ) : (
                <span className="text-xs text-muted-foreground">لم يطلب الظهور العام</span>
              )}

              {/* حالة الحساب */}
              <div className="mr-auto flex gap-2">
                {p.account_status !== "active" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "active")}>
                    <UserCheck className="ml-1 h-4 w-4" /> تفعيل
                  </Button>
                ) : null}
                {p.account_status !== "suspended" ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setStatus(p.id, "suspended")}
                  >
                    <Ban className="ml-1 h-4 w-4" /> إيقاف
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!profiles.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا توجد بروفايلات فريق بعد. ستظهر هنا بعد أن يكمل الأعضاء بياناتهم.
          </div>
        )}
      </div>
    </div>
  );
}
