import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Download,
  Search,
  Trash2,
  User,
  Phone,
  Mail,
  Plus,
  X,
  UserPlus,
  ArrowLeftRight,
  CheckCircle2,
} from "lucide-react";
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
  consultation: {
    table: "consultations",
    label: "استشارة مجانية",
    badge: "bg-emerald-100 text-emerald-700",
  },
};

// مراحل الطلب (Pipeline) — موحّدة لكل الجداول بعد ميجريشن leads_pipeline
const STATUSES = [
  { v: "new", ar: "جديد" },
  { v: "contacted", ar: "تم التواصل" },
  { v: "interested", ar: "مهتم" },
  { v: "postponed", ar: "مؤجل" },
  { v: "agreed", ar: "تم الاتفاق" },
  { v: "converted", ar: "تم التحويل لعميل" },
  { v: "closed", ar: "مغلق/مرفوض" },
];

// قنوات المصدر للطلب اليدوي (منين جه الدكتور)
const CHANNELS = [
  { v: "facebook", ar: "فيسبوك" },
  { v: "instagram", ar: "إنستجرام" },
  { v: "whatsapp", ar: "واتساب" },
  { v: "referral", ar: "إحالة / صديق" },
  { v: "phone_call", ar: "مكالمة هاتفية" },
  { v: "website", ar: "الموقع" },
  { v: "other", ar: "أخرى" },
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
  channel: string | null;
  converted_client_id: string | null;
  created_at: string;
}

function LeadsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const db = supabase as any;
  const [sourceFilter, setSourceFilter] = useState<"all" | Source>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

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
          channel: r.source ?? null,
          converted_client_id: r.converted_client_id ?? null,
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

  // تحويل الطلب إلى عميل في «العملاء والمدفوعات» + وسم الطلب كـ«محوّل»
  async function convertToClient(lead: Lead) {
    if (lead.converted_client_id) {
      toast.info("هذا الطلب محوّل بالفعل لعميل");
      return;
    }
    if (!confirm(`تحويل "${lead.name}" إلى عميل في العملاء والمدفوعات؟`)) return;
    setConverting(lead.id);
    try {
      const { data: client, error } = await db
        .from("clients")
        .insert({
          doctor_name: lead.name,
          client_type: "doctor",
          specialty: lead.specialty || null,
          phone: lead.phone || null,
          project_status: "active", // عميل فعلي — ليس «محتمل»
          payment_status: "unpaid", // يظهر تحذير لاستكمال بيانات الدفع
          notes: lead.message || null,
        })
        .select("id")
        .single();
      if (error) throw error;

      await db
        .from(SOURCE_META[lead.source].table)
        .update({ status: "converted", converted_client_id: client.id })
        .eq("id", lead.id);

      qc.invalidateQueries({ queryKey: ["admin-unified-leads"] });
      qc.invalidateQueries({ queryKey: ["clients-v2"] });
      toast.success("تم تحويله لعميل ✓ — أكمل بيانات الدفع (خدنا كام والتفاصيل)");
      navigate({ to: "/admin/clients" });
    } catch (e: any) {
      toast.error(e?.message || "تعذّر التحويل");
    } finally {
      setConverting(null);
    }
  }

  const conversionRate = leads.length
    ? Math.round(
        (leads.filter((l) => ["converted", "closed"].includes(l.status)).length / leads.length) *
          100,
      )
    : 0;

  function exportExcel() {
    exportTableAsExcel(
      "mdink-leads.xls",
      ["النوع", "المصدر", "الاسم", "الهاتف", "البريد", "التخصص", "الحالة", "الرسالة", "تاريخ الطلب"],
      filtered.map((l) => [
        SOURCE_META[l.source].label,
        CHANNELS.find((c) => c.v === l.channel)?.ar ?? l.channel ?? "",
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAdd((s) => !s)}>
            <UserPlus className="ml-2 h-4 w-4" /> تسجيل طلب يدوي
          </Button>
          <Button onClick={exportExcel} className="gradient-hero text-brand-foreground">
            <Download className="ml-2 h-4 w-4" /> تصدير Excel
          </Button>
        </div>
      </div>

      {/* تسجيل طلب يدوي */}
      {showAdd ? (
        <AddLeadForm
          onClose={() => setShowAdd(false)}
          onDone={() => {
            qc.invalidateQueries({ queryKey: ["admin-unified-leads"] });
            setShowAdd(false);
          }}
        />
      ) : null}

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
          filtered.map((l) => {
            const channelLabel = CHANNELS.find((c) => c.v === l.channel)?.ar;
            const isConverted = !!l.converted_client_id || l.status === "converted";
            return (
              <div
                key={`${l.source}-${l.id}`}
                className="rounded-2xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${SOURCE_META[l.source].badge}`}
                    >
                      {SOURCE_META[l.source].label}
                    </span>
                    {channelLabel ? (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                        {channelLabel}
                      </span>
                    ) : null}
                    <div>
                      <div className="inline-flex items-center gap-1 font-semibold">
                        <User className="h-3.5 w-3.5 text-muted-foreground" /> {l.name}
                      </div>
                      <div
                        className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground"
                        dir="ltr"
                      >
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

                  {isConverted ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> عميل في المدفوعات
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant={l.status === "agreed" ? "default" : "outline"}
                      className={l.status === "agreed" ? "gradient-hero text-brand-foreground" : ""}
                      disabled={converting === l.id}
                      onClick={() => convertToClient(l)}
                    >
                      <ArrowLeftRight className="ml-1 h-3.5 w-3.5" />
                      {converting === l.id ? "جارٍ التحويل..." : "تحويل لعميل"}
                    </Button>
                  )}

                  <button
                    onClick={() => remove(l)}
                    className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> حذف
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// فورم تسجيل طلب يدوي — يُكتب في contact_submissions مع تحديد المصدر
function AddLeadForm({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const db = supabase as any;
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    source: "facebook",
    specialty: "",
    message: "",
  });
  const [saving, setSaving] = useState(false);
  const setF = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function save() {
    if (!form.full_name.trim()) return toast.error("اكتب اسم الدكتور/العميل");
    setSaving(true);
    const { error } = await db.from("contact_submissions").insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim() || null,
      specialty: form.specialty.trim() || null,
      message: form.message.trim() || null,
      source: form.source,
      status: "new",
      language: "ar",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم تسجيل الطلب ✓");
    onDone();
  }

  return (
    <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 shadow-card">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">تسجيل طلب يدوي</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <Label>اسم الدكتور/العميل</Label>
          <Input
            className="mt-1.5"
            value={form.full_name}
            onChange={(e) => setF("full_name", e.target.value)}
          />
        </div>
        <div>
          <Label>الهاتف</Label>
          <Input
            className="mt-1.5"
            dir="ltr"
            value={form.phone}
            onChange={(e) => setF("phone", e.target.value)}
          />
        </div>
        <div>
          <Label>المصدر (جه منين)</Label>
          <select
            value={form.source}
            onChange={(e) => setF("source", e.target.value)}
            className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CHANNELS.map((c) => (
              <option key={c.v} value={c.v}>
                {c.ar}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>التخصص</Label>
          <Input
            className="mt-1.5"
            value={form.specialty}
            onChange={(e) => setF("specialty", e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Label>ملاحظات / تفاصيل الطلب</Label>
          <Textarea
            className="mt-1.5"
            rows={2}
            value={form.message}
            onChange={(e) => setF("message", e.target.value)}
          />
        </div>
      </div>
      <Button
        onClick={save}
        disabled={saving}
        className="mt-4 gradient-hero text-brand-foreground"
      >
        <Plus className="ml-2 h-4 w-4" /> {saving ? "جارٍ الحفظ..." : "تسجيل الطلب"}
      </Button>
    </div>
  );
}
