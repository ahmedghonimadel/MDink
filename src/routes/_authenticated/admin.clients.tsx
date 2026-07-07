import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Plus, Trash2, Search, Edit, Save, X, Wallet, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { requireOperationsAdmin } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/clients")({
  beforeLoad: requireOperationsAdmin,
  component: ClientsAdmin,
});

const CLIENT_TYPES = [
  { value: "doctor", label: "طبيب" },
  { value: "clinic", label: "عيادة" },
  { value: "center", label: "مركز طبي" },
  { value: "company", label: "شركة" },
];
const PROJECT_STATUS = [
  { value: "lead", label: "عميل محتمل" },
  { value: "active", label: "نشط" },
  { value: "delivered", label: "تم التسليم" },
  { value: "paused", label: "متوقف" },
];
const PAYMENT_STATUS = [
  { value: "paid", label: "تم الدفع بالكامل", color: "bg-emerald-500/15 text-emerald-600" },
  { value: "installment", label: "يتم التقسيط", color: "bg-amber-500/15 text-amber-600" },
  { value: "unpaid", label: "لم يدفع", color: "bg-destructive/15 text-destructive" },
];

type Installment = { amount: string; due_date: string; paid: boolean };

const emptyForm = {
  doctor_name: "",
  clinic_name: "",
  client_type: "doctor",
  specialty: "",
  phone: "",
  email: "",
  whatsapp: "",
  website_url: "",
  logo_url: "",
  address: "",
  package_name: "",
  project_status: "lead",
  payment_status: "unpaid",
  notes: "",
  total_amount: "",
  paid_amount: "",
  payment_proof_url: "",
};

function ClientsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [search, setSearch] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["clients-v2"],
    queryFn: async () =>
      (await db.from("clients").select("*").order("created_at", { ascending: false })).data ??
      [],
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["client-payments-v2"],
    queryFn: async () => (await db.from("client_payments").select("*")).data ?? [],
  });
  // الاستشارات المجانية لحساب نسبة التحويل
  const { data: consultations = [] } = useQuery({
    queryKey: ["free-consultations-count"],
    queryFn: async () => (await db.from("consultations").select("full_name")).data ?? [],
  });

  // نسبة التحويل: الأسماء المشتركة بين الاستشارات والعملاء
  const conversionRate = (() => {
    if (!consultations.length) return null;
    const clientNames = new Set(
      rows.map((r: any) => (r.doctor_name || "").trim().toLowerCase()).filter(Boolean),
    );
    const converted = consultations.filter((c: any) =>
      clientNames.has((c.full_name || "").trim().toLowerCase()),
    ).length;
    return {
      total: consultations.length,
      converted,
      rate: Math.round((converted / consultations.length) * 100),
    };
  })();

  function paymentOf(clientId: string) {
    return payments.find((p: any) => p.client_id === clientId);
  }

  function resetForm() {
    setForm(emptyForm);
    setInstallments([]);
    setEditingId(null);
  }

  function editClient(r: any) {
    const pay = paymentOf(r.id);
    setEditingId(r.id);
    setForm({
      doctor_name: r.doctor_name ?? "",
      clinic_name: r.clinic_name ?? "",
      client_type: r.client_type ?? "doctor",
      specialty: r.specialty ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      whatsapp: r.whatsapp ?? "",
      website_url: r.website_url ?? "",
      logo_url: r.logo_url ?? "",
      address: r.address ?? "",
      package_name: r.package_name ?? "",
      project_status: r.project_status ?? "lead",
      payment_status: r.payment_status ?? "unpaid",
      notes: r.notes ?? "",
      total_amount: pay?.total_amount ? String(pay.total_amount) : "",
      paid_amount: pay?.paid_amount ? String(pay.paid_amount) : "",
      payment_proof_url: pay?.proof_url ?? "",
    });
    setInstallments(Array.isArray(pay?.installment_schedule) ? pay.installment_schedule : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveClient() {
    if (!form.doctor_name.trim()) {
      toast.error("اكتب اسم الدكتور أو العميل");
      return;
    }
    const clientPayload = {
      doctor_name: form.doctor_name.trim(),
      clinic_name: form.clinic_name.trim() || null,
      client_type: form.client_type,
      specialty: form.specialty.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      website_url: form.website_url.trim() || null,
      logo_url: form.logo_url.trim() || null,
      address: form.address.trim() || null,
      package_name: form.package_name.trim() || null,
      project_status: form.project_status,
      payment_status: form.payment_status,
      notes: form.notes.trim() || null,
    };

    let clientId = editingId;
    if (editingId) {
      const { error } = await db.from("clients").update(clientPayload).eq("id", editingId);
      if (error) {
        toast.error(error.message);
        return;
      }
    } else {
      const { data, error } = await db
        .from("clients")
        .insert(clientPayload)
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      clientId = data.id;
    }

    // المدفوعات
    const total = Number(form.total_amount) || 0;
    const paid = Number(form.paid_amount) || 0;
    const hasPayment = total > 0 || paid > 0 || form.payment_status !== "unpaid";
    if (hasPayment && clientId) {
      const paymentPayload = {
        client_id: clientId,
        client_name: form.doctor_name.trim(),
        service_name: form.package_name.trim() || "MDink package",
        total_amount: total,
        paid_amount: paid,
        payment_status: form.payment_status,
        proof_url: form.payment_proof_url.trim() || null,
        installment_schedule: form.payment_status === "installment" ? installments : [],
        installment_count: form.payment_status === "installment" ? installments.length : 0,
        next_due_date:
          form.payment_status === "installment"
            ? installments.find((i) => !i.paid)?.due_date || null
            : null,
      };
      const existing = paymentOf(clientId);
      if (existing) await db.from("client_payments").update(paymentPayload).eq("id", existing.id);
      else await db.from("client_payments").insert(paymentPayload);
    }

    toast.success(editingId ? "تم تحديث العميل ✓" : "تمت إضافة العميل ✓");
    resetForm();
    qc.invalidateQueries({ queryKey: ["clients-v2"] });
    qc.invalidateQueries({ queryKey: ["client-payments-v2"] });
  }

  async function removeClient(id: string, name: string) {
    if (!confirm(`حذف العميل "${name}" نهائيًا؟`)) return;
    await db.from("client_payments").delete().eq("client_id", id);
    const { error } = await db.from("clients").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["clients-v2"] });
    qc.invalidateQueries({ queryKey: ["client-payments-v2"] });
  }

  function exportClients() {
    exportTableAsExcel(
      "mdink-clients.xls",
      [
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
        "ملاحظات",
      ],
      rows.map((r: any) => {
        const p = paymentOf(r.id);
        const statusLabel =
          PAYMENT_STATUS.find((s) => s.value === r.payment_status)?.label ?? r.payment_status;
        return [
          r.doctor_name,
          CLIENT_TYPES.find((t) => t.value === r.client_type)?.label ?? r.client_type,
          r.clinic_name,
          r.specialty,
          r.phone,
          r.email,
          r.whatsapp,
          r.website_url,
          r.address,
          r.package_name,
          r.project_status,
          statusLabel,
          p?.total_amount ?? 0,
          p?.paid_amount ?? 0,
          p?.remaining_amount ?? 0,
          p?.installment_count ?? 0,
          r.notes,
        ];
      }),
    );
  }

  const filtered = rows.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [r.doctor_name, r.clinic_name, r.specialty, r.phone, r.email].some((v) =>
      (v || "").toLowerCase().includes(q),
    );
  });

  const setF = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">العملاء والمدفوعات</h1>
          <p className="mt-1 text-muted-foreground">
            بيانات العملاء والمواقع والاشتراكات والمدفوعات والتقسيط.
          </p>
        </div>
        <Button variant="outline" onClick={exportClients}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      {/* Stats: عملاء + تحويل */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          label="إجمالي العملاء"
          value={String(rows.length)}
          sub={`${rows.filter((r: any) => r.payment_status === "paid").length} مدفوع بالكامل`}
        />
        <StatCard
          icon={TrendingUp}
          label="قيد التقسيط"
          value={String(rows.filter((r: any) => r.payment_status === "installment").length)}
          sub="عملاء يدفعون أقساط"
          color="text-amber-500"
        />
        {conversionRate ? (
          <StatCard
            icon={TrendingUp}
            label="نسبة التحويل"
            value={`${conversionRate.rate}%`}
            sub={`${conversionRate.converted} من ${conversionRate.total} استشارة`}
            color="text-brand"
          />
        ) : (
          <StatCard icon={TrendingUp} label="نسبة التحويل" value="—" sub="لا توجد استشارات بعد" />
        )}
      </div>

      {/* Form */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{editingId ? "تعديل عميل" : "إضافة عميل"}</h2>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="ml-1 h-4 w-4" /> إلغاء
            </Button>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Field
            label="اسم الدكتور/العميل"
            value={form.doctor_name}
            onChange={(v) => setF("doctor_name", v)}
          />
          <SelectField
            label="النوع"
            value={form.client_type}
            onChange={(v) => setF("client_type", v)}
            options={CLIENT_TYPES}
          />
          <Field
            label="اسم العيادة"
            value={form.clinic_name}
            onChange={(v) => setF("clinic_name", v)}
          />
          <Field label="التخصص" value={form.specialty} onChange={(v) => setF("specialty", v)} />
          <Field label="الهاتف" value={form.phone} onChange={(v) => setF("phone", v)} dir="ltr" />
          <Field label="البريد" value={form.email} onChange={(v) => setF("email", v)} dir="ltr" />
          <Field
            label="واتساب"
            value={form.whatsapp}
            onChange={(v) => setF("whatsapp", v)}
            dir="ltr"
          />
          <Field
            label="رابط الموقع"
            value={form.website_url}
            onChange={(v) => setF("website_url", v)}
            dir="ltr"
          />
          <Field label="العنوان" value={form.address} onChange={(v) => setF("address", v)} />
          <Field
            label="الباقة"
            value={form.package_name}
            onChange={(v) => setF("package_name", v)}
          />
          <SelectField
            label="حالة المشروع"
            value={form.project_status}
            onChange={(v) => setF("project_status", v)}
            options={PROJECT_STATUS}
          />
          <SelectField
            label="حالة الدفع"
            value={form.payment_status}
            onChange={(v) => setF("payment_status", v)}
            options={PAYMENT_STATUS}
          />
        </div>

        {/* المبالغ */}
        {form.payment_status !== "unpaid" ? (
          <div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="إجمالي المتفق عليه"
                value={form.total_amount}
                onChange={(v) => setF("total_amount", v)}
                type="number"
                dir="ltr"
              />
              <Field
                label="المدفوع"
                value={form.paid_amount}
                onChange={(v) => setF("paid_amount", v)}
                type="number"
                dir="ltr"
              />
              <div>
                <Label>المتبقي</Label>
                <div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold">
                  {Math.max(
                    0,
                    (Number(form.total_amount) || 0) - (Number(form.paid_amount) || 0),
                  ).toLocaleString()}{" "}
                  ج.م
                </div>
              </div>
            </div>

            {/* جدولة الأقساط — تظهر فقط عند التقسيط */}
            {form.payment_status === "installment" ? (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-brand">جدولة الأقساط</div>
                <div className="space-y-2">
                  {installments.map((inst, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
                    >
                      <Input
                        type="number"
                        dir="ltr"
                        placeholder="المبلغ"
                        value={inst.amount}
                        className="w-32"
                        onChange={(e) => {
                          const n = [...installments];
                          n[i] = { ...n[i], amount: e.target.value };
                          setInstallments(n);
                        }}
                      />
                      <Input
                        type="date"
                        dir="ltr"
                        value={inst.due_date}
                        className="w-44"
                        onChange={(e) => {
                          const n = [...installments];
                          n[i] = { ...n[i], due_date: e.target.value };
                          setInstallments(n);
                        }}
                      />
                      <label className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={inst.paid}
                          onChange={(e) => {
                            const n = [...installments];
                            n[i] = { ...n[i], paid: e.target.checked };
                            setInstallments(n);
                          }}
                        />{" "}
                        مدفوع
                      </label>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setInstallments(installments.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setInstallments([...installments, { amount: "", due_date: "", paid: false }])
                    }
                  >
                    <Plus className="ml-1 h-4 w-4" /> إضافة قسط
                  </Button>
                </div>
              </div>
            ) : null}

            {/* إثبات الدفع */}
            <div className="mt-4">
              <ImageUpload
                label="إثبات الدفع (صورة/سكرين)"
                value={form.payment_proof_url}
                onChange={(v) => setF("payment_proof_url", v)}
                folder="payments"
              />
            </div>
          </div>
        ) : null}

        <div className="mt-4">
          <Label>ملاحظات وتفاصيل العيادات أو المواقع</Label>
          <Textarea
            className="mt-1.5"
            value={form.notes}
            onChange={(e) => setF("notes", e.target.value)}
          />
        </div>
        <Button onClick={saveClient} className="mt-4 gradient-hero text-brand-foreground">
          {editingId ? (
            <>
              <Save className="ml-2 h-4 w-4" /> حفظ التعديل
            </>
          ) : (
            <>
              <Plus className="ml-2 h-4 w-4" /> إضافة العميل
            </>
          )}
        </Button>
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم، العيادة، التخصص، الهاتف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* List */}
      <section className="grid gap-3">
        {filtered.map((r: any) => {
          const p = paymentOf(r.id);
          const st = PAYMENT_STATUS.find((s) => s.value === r.payment_status);
          return (
            <article
              key={r.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {r.logo_url ? (
                    <img
                      src={r.logo_url}
                      alt={r.doctor_name}
                      loading="lazy"
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-hero text-sm font-bold text-brand-foreground">
                      {(r.doctor_name || "?")[0]}
                    </div>
                  )}
                  <div>
                    <h2 className="text-lg font-bold">{r.doctor_name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {[r.clinic_name, r.specialty, r.phone].filter(Boolean).join(" • ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                    {PROJECT_STATUS.find((s) => s.value === r.project_status)?.label ??
                      r.project_status}
                  </span>
                  {st ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  ) : null}
                  <Button variant="ghost" size="icon" onClick={() => editClient(r)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeClient(r.id, r.doctor_name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {p && p.total_amount > 0 ? (
                <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-muted/50 px-4 py-2 text-sm">
                  <span>
                    الإجمالي: <b>{Number(p.total_amount).toLocaleString()}</b>
                  </span>
                  <span className="text-emerald-600">
                    المدفوع: <b>{Number(p.paid_amount).toLocaleString()}</b>
                  </span>
                  <span className="text-destructive">
                    المتبقي:{" "}
                    <b>
                      {Number(
                        p.remaining_amount ?? p.total_amount - p.paid_amount,
                      ).toLocaleString()}
                    </b>
                  </span>
                  {p.installment_count > 0 ? (
                    <span className="text-amber-600">
                      أقساط: <b>{p.installment_count}</b>
                    </span>
                  ) : null}
                  {p.next_due_date ? (
                    <span>
                      القسط القادم: <b>{p.next_due_date}</b>
                    </span>
                  ) : null}
                </div>
              ) : null}
              {r.notes && <p className="mt-3 text-sm text-muted-foreground">{r.notes}</p>}
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            {search ? "لا توجد نتائج." : "لا يوجد عملاء بعد."}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-foreground",
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className={`h-5 w-5 ${color}`} />
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-1.5"
        type={type}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
