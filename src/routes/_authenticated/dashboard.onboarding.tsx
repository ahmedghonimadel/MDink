import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Check } from "lucide-react";
import { requireDashboard, SUPER_ADMIN_EMAILS } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { ALL_ROLES, type RoleKey } from "@/lib/roles";
import { pickIcon } from "@/lib/cms";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/onboarding")({
  beforeLoad: requireDashboard,
  loader: ({ context }) => context,
  component: Onboarding,
});

function Onboarding() {
  const db = supabase as any;
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { locale } = useLocale();
  const en = locale === "en";
  const [saving, setSaving] = useState(false);

  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: existing } = useQuery({
    queryKey: ["my-team-profile"],
    queryFn: async () =>
      (
        await db
          .from("team_profiles")
          .select("*")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()
      ).data,
  });

  const [name, setName] = useState("");
  const [displayTitle, setDisplayTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [roles, setRoles] = useState<RoleKey[]>([]);
  const [primaryRole, setPrimaryRole] = useState<string>("");
  const [showOneOnly, setShowOneOnly] = useState(false);
  const [wantPublic, setWantPublic] = useState(false);
  const [isFounder, setIsFounder] = useState(false);

  // هل المستخدم الحالي أدمن أساسي (شيماء/تسنيم)؟ — يظهر له خيار "مؤسِّسة"
  const isCoreAdmin = SUPER_ADMIN_EMAILS.includes((userData?.email || "").toLowerCase());

  // املأ النموذج لو فيه بروفايل سابق
  useEffect(() => {
    if (existing) {
      setName(existing.name_ar || existing.name_en || "");
      setDisplayTitle(existing.display_title || "");
      setImageUrl(existing.image_url || "");
      setRoles(Array.isArray(existing.roles) ? existing.roles : []);
      setPrimaryRole(existing.primary_display_role || "");
      setShowOneOnly(!!existing.primary_display_role);
      setWantPublic(!!existing.show_in_public_team);
      setIsFounder(!!existing.is_founder);
    }
  }, [existing]);

  function toggleRole(key: RoleKey) {
    setRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function save() {
    if (!name.trim()) return toast.error(en ? "Enter your name" : "اكتب اسمك");
    if (!roles.length)
      return toast.error(en ? "Pick at least one role" : "اختر دورًا واحدًا على الأقل");
    setSaving(true);
    const payload = {
      user_id: userData?.id,
      name_ar: name.trim(),
      name_en: name.trim(),
      display_title: displayTitle.trim() || null,
      image_url: imageUrl || null,
      email: userData?.email ?? null,
      roles,
      primary_display_role: showOneOnly && primaryRole ? primaryRole : null,
      show_in_public_team: wantPublic,
      is_founder: isCoreAdmin ? isFounder : false,
      account_status: "active",
    };
    const { error } = existing
      ? await db.from("team_profiles").update(payload).eq("user_id", userData?.id)
      : await db.from("team_profiles").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(en ? "Saved! Welcome 🎉" : "تم الحفظ! أهلًا بك 🎉");
    qc.invalidateQueries({ queryKey: ["my-team-profile"] });
    navigate({ to: "/dashboard/tasks" });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold">
          {en ? "Complete your profile" : "أكمل بياناتك المهنية"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {en
            ? "Just your name, photo, and your role(s). This appears on your team card."
            : "اسمك وصورتك ودورك فقط. ده هيظهر في بطاقتك في فريق العمل."}
        </p>
      </header>

      {/* الاسم والصورة */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="grid gap-6 sm:grid-cols-[160px_1fr]">
          <div>
            <Label className="mb-2 block">{en ? "Your photo" : "صورتك"}</Label>
            <ImageUpload value={imageUrl} onChange={setImageUrl} />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{en ? "Your name" : "اسمك"}</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={en ? "e.g. Ahmed Mohamed" : "مثال: أحمد محمد"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display_title">
                {en ? "Title under your name (optional)" : "المسمّى تحت اسمك (اختياري)"}
              </Label>
              <Input
                id="display_title"
                value={displayTitle}
                onChange={(e) => setDisplayTitle(e.target.value)}
                placeholder={en ? "e.g. Content Writer" : "مثال: كاتبة محتوى"}
              />
              <p className="text-xs text-muted-foreground">
                {en
                  ? "Shown on your public card instead of your role. Leave empty to show your role."
                  : "يظهر في بطاقتك العامة بدل الدور. اتركه فارغًا لعرض دورك."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* اختيار الأدوار */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <Label className="mb-1 block text-base font-semibold">
          {en ? "Your role(s)" : "دورك / أدوارك"}
        </Label>
        <p className="mb-4 text-sm text-muted-foreground">
          {en ? "Select all that apply." : "اختر كل ما ينطبق عليك."}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ALL_ROLES.map((role) => {
            const Icon = pickIcon(role.icon);
            const active = roles.includes(role.key);
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => toggleRole(role.key)}
                className={`flex items-center gap-2 rounded-xl border-2 p-3 text-right text-sm transition-all ${
                  active
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border hover:border-brand/40"
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{en ? role.label_en : role.label_ar}</span>
                {active ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* لو أكتر من دور: اختياري إظهار دور واحد بس */}
      {roles.length > 1 ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={showOneOnly}
              onChange={(e) => setShowOneOnly(e.target.checked)}
              className="h-4 w-4"
            />
            <span className="text-sm font-medium">
              {en ? "Show only one role on my public card" : "إظهار دور واحد فقط في بطاقتي العامة"}
            </span>
          </label>
          {showOneOnly ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {roles.map((rk) => {
                const role = ALL_ROLES.find((r) => r.key === rk)!;
                return (
                  <button
                    key={rk}
                    type="button"
                    onClick={() => setPrimaryRole(rk)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      primaryRole === rk
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border hover:border-brand/40"
                    }`}
                  >
                    {en ? role.label_en : role.label_ar}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* طلب الظهور في صفحة فريق العمل */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={wantPublic}
            onChange={(e) => setWantPublic(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <div>
            <span className="text-sm font-medium">
              {en
                ? "Show my card on the public team page"
                : "إظهار بطاقتي في صفحة فريق العمل العامة"}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {en ? "Your card appears after admin approval." : "بطاقتك هتظهر بعد موافقة الإدارة."}
            </p>
          </div>
        </label>
      </div>

      {/* خيار "مؤسِّسة" — يظهر فقط للأدمن الأساسي (شيماء/تسنيم) */}
      {isCoreAdmin ? (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-6">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isFounder}
              onChange={(e) => setIsFounder(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <div>
              <span className="text-sm font-bold text-brand">
                ✦ {en ? "I am the founder / owner of MDink" : "أنا المؤسِّسة وصاحبة MDink"}
              </span>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {en
                  ? "Your card shows first with a special founder badge."
                  : "بطاقتك هتظهر الأولى وعليها شارة مميزة كمؤسِّسة. (الخيار ده يظهر لكِ فقط)"}
              </p>
            </div>
          </label>
        </div>
      ) : null}

      <Button
        onClick={save}
        disabled={saving}
        size="lg"
        className="w-full gradient-hero text-brand-foreground shadow-brand"
      >
        <Save className="ml-2 h-5 w-5" />
        {saving ? (en ? "Saving..." : "جاري الحفظ...") : en ? "Save & continue" : "حفظ ومتابعة"}
      </Button>
    </div>
  );
}
