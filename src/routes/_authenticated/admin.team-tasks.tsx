import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Filter, Plus, Save, X, ClipboardList } from "lucide-react";
import { requireOperationsAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ROLES, ALL_ROLES, PRIORITIES, roleLabel, type RoleKey } from "@/lib/roles";
import { createNotification } from "@/components/NotificationsBell";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/team-tasks")({
  beforeLoad: requireOperationsAdmin,
  component: TeamTasksAdmin,
});

function TeamTasksAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();

  // فلاتر
  const [fRole, setFRole] = useState("all");
  const [fMember, setFMember] = useState("all");
  const [fClient, setFClient] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [showAssign, setShowAssign] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["all-team-tasks"],
    queryFn: async () =>
      (
        await db
          .from("team_work_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000)
      ).data ?? [],
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["team-profiles-for-tasks"],
    queryFn: async () =>
      (await db.from("team_profiles").select("user_id,name_ar,roles").order("name_ar")).data ?? [],
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-admin-tasks"],
    queryFn: async () =>
      (await db.from("clients").select("id,doctor_name,clinic_name").order("doctor_name"))
        .data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-admin-tasks"],
    queryFn: async () => (await db.from("mdink_projects").select("id,project_name")).data ?? [],
  });

  const members = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) if (t.user_id) map.set(t.user_id, t.member_name || t.user_id);
    for (const p of profiles) if (p.user_id) map.set(p.user_id, p.name_ar || p.user_id);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [tasks, profiles]);

  const filtered = tasks.filter((t: any) => {
    if (fRole !== "all" && t.role_used !== fRole) return false;
    if (fMember !== "all" && t.user_id !== fMember) return false;
    if (fClient !== "all" && t.client_id !== fClient) return false;
    if (fStatus !== "all" && t.status !== fStatus) return false;
    if (fFrom && (t.work_date || "") < fFrom) return false;
    if (fTo && (t.work_date || "") > fTo) return false;
    return true;
  });

  function clientName(id: string) {
    const c = clients.find((x: any) => x.id === id);
    return c ? c.doctor_name : "";
  }

  function exportFiltered() {
    exportTableAsExcel(
      "mdink-team-tasks.xls",
      [
        "عضو الفريق",
        "الدور",
        "العميل/الطبيب",
        "المشروع",
        "العنوان",
        "نوع المهمة",
        "الحالة",
        "الأولوية",
        "تاريخ العمل",
        "تاريخ التسليم",
        "الوقت المستغرق",
        "ملاحظات",
      ],
      filtered.map((t: any) => {
        const proj = projects.find((p: any) => p.id === t.project_id);
        const roleDef = (ROLES as Record<string, any>)[t.role_used];
        return [
          t.member_name,
          roleLabel(t.role_used, "ar"),
          t.doctor_name || clientName(t.client_id),
          proj?.project_name ?? "",
          t.title,
          roleDef?.taskTypes.find((x: any) => x.value === t.task_type)?.ar ?? t.task_type,
          roleDef?.statuses.find((s: any) => s.value === t.status)?.ar ?? t.status,
          t.priority,
          t.work_date,
          t.due_date,
          t.time_spent,
          t.notes,
        ];
      }),
    );
  }

  // إحصائيات
  const stats = {
    total: filtered.length,
    inProgress: filtered.filter((t: any) =>
      ["in_progress", "pending", "not_started"].includes(t.status),
    ).length,
    done: filtered.filter((t: any) => ["completed", "delivered", "approved"].includes(t.status))
      .length,
    overdue: filtered.filter(
      (t: any) =>
        t.due_date &&
        t.due_date < new Date().toISOString().slice(0, 10) &&
        !["completed", "delivered", "approved"].includes(t.status),
    ).length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">مهام الفريق</h1>
          <p className="mt-1 text-muted-foreground">
            متابعة كل أعمال الفريق، الفلترة، التكليف، والتصدير.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAssign((s) => !s)}>
            <Plus className="ml-2 h-4 w-4" /> تكليف مهمة
          </Button>
          <Button variant="outline" onClick={exportFiltered} disabled={!filtered.length}>
            <Download className="ml-2 h-4 w-4" /> تصدير Excel
          </Button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="إجمالي المهام" value={stats.total} />
        <Stat label="قيد التنفيذ" value={stats.inProgress} color="text-amber-500" />
        <Stat label="مكتملة" value={stats.done} color="text-emerald-500" />
        <Stat label="متأخرة" value={stats.overdue} color="text-destructive" />
      </div>

      {/* Assign task */}
      {showAssign ? (
        <AssignTask
          members={members}
          clients={clients}
          projects={projects}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["all-team-tasks"] });
            setShowAssign(false);
          }}
        />
      ) : null}

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Filter className="h-4 w-4" /> فلترة
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <FilterSelect
            label="الدور"
            value={fRole}
            onChange={setFRole}
            options={[
              { value: "all", label: "كل الأدوار" },
              ...ALL_ROLES.map((r) => ({ value: r.key, label: r.label_ar })),
            ]}
          />
          <FilterSelect
            label="العضو"
            value={fMember}
            onChange={setFMember}
            options={[
              { value: "all", label: "الكل" },
              ...members.map((m) => ({ value: m.id, label: m.name })),
            ]}
          />
          <FilterSelect
            label="العميل"
            value={fClient}
            onChange={setFClient}
            options={[
              { value: "all", label: "الكل" },
              ...clients.map((c: any) => ({ value: c.id, label: c.doctor_name })),
            ]}
          />
          <FilterSelect
            label="الحالة"
            value={fStatus}
            onChange={setFStatus}
            options={[
              { value: "all", label: "الكل" },
              { value: "in_progress", label: "قيد التنفيذ" },
              { value: "completed", label: "مكتمل" },
              { value: "delivered", label: "تم التسليم" },
              { value: "revision_required", label: "تحتاج تعديل" },
            ]}
          />
          <div>
            <Label className="text-xs">من تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="mt-1"
              value={fFrom}
              onChange={(e) => setFFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs">إلى تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="mt-1"
              value={fTo}
              onChange={(e) => setFTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tasks table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right">العضو / الدور</th>
                <th className="px-4 py-3 text-right">المهمة</th>
                <th className="px-4 py-3 text-right">العميل</th>
                <th className="px-4 py-3 text-right">الحالة</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => {
                const roleDef = (ROLES as Record<string, any>)[t.role_used];
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <div className="font-medium">{t.member_name}</div>
                      <div className="text-xs text-brand">{roleLabel(t.role_used, "ar")}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {t.title ||
                          roleDef?.taskTypes.find((x: any) => x.value === t.task_type)?.ar ||
                          t.task_type}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {t.task_description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {t.doctor_name || clientName(t.client_id) || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {roleDef?.statuses.find((s: any) => s.value === t.status)?.ar ?? t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{t.work_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <div className="p-10 text-center text-muted-foreground">لا توجد مهام مطابقة للفلترة.</div>
        )}
      </div>
    </div>
  );
}

function AssignTask({
  members,
  clients,
  projects,
  onClose,
  onDone,
}: {
  members: { id: string; name: string }[];
  clients: any[];
  projects: any[];
  onClose: () => void;
  onDone: () => void;
}) {
  const db = supabase as any;
  const [form, setForm] = useState({
    user_id: "",
    role_used: "operations" as RoleKey,
    title: "",
    description: "",
    client_id: "",
    project_id: "",
    priority: "normal",
    due_date: "",
  });

  async function assign() {
    if (!form.user_id) return toast.error("اختر عضو الفريق");
    if (!form.title.trim()) return toast.error("اكتب عنوان المهمة");
    const member = members.find((m) => m.id === form.user_id);
    const { data: u } = await supabase.auth.getUser();
    const roleDef = ROLES[form.role_used];
    const { error } = await db.from("team_work_logs").insert({
      user_id: form.user_id,
      created_by: u.user?.id,
      member_name: member?.name ?? null,
      role_title: roleLabel(form.role_used, "ar"),
      role_used: form.role_used,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      title: form.title.trim(),
      task_type: roleDef.taskTypes[0]?.value ?? "",
      task_description: form.description.trim() || form.title.trim(),
      status: "not_started",
      priority: form.priority,
      due_date: form.due_date || null,
      work_date: new Date().toISOString().slice(0, 10),
    });
    if (error) return toast.error(error.message);
    // أرسل إشعار للعضو المكلّف
    await createNotification({
      userId: form.user_id,
      title: "مهمة جديدة مكلّف بها",
      body: `${roleLabel(form.role_used, "ar")}: ${form.title.trim()}`,
      link: "/dashboard/tasks",
      type: "task",
    });
    toast.success("تم تكليف العضو بالمهمة ✓");
    onDone();
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">تكليف مهمة جديدة</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <Label>عضو الفريق</Label>
          <select
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— اختر —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>الدور</Label>
          <select
            value={form.role_used}
            onChange={(e) => setForm({ ...form, role_used: e.target.value as RoleKey })}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {ALL_ROLES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label_ar}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <Label>عنوان المهمة</Label>
          <Input
            className="mt-1.5"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>الوصف</Label>
          <Textarea
            className="mt-1.5"
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <Label>العميل</Label>
          <select
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— لا يوجد —</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.doctor_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>المشروع</Label>
          <select
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">— لا يوجد —</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>الأولوية</Label>
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>تاريخ التسليم</Label>
          <Input
            type="date"
            dir="ltr"
            className="mt-1.5"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
      </div>
      <Button onClick={assign} className="mt-4 gradient-hero text-brand-foreground">
        <Save className="ml-2 h-4 w-4" /> تكليف
      </Button>
    </div>
  );
}

function Stat({
  label,
  value,
  color = "text-foreground",
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <ClipboardList className={`h-5 w-5 ${color}`} />
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
