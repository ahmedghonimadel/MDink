import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Shield, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireSuperAdmin, SUPER_ADMIN_EMAILS } from "@/lib/admin";
import { roleLabel } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: requireSuperAdmin,
  component: AdminUsers,
});

// الأدوار المتاحة للاختيار (السوبر أدمن غير متاح — مثبّت للإيميلين المحميّين فقط)
const ROLE_GROUPS = [
  {
    group: "الإدارة",
    items: [
      { value: "website_admin", label: "مدير الموقع (يعاين ويعدّل الموقع)" },
      { value: "accountant", label: "محاسب (المدفوعات فقط)" },
    ],
  },
  {
    group: "أعضاء الفريق (إشعارات مهام + تسجيل عمل فقط)",
    items: [
      { value: "content_writer", label: "كاتب محتوى" },
      { value: "video_editor", label: "محرر فيديو" },
      { value: "graphic_designer", label: "مصمم جرافيك" },
      { value: "photographer", label: "مصور" },
      { value: "moderator", label: "مودريتور" },
      { value: "medical_reviewer", label: "مراجع طبي" },
      { value: "web_developer", label: "مطور ويب" },
      { value: "custom", label: "دور مخصص…" },
    ],
  },
] as const;

const ROLE_VALUES = ROLE_GROUPS.flatMap((g) => g.items.map((i) => i.value)) as [
  string,
  ...string[],
];

const addSchema = z.object({
  full_name: z.string().trim().min(2, "الاسم مطلوب").max(120),
  email: z.string().trim().email("بريد غير صحيح").max(160),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(72),
  role: z.enum(ROLE_VALUES),
  custom_role: z.string().trim().max(60).optional(),
});

type Row = { id: string; user_id: string; role: string; email: string | null };

// عرض اسم الصلاحية من admin_users.role
const ADMIN_ROLE_LABEL: Record<string, string> = {
  admin: "سوبر أدمن",
  editor: "مدير الموقع",
  accountant: "محاسب",
  viewer: "عضو فريق",
};

function AdminUsers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "content_writer" as string,
    custom_role: "",
  });

  const { data: rows = [], isLoading } = useQuery<Row[]>({
    queryKey: ["admin-users-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("admin_users")
        .select("id,user_id,email,role,is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        role: r.role,
        email: r.email,
      }));
    },
  });

  // أدوار الفريق الوظيفية للعرض (كاتب محتوى/مصور…) بجانب صلاحية «عضو فريق»
  const { data: profiles = [] } = useQuery({
    queryKey: ["team-profiles-roles"],
    queryFn: async () =>
      (await (supabase as any).from("team_profiles").select("user_id,roles")).data ?? [],
  });
  const jobRoleOf = (userId: string): string | null => {
    const p = profiles.find((x: any) => x.user_id === userId);
    const key = Array.isArray(p?.roles) ? p.roles[0] : null;
    return key ? roleLabel(key, "ar") : null;
  };

  function roleDisplay(row: Row): string {
    if (row.email && SUPER_ADMIN_EMAILS.includes(row.email.toLowerCase() as any))
      return "سوبر أدمن";
    if (row.role === "viewer") return jobRoleOf(row.user_id) || "عضو فريق";
    return ADMIN_ROLE_LABEL[row.role] ?? row.role;
  }

  async function addUser() {
    const parsed = addSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    if (form.role === "custom" && form.custom_role.trim().length < 2) {
      toast.error("اكتب اسم الدور المخصص");
      return;
    }
    const { data: fnData, error } = await supabase.functions.invoke("create-admin-user", {
      body: parsed.data,
    });
    if (error) {
      let detail = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const b = await ctx.json();
          if (b?.error) detail = b.error;
        }
      } catch {
        /* تجاهل */
      }
      toast.error(`فشل الإنشاء: ${detail}`);
      return;
    }
    if (fnData?.error) {
      toast.error(fnData.error);
      return;
    }
    toast.success("تم إنشاء المستخدم وتحديد صلاحيته ✓");
    await logAudit({
      action: "create",
      entity: "user",
      entityId: parsed.data.email,
      details: { role: parsed.data.role, custom_role: parsed.data.custom_role || null },
    });
    setForm({ full_name: "", email: "", password: "", role: "content_writer", custom_role: "" });
    qc.invalidateQueries({ queryKey: ["admin-users-list"] });
  }

  async function removeRole(row: Row) {
    if (row.email && SUPER_ADMIN_EMAILS.includes(row.email.toLowerCase() as any)) {
      toast.error("لا يمكن حذف أو تخفيض حساب شيماء أو تسنيم");
      return;
    }
    if (!confirm("إزالة هذا المستخدم وصلاحيته؟")) return;
    const { error } = await (supabase as any).from("admin_users").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تمت الإزالة");
    await logAudit({
      action: "role_change",
      entity: "user_role",
      entityId: row.email ?? row.id,
      details: { removed_role: row.role },
    });
    qc.invalidateQueries({ queryKey: ["admin-users-list"] });
  }

  const isCustom = form.role === "custom";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة المستخدمين والصلاحيات</h1>
        <p className="mt-1 text-muted-foreground">
          لا يوجد تسجيل حساب عام. الإدارة فقط تُنشئ المستخدم وتحدد صلاحيته. دور «سوبر أدمن» مثبّت
          للإدارة العليا ولا يُمنح لأحد.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">إنشاء مستخدم</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field
            label="الاسم"
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <Field label="البريد" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Field
            label="كلمة المرور"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />
          <div>
            <Label>الصلاحية / الدور</Label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.items.map((i) => (
                    <option key={i.value} value={i.value}>
                      {i.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {isCustom ? (
            <Field
              label="اسم الدور المخصص"
              value={form.custom_role}
              onChange={(v) => setForm({ ...form, custom_role: v })}
            />
          ) : (
            <div className="hidden xl:block" />
          )}
        </div>
        <Button onClick={addUser} className="mt-4 bg-brand text-brand-foreground">
          <UserPlus className="ml-2 h-4 w-4" /> إنشاء
        </Button>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">المستخدمون الحاليون</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">جاري التحميل...</p>
        ) : (
          <div className="mt-4 grid gap-3">
            {rows.map((row) => {
              const protectedAccount =
                !!row.email && SUPER_ADMIN_EMAILS.includes(row.email.toLowerCase() as any);
              return (
                <article
                  key={row.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-background/50 p-3"
                >
                  <Shield className="h-5 w-5 text-brand" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">{row.email ?? row.user_id}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
                    {roleDisplay(row)}
                  </span>
                  {protectedAccount ? (
                    <span className="rounded-full bg-accent/20 px-2 py-1 text-[11px] font-semibold">
                      محمي
                    </span>
                  ) : (
                    <Button size="icon" variant="ghost" onClick={() => removeRole(row)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        className="mt-1.5"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
