import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { requireOperationsAdmin } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/exports")({
  beforeLoad: requireOperationsAdmin,
  component: ExportsAdmin,
});

const exportsConfig = [
  {
    title: "طلبات التواصل",
    table: "leads",
    filename: "mdink-leads.xls",
    headers: ["الاسم", "الهاتف", "التخصص", "الرسالة", "الحالة", "التاريخ"],
    fields: ["name", "phone", "specialty", "message", "status", "created_at"],
  },
  {
    title: "الاستشارات المجانية",
    table: "free_consultations",
    filename: "mdink-consultations.xls",
    headers: ["الاسم", "الهاتف", "البريد", "التخصص", "الحالة", "تحوّل", "التاريخ"],
    fields: ["full_name", "phone", "email", "specialty", "status", "converted", "created_at"],
  },
  {
    title: "طلبات انضمام الأطباء",
    table: "doctor_applications",
    filename: "doctor-applications.xls",
    headers: ["الاسم", "التخصص", "الهاتف", "البريد", "العيادة", "المؤهلات", "الحالة", "التاريخ"],
    fields: [
      "full_name",
      "specialty",
      "phone",
      "email",
      "clinic_name",
      "qualifications",
      "status",
      "created_at",
    ],
  },
  {
    title: "عملاء MDink",
    table: "mdink_clients",
    filename: "mdink-clients.xls",
    headers: [
      "الدكتور",
      "النوع",
      "العيادة",
      "التخصص",
      "الهاتف",
      "الباقة",
      "حالة المشروع",
      "حالة الدفع",
      "ملاحظات",
    ],
    fields: [
      "doctor_name",
      "client_type",
      "clinic_name",
      "specialty",
      "phone",
      "package_name",
      "project_status",
      "payment_status",
      "notes",
    ],
  },
  {
    title: "أعمال الفريق",
    table: "team_work_logs",
    filename: "team-work-logs.xls",
    headers: [
      "عضو الفريق",
      "الدور",
      "الدكتور",
      "العنوان",
      "نوع المهمة",
      "الوصف",
      "الحالة",
      "الأولوية",
      "تاريخ العمل",
      "تاريخ التسليم",
      "الوقت",
    ],
    fields: [
      "member_name",
      "role_title",
      "doctor_name",
      "title",
      "task_type",
      "task_description",
      "status",
      "priority",
      "work_date",
      "due_date",
      "time_spent",
    ],
  },
  {
    title: "بروفايلات الفريق",
    table: "team_profiles",
    filename: "team-profiles.xls",
    headers: [
      "الاسم",
      "البريد",
      "الهاتف",
      "التخصص الطبي",
      "سنوات الخبرة",
      "حالة الحساب",
      "ظهور عام",
    ],
    fields: [
      "name_ar",
      "email",
      "phone",
      "medical_specialty",
      "years_experience",
      "account_status",
      "public_approved",
    ],
  },
  {
    title: "المدفوعات",
    table: "mdink_payments",
    filename: "mdink-payments.xls",
    headers: [
      "العميل",
      "الخدمة",
      "الإجمالي",
      "المدفوع",
      "المتبقي",
      "عدد الأقساط",
      "الحالة",
      "تاريخ الاستحقاق",
    ],
    fields: [
      "client_name",
      "service_name",
      "total_amount",
      "paid_amount",
      "remaining_amount",
      "installment_count",
      "payment_status",
      "next_due_date",
    ],
  },
];

function ExportsAdmin() {
  async function runExport(item: (typeof exportsConfig)[number]) {
    const { data, error } = await (supabase as any)
      .from(item.table)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    exportTableAsExcel(
      item.filename,
      item.headers,
      (data ?? []).map((row: any) => item.fields.map((field) => row[field] ?? "")),
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">تصدير Excel</h1>
        <p className="mt-1 text-muted-foreground">
          تنزيل ملفات متابعة العملاء، الطلبات، الفريق، والمدفوعات.
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {exportsConfig.map((item) => (
          <article
            key={item.table}
            className="rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">ملف منظم قابل للفتح في Excel.</p>
            <Button onClick={() => runExport(item)} className="mt-5 bg-brand text-brand-foreground">
              <Download className="ml-2 h-4 w-4" /> تنزيل
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
