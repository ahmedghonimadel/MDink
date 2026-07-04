import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2, Download, Layers } from "lucide-react";
import { requireDashboard } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageUpload } from "@/components/ImageUpload";
import { ROLES, ALL_ROLES, PRIORITIES, PLATFORMS, type RoleKey, roleLabel } from "@/lib/roles";
import { exportTableAsExcel } from "@/lib/export";
import { useLocale } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard/tasks")({
  beforeLoad: requireDashboard,
  component: TasksDashboard,
});

// الحقول المخصصة لكل دور (تتخزن في role_data jsonb)
const ROLE_FIELDS: Record<
  string,
  { key: string; ar: string; en: string; type?: "text" | "number" | "platform" | "url" }[]
> = {
  video_editor: [
    { key: "platform", ar: "المنصة", en: "Platform", type: "platform" },
    { key: "duration", ar: "المدة", en: "Duration" },
    { key: "versions", ar: "عدد النسخات", en: "Versions", type: "number" },
    { key: "raw_link", ar: "رابط الملفات الخام", en: "Raw footage link", type: "url" },
    { key: "final_link", ar: "رابط الفيديو النهائي", en: "Final video link", type: "url" },
  ],
  graphic_designer: [
    { key: "platform", ar: "المنصة", en: "Platform", type: "platform" },
    { key: "dimensions", ar: "المقاس", en: "Dimensions" },
    { key: "count", ar: "عدد التصميمات", en: "Number of designs", type: "number" },
    {
      key: "source_link",
      ar: "رابط ملف المصدر (PSD/AI/Figma)",
      en: "Source file (PSD/AI/Figma)",
      type: "url",
    },
  ],
  web_developer: [
    { key: "website_name", ar: "اسم الموقع", en: "Website name" },
    { key: "staging_url", ar: "رابط staging", en: "Staging URL", type: "url" },
    { key: "live_url", ar: "الرابط المباشر", en: "Live URL", type: "url" },
    { key: "repo_url", ar: "رابط الكود", en: "Repo URL", type: "url" },
  ],
  moderator: [
    { key: "platform", ar: "المنصة", en: "Platform", type: "platform" },
    { key: "messages", ar: "عدد الرسائل", en: "Messages", type: "number" },
    { key: "comments", ar: "عدد التعليقات", en: "Comments", type: "number" },
    { key: "leads", ar: "عدد العملاء المحتملين", en: "Leads", type: "number" },
    { key: "escalated_to", ar: "تم التصعيد إلى", en: "Escalated to" },
  ],
  content_writer: [
    { key: "keywords", ar: "الكلمات المفتاحية", en: "Keywords" },
    { key: "medical_review", ar: "يحتاج مراجعة طبية؟ (نعم/لا)", en: "Medical review? (yes/no)" },
    { key: "references", ar: "المراجع", en: "References" },
  ],
  photographer: [
    { key: "location", ar: "مكان التصوير", en: "Location" },
    { key: "branch", ar: "الفرع", en: "Branch" },
    { key: "photos", ar: "عدد الصور", en: "Photos", type: "number" },
    { key: "videos", ar: "عدد الفيديوهات", en: "Videos", type: "number" },
    { key: "raw_link", ar: "رابط الملفات الخام", en: "Raw files link", type: "url" },
  ],
  medical_reviewer: [
    { key: "corrected_text", ar: "النص المصحح", en: "Corrected text" },
    { key: "medical_notes", ar: "ملاحظات طبية", en: "Medical notes" },
  ],
  operations: [{ key: "summary", ar: "ملخص", en: "Summary" }],
};

function TasksDashboard() {
  const db = supabase as any;
  const qc = useQueryClient();
  const { locale } = useLocale();
  const en = locale === "en";

  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const { data: profile } = useQuery({
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
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-tasks"],
    queryFn: async () =>
      (
        await db
          .from("clients")
          .select("id,doctor_name,clinic_name,website_url")
          .order("doctor_name")
      ).data ?? [],
  });
  const { data: projects = [] } = useQuery({
    queryKey: ["projects-for-tasks"],
    queryFn: async () =>
      (await db.from("mdink_projects").select("id,project_name").order("project_name")).data ?? [],
  });

  // الأدوار الإدارية للمستخدم (لمعرفة هل هو super_admin)
  const { data: adminRoles = [] } = useQuery({
    queryKey: ["my-admin-roles", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () =>
      (await db.from("admin_users").select("role").eq("user_id", userData?.id)).data ?? [],
  });
  const isSuperAdmin = adminRoles.some((r: any) => r.role === "admin");

  // أدوار العضو: super_admin يرى كل الأدوار للتجربة؛ غيره يرى أدوار بروفايله فقط
  const myRoles: RoleKey[] = useMemo(() => {
    const profileRoles = Array.isArray(profile?.roles) ? (profile.roles as RoleKey[]) : [];
    if (isSuperAdmin) {
      // الأدمن الأساسي يجرب كل الأدوار — ندمج أدوار بروفايله مع كل الأدوار المتاحة
      const all = ALL_ROLES.map((r) => r.key);
      return Array.from(new Set([...profileRoles, ...all])) as RoleKey[];
    }
    return (profileRoles.length ? profileRoles : ["operations"]) as RoleKey[];
  }, [profile, isSuperAdmin]);

  const [activeRole, setActiveRole] = useState<RoleKey>("operations");
  useEffect(() => {
    if (myRoles.length) setActiveRole(myRoles[0]);
  }, [myRoles]);

  const roleDef = ROLES[activeRole] ?? ROLES.operations;
  const roleFields = ROLE_FIELDS[activeRole] ?? [];

  const blankForm = {
    title: "",
    task_type: roleDef.taskTypes[0]?.value ?? "",
    description: "",
    client_id: "",
    project_id: "",
    doctor_name: "",
    status: roleDef.statuses[0]?.value ?? "not_started",
    priority: "normal",
    due_date: "",
    work_date: new Date().toISOString().slice(0, 10),
    time_spent: "",
    proof_url: "",
  };
  const [form, setForm] = useState(blankForm);
  const [roleData, setRoleData] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      task_type: roleDef.taskTypes[0]?.value ?? "",
      status: roleDef.statuses[0]?.value ?? "not_started",
    }));
    setRoleData({});
  }, [activeRole]);

  // مهامي فقط (RLS بتضمن ده، بس نفلتر بالدور كمان)
  const { data: tasks = [] } = useQuery({
    queryKey: ["my-tasks", userData?.id, activeRole],
    enabled: !!userData?.id,
    queryFn: async () =>
      (
        await db
          .from("team_work_logs")
          .select("*")
          .eq("user_id", userData?.id)
          .eq("role_used", activeRole)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  function reset() {
    setForm(blankForm);
    setRoleData({});
    setEditingId(null);
  }

  function editTask(t: any) {
    setEditingId(t.id);
    setForm({
      title: t.title ?? "",
      task_type: t.task_type ?? "",
      description: t.task_description ?? t.description ?? "",
      client_id: t.client_id ?? "",
      project_id: t.project_id ?? "",
      doctor_name: t.doctor_name ?? "",
      status: t.status ?? "not_started",
      priority: t.priority ?? "normal",
      due_date: t.due_date ?? "",
      work_date: t.work_date ?? new Date().toISOString().slice(0, 10),
      time_spent: t.time_spent ?? "",
      proof_url: t.proof_url ?? "",
    });
    setRoleData(typeof t.role_data === "object" && t.role_data ? t.role_data : {});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.description.trim())
      return toast.error(en ? "Description is required" : "اكتب وصف المهمة");
    const selectedClient = clients.find((c: any) => c.id === form.client_id);
    const payload = {
      user_id: userData?.id,
      created_by: userData?.id,
      member_name: profile?.name_ar || userData?.email || null,
      role_title: roleLabel(activeRole, "ar"),
      role_used: activeRole,
      client_id: form.client_id || null,
      project_id: form.project_id || null,
      doctor_name: form.doctor_name.trim() || selectedClient?.doctor_name || null,
      title: form.title.trim() || null,
      task_type: form.task_type,
      task_description: form.description.trim(),
      status: form.status,
      priority: form.priority,
      due_date: form.due_date || null,
      work_date: form.work_date,
      time_spent: form.time_spent.trim() || null,
      proof_url: form.proof_url || null,
      role_data: roleData,
    };
    const { error } = editingId
      ? await db.from("team_work_logs").update(payload).eq("id", editingId)
      : await db.from("team_work_logs").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(en ? "Task saved" : "تم حفظ المهمة ✓");
    reset();
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
  }

  async function remove(id: string) {
    if (!confirm(en ? "Delete this task?" : "حذف المهمة؟")) return;
    const { error } = await db.from("team_work_logs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
    toast.success(en ? "Deleted" : "تم الحذف");
  }

  function exportMyTasks() {
    exportTableAsExcel(
      `my-tasks-${activeRole}.xls`,
      [
        "العنوان",
        "النوع",
        "الوصف",
        "العميل/الطبيب",
        "الحالة",
        "الأولوية",
        "تاريخ",
        "الوقت المستغرق",
        "ملاحظات الدور",
      ],
      tasks.map((t: any) => [
        t.title,
        roleDef.taskTypes.find((x) => x.value === t.task_type)?.ar ?? t.task_type,
        t.task_description,
        t.doctor_name,
        roleDef.statuses.find((s) => s.value === t.status)?.ar ?? t.status,
        t.priority,
        t.work_date,
        t.time_spent,
        JSON.stringify(t.role_data ?? {}),
      ]),
    );
  }

  const setRD = (k: string, v: string) => setRoleData((d) => ({ ...d, [k]: v }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{en ? "My Work" : "مهامي"}</h1>
        <p className="mt-1 text-muted-foreground">
          {en ? "Log and track your tasks by role." : "سجّل وتابع مهامك حسب دورك."}
        </p>
      </header>

      {/* Role switcher (لو أكتر من دور) */}
      {myRoles.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
          <Layers className="ml-1 h-4 w-4 text-muted-foreground" />
          {myRoles.map((r) => (
            <button
              key={r}
              onClick={() => setActiveRole(r)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${activeRole === r ? "gradient-hero text-brand-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {en ? ROLES[r].label_en : ROLES[r].label_ar}
            </button>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        {/* Form */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {editingId
                ? en
                  ? "Edit task"
                  : "تعديل مهمة"
                : en
                  ? `New ${roleDef.label_en} task`
                  : `مهمة ${roleDef.label_ar} جديدة`}
            </h2>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={reset}>
                <Plus className="ml-1 h-4 w-4" /> {en ? "New" : "جديد"}
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-3">
            <Field
              label={en ? "Task title" : "عنوان المهمة"}
              value={form.title}
              onChange={(v) => setForm({ ...form, title: v })}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={en ? "Task type" : "نوع المهمة"}
                value={form.task_type}
                onChange={(v) => setForm({ ...form, task_type: v })}
                options={roleDef.taskTypes.map((t) => ({
                  value: t.value,
                  label: en ? t.en : t.ar,
                }))}
              />
              <SelectField
                label={en ? "Status" : "الحالة"}
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={roleDef.statuses.map((s) => ({ value: s.value, label: en ? s.en : s.ar }))}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label={en ? "Client / Doctor" : "العميل / الطبيب"}
                value={form.client_id}
                onChange={(v) => setForm({ ...form, client_id: v })}
                options={[
                  { value: "", label: en ? "— none —" : "— لا يوجد —" },
                  ...clients.map((c: any) => ({
                    value: c.id,
                    label: c.doctor_name + (c.clinic_name ? ` (${c.clinic_name})` : ""),
                  })),
                ]}
              />
              <SelectField
                label={en ? "Project" : "المشروع"}
                value={form.project_id}
                onChange={(v) => setForm({ ...form, project_id: v })}
                options={[
                  { value: "", label: en ? "— none —" : "— لا يوجد —" },
                  ...projects.map((p: any) => ({ value: p.id, label: p.project_name })),
                ]}
              />
            </div>

            <Field
              label={en ? "Description" : "وصف العمل"}
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
              textarea
            />

            {/* الحقول المخصصة للدور */}
            {roleFields.length ? (
              <div className="rounded-xl border border-border bg-background/50 p-4">
                <div className="mb-2 text-sm font-semibold text-brand">
                  {en ? `${roleDef.label_en} details` : `تفاصيل ${roleDef.label_ar}`}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {roleFields.map((f) =>
                    f.type === "platform" ? (
                      <SelectField
                        key={f.key}
                        label={en ? f.en : f.ar}
                        value={roleData[f.key] ?? ""}
                        onChange={(v) => setRD(f.key, v)}
                        options={[
                          { value: "", label: "—" },
                          ...PLATFORMS.map((p) => ({ value: p, label: p })),
                        ]}
                      />
                    ) : (
                      <Field
                        key={f.key}
                        label={en ? f.en : f.ar}
                        value={roleData[f.key] ?? ""}
                        onChange={(v) => setRD(f.key, v)}
                        type={f.type === "number" ? "number" : "text"}
                        dir={f.type === "url" ? "ltr" : undefined}
                      />
                    ),
                  )}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label={en ? "Priority" : "الأولوية"}
                value={form.priority}
                onChange={(v) => setForm({ ...form, priority: v })}
                options={PRIORITIES.map((p) => ({ value: p.value, label: en ? p.en : p.ar }))}
              />
              <Field
                label={en ? "Work date" : "تاريخ العمل"}
                value={form.work_date}
                onChange={(v) => setForm({ ...form, work_date: v })}
                type="date"
                dir="ltr"
              />
              <Field
                label={en ? "Time spent" : "الوقت المستغرق"}
                value={form.time_spent}
                onChange={(v) => setForm({ ...form, time_spent: v })}
              />
            </div>
            <Field
              label={en ? "Due date" : "تاريخ التسليم"}
              value={form.due_date}
              onChange={(v) => setForm({ ...form, due_date: v })}
              type="date"
              dir="ltr"
            />

            <ImageUpload
              label={en ? "Attach file / proof" : "إرفاق ملف / إثبات"}
              value={form.proof_url}
              onChange={(v) => setForm({ ...form, proof_url: v })}
              folder="tasks"
            />

            <Button onClick={save} className="gradient-hero text-brand-foreground">
              <Save className="ml-2 h-4 w-4" /> {en ? "Save task" : "حفظ المهمة"}
            </Button>
          </div>
        </section>

        {/* My tasks list */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {en ? "My tasks" : "مهامي"} ({tasks.length})
            </h2>
            <Button variant="outline" size="sm" onClick={exportMyTasks} disabled={!tasks.length}>
              <Download className="ml-1 h-4 w-4" /> Excel
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {tasks.map((t: any) => {
              const tt = roleDef.taskTypes.find((x) => x.value === t.task_type);
              const st = roleDef.statuses.find((s) => s.value === t.status);
              return (
                <div key={t.id} className="rounded-xl border border-border bg-background/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => editTask(t)} className="min-w-0 flex-1 text-right">
                      <div className="font-semibold">{t.title || (en ? tt?.en : tt?.ar)}</div>
                      <div className="text-xs text-muted-foreground">
                        {en ? tt?.en : tt?.ar} {t.doctor_name ? `· ${t.doctor_name}` : ""}
                      </div>
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                        {en ? st?.en : st?.ar}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => remove(t.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {t.task_description ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {t.task_description}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {t.work_date ? <span>{t.work_date}</span> : null}
                    {t.time_spent ? <span>· {t.time_spent}</span> : null}
                    {t.proof_url ? (
                      <a
                        href={t.proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand hover:underline"
                      >
                        · {en ? "file" : "ملف"}
                      </a>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {!tasks.length && (
              <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
                {en ? "No tasks yet for this role." : "لا توجد مهام بعد لهذا الدور."}
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
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  type?: string;
  dir?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <Textarea
          className="mt-1.5"
          rows={3}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          className="mt-1.5"
          type={type}
          dir={dir}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function SelectField({
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
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
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
