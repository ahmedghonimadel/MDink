import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireDashboard } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/operations")({
  beforeLoad: requireDashboard,
  component: OperationsAdmin,
});

function OperationsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [form, setForm] = useState({
    member_name: "",
    role_title: "",
    doctor_name: "",
    task_type: "",
    task_description: "",
    quantity: "1",
    work_date: new Date().toISOString().slice(0, 10),
    status: "done",
    proof_url: "",
    notes: "",
  });
  const { data: rows = [] } = useQuery({
    queryKey: ["team-work-logs"],
    queryFn: async () =>
      (
        await db
          .from("team_work_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
      ).data ?? [],
  });

  async function addWork() {
    if (!form.task_type.trim() || !form.task_description.trim()) {
      toast.error("اكتب نوع المهمة ووصف العمل");
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from("team_work_logs").insert({
      user_id: u.user?.id ?? null,
      member_name: form.member_name.trim() || u.user?.email || null,
      role_title: form.role_title.trim() || null,
      doctor_name: form.doctor_name.trim() || null,
      task_type: form.task_type.trim(),
      task_description: form.task_description.trim(),
      quantity: Number(form.quantity) || 1,
      work_date: form.work_date,
      status: form.status,
      proof_url: form.proof_url.trim() || null,
      notes: form.notes.trim() || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("تم تسجيل العمل");
      setForm({
        member_name: "",
        role_title: "",
        doctor_name: "",
        task_type: "",
        task_description: "",
        quantity: "1",
        work_date: new Date().toISOString().slice(0, 10),
        status: "done",
        proof_url: "",
        notes: "",
      });
      qc.invalidateQueries({ queryKey: ["team-work-logs"] });
    }
  }

  function exportRows() {
    exportTableAsExcel(
      "mdink-team-work-logs.xls",
      [
        "عضو الفريق",
        "الدور",
        "الدكتور/العميل",
        "نوع المهمة",
        "الوصف",
        "الكمية",
        "التاريخ",
        "الحالة",
        "دليل العمل",
        "ملاحظات",
      ],
      rows.map((r: any) => [
        r.member_name,
        r.role_title,
        r.doctor_name,
        r.task_type,
        r.task_description,
        r.quantity,
        r.work_date,
        r.status,
        r.proof_url,
        r.notes,
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">تسجيل أعمال الفريق</h1>
          <p className="mt-1 text-muted-foreground">
            يسجل كل عضو عمله حسب المشروع والدكتور ونوع المهمة.
          </p>
        </div>
        <Button variant="outline" onClick={exportRows}>
          <Download className="ml-2 h-4 w-4" /> Excel
        </Button>
      </header>
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-xl font-bold">تسجيل مهمة</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["اسم عضو الفريق", "member_name"],
            ["الدور", "role_title"],
            ["الدكتور/العميل/الموقع", "doctor_name"],
            ["نوع المهمة", "task_type"],
            ["الكمية", "quantity"],
            ["التاريخ", "work_date"],
            ["الحالة", "status"],
            ["رابط إثبات العمل", "proof_url"],
          ].map(([label, key]) => (
            <Field
              key={key}
              label={label}
              value={(form as any)[key]}
              onChange={(v) => setForm({ ...form, [key]: v })}
              type={key === "work_date" ? "date" : "text"}
            />
          ))}
          <div className="md:col-span-2">
            <Label>وصف العمل</Label>
            <Textarea
              className="mt-1.5"
              value={form.task_description}
              onChange={(e) => setForm({ ...form, task_description: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea
              className="mt-1.5"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <Button onClick={addWork} className="bg-brand text-brand-foreground">
            <Plus className="ml-2 h-4 w-4" /> تسجيل
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        {rows.map((r: any) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{r.task_type}</h2>
                <p className="text-sm text-muted-foreground">
                  {r.member_name} • {r.role_title} • {r.doctor_name}
                </p>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {r.status}
              </span>
            </div>
            <p className="mt-2 text-sm">{r.task_description}</p>
          </article>
        ))}
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
