import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Search, Trash2, User, Phone, Mail } from "lucide-react";
import { requireOperationsAdmin } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: requireOperationsAdmin,
  component: LeadsPage,
});

// مصادر الطلبات الموحّدة: كل مصدر يُقرأ من جدوله ويُطبّع لشكل موحّد
type Source = "contact" | "doctor" | "consultation";
const SOURCE_META: Record<Source, { table: string; label: string; badge: string }> = {
  contact: { table: "contact_submissions", label: "طلب تواصل", badge: "bg-blue-100 text-blue-700" },
  doctor: { table: "doctor_applications", label: "طلب طبيب", badge: "bg-purple-100 text-purple-700" },
  consultation: { table: "consultations", label: "استشارة مجانية", badge: "bg-emerald-100 text-emerald-700" },
};

const STATUSES = [
  { v: "new", ar: "جديد" },
  { v: "contacted", ar: "تم التواصل" },
  { v: "interested", ar: "مهتم" },
  { v: "postponed", ar: "مؤجل" },
  { v: "converted", ar: "تم التحويل" },
  { v: "closed", ar: "مغلق" },
];

interface Lead {
  id: string;
  source: Source;
  name: string;
  phone: string;
  email: string;
  specialty: string;
  message: string;
  status: string;
  created_at: string;
}

function LeadsPage() {
  const qc = useQueryClient();
  const db = supabase as any;
  const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["admin-unified-leads"],
    queryFn: async (): Promise<Lead[]> => {
      const [contact, doctor, consult] = await Promise.all([
        db.from("contact_submissions").select("*").order("created_at", { ascending: false }),
        db.from("doctor_applications").select("*").order("created_at", { ascending: false }),
        db.from("consultations").select("*").order("created_at", { ascending: false }),
      ]);
      const norm = (rows: any[], source: Source): Lead[] =>
        (rows ?? []).map((r) => ({
          id: r.id,
          source,
          name: r.full_name ?? r.name ?? "—",
          phone: r.phone ?? "",
          email: r.email ?? r.website_or_page_url ?? "",
          specialty: r.specialty ?? "",
          message: r.message ?? r.requested_service ?? "",
          status: r.status ?? "new",
          created_at: r.created_at,
        }));
      return [
        ...norm(contact.data, "contact"),
        ...norm(doctor.data, "doctor"),
        ...norm(consult.data, "consultation"),
      ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    },
  });

  const filtered = useMemo(() => {
    let list = leads;
    if (sourceFilter !== "all") list = list.filter((l) => l.source === sourceFilter);
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      list = list.filter((l) =>
        [l.name, l.phone, l.email, l.specialty, l.message]
          .filter(Boolean)
          .some((t) => t.toLowerCase().includes(n)),
      );
    }
    return list;
  }, [leads, sourceFilter, statusFilter, q]);

  async function setStatus(lead: Lead, status: string) {
    const { error } = await db
      .from(SOURCE_META[lead.source].table)
      .update({ status })
      .eq("id", lead.id);
    if (error) return toast.error("تعذّر تحديث الحالة");
    toast.success("تم تحديث الحالة ✓");
    qc.invalidateQueries({ queryKey: ["admin-unified-leads"] });
  }

  async function remove(lead: Lead) {
    if (!confirm("حذف الطلب نهائياً؟")) return;
    const { error } = await db.from(SOURCE_META[lead.source].table).delete().eq("id", lead.id);
    if (error) return toast.error("تعذّر الحذف");
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["admin-unified-leads"] });
  }

  const conversionRate = leads.length
    ? Math.round(
        (leads.filter((l) => ["converted", "closed"].includes(l.status)).length / leads.length) * 100,
      )
    : 0;

  function exportExcel() {
    exportTableAsExcel(
      "mdink-leads.xls",
      ["النوع", "الاسم", "الهاتف", "البريد", "التخصص", "الحالة", "الرسالة", "تاريخ الطلب"],
      filtered.map((l) => [
        SOURCE_META[l.source].label,
        l.name,
        l.phone,
        l.email,
        l.specialty,
        STATUSES.find((s) => s.v === l.status)?.ar ?? l.status,
        l.message,
        new Date(l.created_at).toLocaleString("ar-EG"),
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">طلبات العملاء (Leads)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} طلب · معدل التحويل: {conversionRate}%
          </p>
        </div>
        <Button onClick={exportExcel} className="gradient-hero text-brand-foreground">
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </div>

      {/* فلاتر */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="بحث بالاسم/الهاتف/الرسالة..."
            className="h-10 w-full rounded-md border border-input bg-background pr-10 pl-3 text-sm outline-none focus:border-brand"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value as any)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">كل الأنواع</option>
          <option value="contact">طلبات التواصل</option>
          <option value="doctor">طلبات الأطباء</option>
          <option value="consultation">الاستشارات المجانية</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="all">كل الحالات</option>
          {STATUSES.map((s) => (
            <option key={s.v} value={s.v}>
              {s.ar}
            </option>
          ))}
        </select>
      </div>

      {/* القائمة */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-muted-foreground">جارٍ التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
            لا توجد طلبات مطابقة.
          </div>
        ) : (
          filtered.map((l) => (
            <div key={`${l.source}-${l.id}`} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${SOURCE_META[l.source].badge}`}>
                    {SOURCE_META[l.source].label}
                  </span>
                  <div>
                    <div className="inline-flex items-center gap-1 font-semibold">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> {l.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground" dir="ltr">
                      {l.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {l.phone}
                        </span>
                      )}
                      {l.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {l.email}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("ar-EG")}
                </div>
              </div>
              {l.specialty && <div className="mt-2 text-xs text-brand">التخصص: {l.specialty}</div>}
              {l.message && <p className="mt-3 whitespace-pre-line text-sm">{l.message}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <select
                  value={l.status}
                  onChange={(e) => setStatus(l, e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.ar}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => remove(l)}
                  className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
