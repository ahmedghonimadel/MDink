import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Save, Trash2, X, Check, FolderKanban, Users } from "lucide-react";
import { requireOperationsAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/admin/projects")({
  beforeLoad: requireOperationsAdmin,
  component: ProjectsAdmin,
});

const STATUS = [
  { value: "planning", label: "تخطيط" },
  { value: "active", label: "قيد التنفيذ" },
  { value: "delivered", label: "تم التسليم" },
  { value: "paused", label: "متوقف" },
];

function ProjectsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [clientIds, setClientIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["admin-projects"],
    queryFn: async () =>
      (await db.from("mdink_projects").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-for-projects"],
    queryFn: async () =>
      (await db.from("clients").select("id,doctor_name,clinic_name").order("doctor_name")).data ??
      [],
  });
  // كل روابط المشاريع↔العملاء
  const { data: links = [] } = useQuery({
    queryKey: ["project-clients-all"],
    queryFn: async () => (await db.from("project_clients").select("*")).data ?? [],
  });

  const clientsOf = (projectId: string) =>
    links.filter((l: any) => l.project_id === projectId).map((l: any) => l.client_id);
  const clientName = (id: string) => {
    const c = clients.find((x: any) => x.id === id);
    return c ? c.doctor_name + (c.clinic_name ? ` (${c.clinic_name})` : "") : "—";
  };

  function reset() {
    setName("");
    setStatus("active");
    setClientIds([]);
    setEditingId(null);
  }
  function editProject(p: any) {
    setEditingId(p.id);
    setName(p.project_name ?? "");
    setStatus(p.status ?? "active");
    setClientIds(clientsOf(p.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function toggleClient(id: string) {
    setClientIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (!name.trim()) return toast.error("اكتب اسم المشروع");
    // العميل الأساسي (للتوافق مع عمود client_id القديم) = أول عميل مختار
    const primary = clientIds[0] || null;
    let projectId = editingId;
    if (editingId) {
      const { error } = await db
        .from("mdink_projects")
        .update({ project_name: name.trim(), status, client_id: primary })
        .eq("id", editingId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await db
        .from("mdink_projects")
        .insert({ project_name: name.trim(), status, client_id: primary })
        .select("id")
        .single();
      if (error) return toast.error(error.message);
      projectId = data.id;
    }
    // زامن جدول الربط: احذف القديم وأدخل المختار
    if (projectId) {
      await db.from("project_clients").delete().eq("project_id", projectId);
      if (clientIds.length) {
        const rows = clientIds.map((cid) => ({ project_id: projectId, client_id: cid }));
        const { error: linkErr } = await db.from("project_clients").insert(rows);
        if (linkErr) return toast.error(linkErr.message);
      }
    }
    toast.success(editingId ? "تم تحديث المشروع ✓" : "تمت إضافة المشروع ✓");
    reset();
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
    qc.invalidateQueries({ queryKey: ["project-clients-all"] });
  }

  async function remove(id: string, pname: string) {
    if (!confirm(`حذف المشروع "${pname}"؟`)) return;
    const { error } = await db.from("mdink_projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-projects"] });
    qc.invalidateQueries({ queryKey: ["project-clients-all"] });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">المشاريع</h1>
        <p className="mt-1 text-muted-foreground">
          المشروع الواحد ممكن يشترك فيه أكتر من عميل، والعميل ممكن يكون له أكتر من مشروع.
        </p>
      </header>

      {/* Form */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{editingId ? "تعديل مشروع" : "إضافة مشروع"}</h2>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="ml-1 h-4 w-4" /> إلغاء
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>اسم المشروع</Label>
            <Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>الحالة</Label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <Label className="flex items-center gap-1.5">
            <Users className="h-4 w-4" /> عملاء المشروع (اختر واحد أو أكتر)
          </Label>
          {clients.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {clients.map((c: any) => {
                const on = clientIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleClient(c.id)}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? "border-brand bg-brand/10 text-brand" : "border-border hover:border-brand/40"}`}
                  >
                    {on ? <Check className="h-3.5 w-3.5" /> : null}
                    {c.doctor_name}
                    {c.clinic_name ? ` · ${c.clinic_name}` : ""}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              لا يوجد عملاء بعد — أضِف عملاء من صفحة «العملاء والمدفوعات» أولًا.
            </p>
          )}
        </div>

        <Button onClick={save} className="mt-5 gradient-hero text-brand-foreground">
          {editingId ? (
            <>
              <Save className="ml-2 h-4 w-4" /> حفظ التعديل
            </>
          ) : (
            <>
              <Plus className="ml-2 h-4 w-4" /> إضافة المشروع
            </>
          )}
        </Button>
      </section>

      {/* List */}
      <section className="grid gap-3">
        {projects.map((p: any) => {
          const cids = clientsOf(p.id);
          const st = STATUS.find((s) => s.value === p.status);
          return (
            <article key={p.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                    <FolderKanban className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{p.project_name}</h3>
                    <span className="text-xs text-muted-foreground">{st?.label ?? p.status}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => editProject(p)}>
                    تعديل
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(p.id, p.project_name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                {cids.length ? (
                  cids.map((cid: string) => (
                    <span
                      key={cid}
                      className="rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-medium"
                    >
                      {clientName(cid)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">لا يوجد عملاء مرتبطون</span>
                )}
              </div>
            </article>
          );
        })}
        {!projects.length && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            لا توجد مشاريع بعد.
          </div>
        )}
      </section>
    </div>
  );
}
