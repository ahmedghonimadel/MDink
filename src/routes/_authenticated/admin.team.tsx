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
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/_authenticated/admin/team")({
  beforeLoad: requireSuperAdmin,
  component: AdminUsers,
});

const addSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(72),
  role: z.enum(["super_admin", "website_admin", "operations_admin", "team_member", "viewer"]),
});

type Role = z.infer<typeof addSchema>["role"];
type Row = {
  id: string;
  user_id: string;
  role: string;
  email: string | null;
  full_name: string | null;
};

const roleLabels: Record<Role, string> = {
  super_admin: "Super Admin",
  website_admin: "Website Admin",
  operations_admin: "Operations Admin",
  team_member: "Team Member",
  viewer: "Viewer",
};

function AdminUsers() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "team_member" as Role,
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
        full_name: r.email,
      }));
    },
  });

  async function addUser() {
    const parsed = addSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "بيانات غير صحيحة");
      return;
    }
    const { data: fnData, error } = await supabase.functions.invoke("create-admin-user", {
      body: parsed.data,
    });
    if (error) {
      // حاول استخراج رسالة الخطأ الحقيقية من الـ Edge Function
      let detail = error.message;
      try {
        const ctx = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) detail = body.error;
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
    toast.success("تم إنشاء المستخدم وإرسال بياناته للإدارة");
    await logAudit({
      action: "create",
      entity: "user",
      entityId: parsed.data.email,
      details: { role: parsed.data.role },
    });
    setForm({ full_name: "", email: "", password: "", role: "team_member" });
    qc.invalidateQueries({ queryKey: ["admin-users-list"] });
  }

  async function removeRole(row: Row) {
    if (row.email && SUPER_ADMIN_EMAILS.includes(row.email.toLowerCase() as any)) {
      toast.error("لا يمكن حذف أو تخفيض حساب شيماء أو تسنيم");
      return;
    }
    if (!confirm("إزالة هذه الصلاحية؟")) return;
    const { error } = await (supabase as any).from("admin_users").delete().eq("id", row.id);
    if (error) toast.error(error.message);
    else {
      toast.success("تمت إزالة الصلاحية");
      await logAudit({
        action: "role_change",
        entity: "user_role",
        entityId: row.email ?? row.id,
        details: { removed_role: row.role },
      });
      qc.invalidateQueries({ queryKey: ["admin-users-list"] });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة المستخدمين والصلاحيات</h1>
        <p className="mt-1 text-muted-foreground">
          لا يوجد تسجيل حساب عام. الإدارة فقط تنشئ المستخدم وتحدد صلاحياته.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">إنشاء مستخدم إداري</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field
            label="الاسم"
            value={form.full_name}
            onChange={(v) => setForm({ ...form, full_name: v })}
          />
          <Field
            label="البريد"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <Field
            label="كلمة المرور"
            type="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
          />
          <div>
            <Label>الصلاحية</Label>
            <select
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            >
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={addUser} className="mt-6 bg-brand text-brand-foreground">
            <UserPlus className="ml-2 h-4 w-4" /> إنشاء
          </Button>
        </div>
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
                    <div className="font-bold">{row.full_name ?? row.email ?? row.user_id}</div>
                    <div className="text-xs text-muted-foreground">{row.email}</div>
                  </div>
                  <span className="rounded-full bg-brand/10 px-2 py-1 text-[11px] font-semibold text-brand">
                    {row.role}
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
