import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Search,
  Save,
  X,
  Wallet,
  TrendingUp,
  AlertTriangle,
  CircleDollarSign,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireFinancialAccess } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";
import { ImageUpload } from "@/components/ImageUpload";

export const Route = createFileRoute("/_authenticated/admin/payments")({
  beforeLoad: requireFinancialAccess,
  component: PaymentsAdmin,
});

const PAYMENT_STATUS = [
  { value: "paid", label: "تم الدفع بالكامل", color: "bg-emerald-500/15 text-emerald-600" },
  { value: "installment", label: "يتم التقسيط", color: "bg-amber-500/15 text-amber-600" },
  { value: "unpaid", label: "لم يدفع", color: "bg-destructive/15 text-destructive" },
];

const emptyForm = {
  total_amount: "",
  paid_amount: "",
  payment_status: "unpaid",
  next_due_date: "",
  payment_proof_url: "",
};

function PaymentsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: clients = [] } = useQuery({
    queryKey: ["payments-clients"],
    queryFn: async () =>
      (await db.from("clients").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  const { data: payments = [] } = useQuery({
    queryKey: ["payments-records"],
    queryFn: async () => (await db.from("client_payments").select("*")).data ?? [],
  });

  const paymentOf = (clientId: string) => payments.find((p: any) => p.client_id === clientId);

  const remainingOf = (p: any) =>
    p ? Number(p.remaining_amount ?? Number(p.total_amount) - Number(p.paid_amount)) : 0;

  // إجماليات مالية
  const totals = {
    collected: payments.reduce((s: number, p: any) => s + Number(p.paid_amount || 0), 0),
    outstanding: payments.reduce((s: number, p: any) => s + Math.max(0, remainingOf(p)), 0),
    installment: clients.filter((c: any) => c.payment_status === "installment").length,
    missing: clients.filter(
      (c: any) =>
        ["active", "delivered"].includes(c.project_status) &&
        !(paymentOf(c.id) && Number(paymentOf(c.id).total_amount) > 0),
    ).length,
  };

  function startEdit(c: any) {
    const p = paymentOf(c.id);
    setEditingId(c.id);
    setForm({
      total_amount: p?.total_amount ? String(p.total_amount) : "",
      paid_amount: p?.paid_amount ? String(p.paid_amount) : "",
      payment_status: c.payment_status ?? "unpaid",
      next_due_date: p?.next_due_date ?? "",
      payment_proof_url: p?.proof_url ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function savePayment(c: any) {
    const total = Number(form.total_amount) || 0;
    const paid = Number(form.paid_amount) || 0;

    // حدّث حالة الدفع على العميل نفسه (لتناسق الشارات عبر الصفحات)
    const { error: cErr } = await db
      .from("clients")
      .update({ payment_status: form.payment_status })
      .eq("id", c.id);
    if (cErr) return toast.error(cErr.message);

    // سجّل/حدّث سجل الدفع فقط عند وجود مبلغ أو حالة غير «لم يدفع»
    if (total > 0 || paid > 0 || form.payment_status !== "unpaid") {
      const payload = {
        client_id: c.id,
        client_name: c.doctor_name,
        service_name: c.package_name || "MDink package",
        total_amount: total,
        paid_amount: paid,
        payment_status: form.payment_status,
        next_due_date: form.payment_status === "installment" ? form.next_due_date || null : null,
        proof_url: form.payment_proof_url.trim() || null,
      };
      const existing = paymentOf(c.id);
      const { error: pErr } = existing
        ? await db.from("client_payments").update(payload).eq("id", existing.id)
        : await db.from("client_payments").insert(payload);
      if (pErr) return toast.error(pErr.message);
    }

    toast.success("تم حفظ بيانات الدفع ✓");
    cancelEdit();
    qc.invalidateQueries({ queryKey: ["payments-clients"] });
    qc.invalidateQueries({ queryKey: ["payments-records"] });
    qc.invalidateQueries({ queryKey: ["clients-v2"] });
    qc.invalidateQueries({ queryKey: ["client-payments-v2"] });
  }

  const filtered = clients.filter((c: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [c.doctor_name, c.clinic_name, c.phone].some((v) => (v || "").toLowerCase().includes(q));
  });

  function exportPayments() {
    exportTableAsExcel(
      "mdink-payments.xls",
      ["العميل", "الهاتف", "الحالة", "الإجمالي", "المدفوع", "المتبقي", "القسط القادم"],
      filtered.map((c: any) => {
        const p = paymentOf(c.id);
        return [
          c.doctor_name,
          c.phone,
          PAYMENT_STATUS.find((s) => s.value === c.payment_status)?.label ?? c.payment_status,
          p?.total_amount ?? 0,
          p?.paid_amount ?? 0,
          p ? Math.max(0, remainingOf(p)) : 0,
          p?.next_due_date ?? "",
        ];
      }),
    );
  }

  const setF = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">المدفوعات</h1>
          <p className="mt-1 text-muted-foreground">
            متابعة المبالغ المحصّلة والمتبقية والأقساط — سجّل «خدنا كام» لكل عميل.
          </p>
        </div>
        <Button variant="outline" onClick={exportPayments}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      {/* إجماليات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CircleDollarSign}
          label="إجمالي المحصّل"
          value={`${totals.collected.toLocaleString()} ج.م`}
          color="text-emerald-500"
        />
        <StatCard
          icon={Wallet}
          label="المتبقي (مستحقات)"
          value={`${totals.outstanding.toLocaleString()} ج.م`}
          color="text-destructive"
        />
        <StatCard
          icon={TrendingUp}
          label="عملاء بالتقسيط"
          value={String(totals.installment)}
          color="text-amber-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="بحاجة لتسجيل مبلغ"
          value={String(totals.missing)}
          color="text-amber-600"
        />
      </div>

      {totals.missing > 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <b>{totals.missing}</b> عميل نشط لم يُسجَّل له مبلغ الدفع بعد. سجّل «خدنا كام» من زر التعديل.
          </span>
        </div>
      ) : null}

      {/* بحث */}
      <div className="relative">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم أو الهاتف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      {/* قائمة العملاء والمدفوعات */}
      <section className="grid gap-3">
        {filtered.map((c: any) => {
          const p = paymentOf(c.id);
          const st = PAYMENT_STATUS.find((s) => s.value === c.payment_status);
          const remaining = p ? Math.max(0, remainingOf(p)) : 0;
          const isEditing = editingId === c.id;
          const needsAmount =
            ["active", "delivered"].includes(c.project_status) && !(p && Number(p.total_amount) > 0);
          return (
            <article key={c.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold">{c.doctor_name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[c.clinic_name, c.phone].filter(Boolean).join(" • ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {st ? (
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.color}`}>
                      {st.label}
                    </span>
                  ) : null}
                  {needsAmount ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" /> سجّل المبلغ
                    </span>
                  ) : null}
                  <Button variant="outline" size="sm" onClick={() => (isEditing ? cancelEdit() : startEdit(c))}>
                    {isEditing ? (
                      <>
                        <X className="ml-1 h-4 w-4" /> إلغاء
                      </>
                    ) : (
                      "تسجيل / تعديل الدفع"
                    )}
                  </Button>
                </div>
              </div>

              {p && Number(p.total_amount) > 0 ? (
                <div className="mt-3 flex flex-wrap gap-4 rounded-lg bg-muted/50 px-4 py-2 text-sm">
                  <span>
                    الإجمالي: <b>{Number(p.total_amount).toLocaleString()}</b>
                  </span>
                  <span className="text-emerald-600">
                    المدفوع: <b>{Number(p.paid_amount).toLocaleString()}</b>
                  </span>
                  <span className="text-destructive">
                    المتبقي: <b>{remaining.toLocaleString()}</b>
                  </span>
                  {p.next_due_date ? (
                    <span>
                      القسط القادم: <b>{p.next_due_date}</b>
                    </span>
                  ) : null}
                </div>
              ) : null}

              {isEditing ? (
                <div className="mt-4 rounded-xl border border-border bg-background/50 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <Label>حالة الدفع</Label>
                      <select
                        value={form.payment_status}
                        onChange={(e) => setF("payment_status", e.target.value)}
                        className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {PAYMENT_STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>إجمالي المتفق عليه</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        className="mt-1.5"
                        value={form.total_amount}
                        onChange={(e) => setF("total_amount", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>المدفوع (خدنا كام)</Label>
                      <Input
                        type="number"
                        dir="ltr"
                        className="mt-1.5"
                        value={form.paid_amount}
                        onChange={(e) => setF("paid_amount", e.target.value)}
                      />
                    </div>
                    {form.payment_status === "installment" ? (
                      <div>
                        <Label>تاريخ القسط القادم</Label>
                        <Input
                          type="date"
                          dir="ltr"
                          className="mt-1.5"
                          value={form.next_due_date}
                          onChange={(e) => setF("next_due_date", e.target.value)}
                        />
                      </div>
                    ) : null}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                        المتبقي:{" "}
                        <b>
                          {Math.max(
                            0,
                            (Number(form.total_amount) || 0) - (Number(form.paid_amount) || 0),
                          ).toLocaleString()}{" "}
                          ج.م
                        </b>
                      </div>
                    </div>
                  </div>
                  {form.payment_status !== "unpaid" ? (
                    <div className="mt-3">
                      <ImageUpload
                        label="إثبات الدفع (صورة/سكرين)"
                        value={form.payment_proof_url}
                        onChange={(v) => setF("payment_proof_url", v)}
                        folder="payments"
                      />
                    </div>
                  ) : null}
                  <Button
                    onClick={() => savePayment(c)}
                    className="mt-4 gradient-hero text-brand-foreground"
                  >
                    <Save className="ml-2 h-4 w-4" /> حفظ الدفع
                  </Button>
                </div>
              ) : null}
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
  color = "text-foreground",
}: {
  icon: any;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <Icon className={`h-5 w-5 ${color}`} />
      <div className="mt-2 text-xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
