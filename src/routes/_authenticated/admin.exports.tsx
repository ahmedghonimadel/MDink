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

const db = supabase as any;

// ── تسميات عربية موحّدة ──
const CLIENT_TYPE: Record<string, string> = {
  doctor: "طبيب",
  clinic: "عيادة",
  center: "مركز طبي",
  company: "شركة",
};
const PROJECT_STATUS: Record<string, string> = {
  lead: "عميل محتمل",
  active: "نشط",
  delivered: "تم التسليم",
  paused: "متوقف",
};
const PAYMENT_STATUS: Record<string, string> = {
  paid: "تم الدفع بالكامل",
  installment: "يتم التقسيط",
  unpaid: "لم يدفع",
  pending: "بانتظار الدفع",
  overdue: "متأخر",
  cancelled: "ملغي",
};

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleString("ar-EG") : "");
const num = (v: any) => Number(v || 0);

async function fetchAll(table: string) {
  const { data, error } = await db
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any[];
}

// كل تصدير يعرّف عناوينه ودالة تُرجع صفوفه جاهزة — يقرأ من الجداول الحيّة الفعلية
type ExportDef = {
  title: string;
  desc: string;
  filename: string;
  headers: string[];
  rows: () => Promise<(string | number)[][]>;
};

const exportsConfig: ExportDef[] = [
  {
    title: "طلبات التواصل",
    desc: "كل طلبات التواصل الواردة من الموقع.",
    filename: "mdink-contact-requests.xls",
    headers: ["الاسم", "الهاتف", "التخصص", "المصدر", "الرسالة", "الحالة", "التاريخ"],
    rows: async () =>
      (await fetchAll("contact_submissions")).map((r) => [
        r.full_name ?? "",
        r.phone ?? "",
        r.specialty ?? "",
        r.source ?? "",
        r.message ?? "",
        r.status ?? "",
        fmt(r.created_at),
      ]),
  },
  {
    title: "الاستشارات المجانية",
    desc: "طلبات الاستشارة المجانية من الموقع.",
    filename: "mdink-consultations.xls",
    headers: ["الاسم", "الهاتف", "التخصص", "المصدر", "الرسالة", "الحالة", "التاريخ"],
    rows: async () =>
      (await fetchAll("consultations")).map((r) => [
        r.full_name ?? "",
        r.phone ?? "",
        r.specialty ?? "",
        r.source ?? "",
        r.message ?? "",
        r.status ?? "",
        fmt(r.created_at),
      ]),
  },
  {
    title: "طلبات انضمام الأطباء",
    desc: "طلبات الأطباء للانضمام عبر صفحة الانضمام.",
    filename: "mdink-doctor-applications.xls",
    headers: ["الاسم", "التخصص", "الهاتف", "البريد", "الحالة", "التاريخ"],
    rows: async () =>
      (await fetchAll("doctor_applications")).map((r) => [
        r.full_name ?? "",
        r.specialty ?? "",
        r.phone ?? "",
        r.email ?? "",
        r.status ?? "",
        fmt(r.created_at),
      ]),
  },
  {
    // بيانات العميل كاملة + مدفوعاته (بعد أن أصبح عميلًا في «العملاء والمدفوعات»)
    title: "عملاء MDink (بالمدفوعات)",
    desc: "كل بيانات العميل مع تفاصيل الدفع والمتبقي والأقساط.",
    filename: "mdink-clients-full.xls",
    headers: [
      "الدكتور/العميل",
      "النوع",
      "العيادة",
      "التخصص",
      "الهاتف",
      "البريد",
      "واتساب",
      "الموقع",
      "العنوان",
      "الباقة",
      "حالة المشروع",
      "حالة الدفع",
      "الإجمالي",
      "المدفوع",
      "المتبقي",
      "عدد الأقساط",
      "القسط القادم",
      "ملاحظات",
      "تاريخ الإضافة",
    ],
    rows: async () => {
      const [clients, payments] = await Promise.all([
        fetchAll("clients"),
        fetchAll("client_payments"),
      ]);
      return clients.map((c) => {
        const p = payments.find((x) => x.client_id === c.id);
        const total = num(p?.total_amount);
        const paid = num(p?.paid_amount);
        return [
          c.doctor_name ?? "",
          CLIENT_TYPE[c.client_type] ?? c.client_type ?? "",
          c.clinic_name ?? "",
          c.specialty ?? "",
          c.phone ?? "",
          c.email ?? "",
          c.whatsapp ?? "",
          c.website_url ?? "",
          c.address ?? "",
          c.package_name ?? "",
          PROJECT_STATUS[c.project_status] ?? c.project_status ?? "",
          PAYMENT_STATUS[c.payment_status] ?? c.payment_status ?? "",
          total,
          paid,
          Math.max(0, num(p?.remaining_amount ?? total - paid)),
          num(p?.installment_count),
          p?.next_due_date ?? "",
          c.notes ?? "",
          fmt(c.created_at),
        ];
      });
    },
  },
  {
    // المدفوعات فقط
    title: "المدفوعات",
    desc: "سجل المدفوعات فقط (المبالغ والأقساط والحالة).",
    filename: "mdink-payments.xls",
    headers: [
      "العميل",
      "الخدمة",
      "الإجمالي",
      "المدفوع",
      "المتبقي",
      "الحالة",
      "عدد الأقساط",
      "القسط القادم",
      "التاريخ",
    ],
    rows: async () =>
      (await fetchAll("client_payments")).map((p) => {
        const total = num(p.total_amount);
        const paid = num(p.paid_amount);
        return [
          p.client_name ?? "",
          p.service_name ?? "",
          total,
          paid,
          Math.max(0, num(p.remaining_amount ?? total - paid)),
          PAYMENT_STATUS[p.payment_status] ?? p.payment_status ?? "",
          num(p.installment_count),
          p.next_due_date ?? "",
          fmt(p.created_at),
        ];
      }),
  },
  {
    title: "أعمال الفريق",
    desc: "سجل مهام وأعمال الفريق.",
    filename: "mdink-team-work.xls",
    headers: [
      "عضو الفريق",
      "الدور",
      "العميل/الدكتور",
      "العنوان",
      "الحالة",
      "الأولوية",
      "تاريخ العمل",
      "تاريخ التسليم",
    ],
    rows: async () =>
      (await fetchAll("team_work_logs")).map((t) => [
        t.member_name ?? "",
        t.role_title ?? "",
        t.doctor_name ?? "",
        t.title ?? "",
        t.status ?? "",
        t.priority ?? "",
        t.work_date ?? "",
        t.due_date ?? "",
      ]),
  },
  {
    title: "بروفايلات الفريق",
    desc: "بيانات أعضاء الفريق المهنية.",
    filename: "mdink-team-profiles.xls",
    headers: ["الاسم", "البريد", "الهاتف", "التخصص الطبي", "سنوات الخبرة", "حالة الحساب"],
    rows: async () =>
      (await fetchAll("team_profiles")).map((m) => [
        m.name_ar ?? "",
        m.email ?? "",
        m.phone ?? "",
        m.medical_specialty ?? "",
        m.years_experience ?? "",
        m.account_status ?? "",
      ]),
  },
];

function ExportsAdmin() {
  async function runExport(item: ExportDef) {
    try {
      const rows = await item.rows();
      exportTableAsExcel(item.filename, item.headers, rows);
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(`تعذّر التصدير: ${e?.message || e}`);
    }
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
            key={item.filename}
            className="rounded-2xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            <Button onClick={() => runExport(item)} className="mt-5 bg-brand text-brand-foreground">
              <Download className="ml-2 h-4 w-4" /> تنزيل
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}
