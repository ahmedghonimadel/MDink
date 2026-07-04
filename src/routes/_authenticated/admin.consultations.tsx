import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { requireOperationsAdmin } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/consultations")({
  beforeLoad: requireOperationsAdmin,
  component: ConsultationsAdmin,
});

const STATUS = {
  new: { label: "جديد", icon: Clock, color: "text-yellow-500" },
  contacted: { label: "تم التواصل", icon: MessageSquare, color: "text-blue-500" },
  converted: { label: "تحوّل لعميل", icon: CheckCircle2, color: "text-emerald-500" },
  lost: { label: "ملغي", icon: XCircle, color: "text-destructive" },
} as const;

function ConsultationsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["consultations-v2"],
    queryFn: async () =>
      (await db.from("consultations").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["clients-names"],
    queryFn: async () => (await db.from("clients").select("name")).data ?? [],
  });

  // نسبة التحويل
  const clientNames = new Set(
    clients.map((c: any) => (c.name || "").trim().toLowerCase()).filter(Boolean),
  );
  const convertedCount = rows.filter(
    (r: any) => clientNames.has((r.full_name || "").trim().toLowerCase()),
  ).length;
  const conversionRate = rows.length ? Math.round((convertedCount / rows.length) * 100) : 0;

  const filtered = filter === "all" ? rows : rows.filter((r: any) => r.status === filter);

  async function updateStatus(id: string, status: string) {
    const { error } = await db.from("consultations").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["consultations-v2"] });
    toast.success("تم تحديث الحالة");
  }

  async function remove(id: string) {
    if (!confirm("حذف هذه الاستشارة؟")) return;
    const { error } = await db.from("consultations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["consultations-v2"] });
    toast.success("تم الحذف");
  }

  function exportData() {
    exportTableAsExcel(
      "mdink-consultations.xls",
      [
        "الاسم",
        "الهاتف",
        "البريد",
        "التخصص",
        "الخدمة المطلوبة",
        "الرسالة",
        "الحالة",
        "تحوّل لعميل",
        "التاريخ",
      ],
      rows.map((r: any) => [
        r.full_name,
        r.phone,
        r.email,
        r.specialty,
        r.preferred_service,
        r.message,
        STATUS[r.status as keyof typeof STATUS]?.label ?? r.status,
        r.converted ? "نعم" : "لا",
        new Date(r.created_at).toLocaleDateString("ar-EG"),
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">الاستشارات المجانية</h1>
          <p className="mt-1 text-muted-foreground">
            شيت منفصل عن العملاء — لقياس كفاءة المبيعات ونسبة التحويل.
          </p>
        </div>
        <Button variant="outline" onClick={exportData} disabled={!rows.length}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      {/* Conversion stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          <div className="mt-2 text-2xl font-bold">{rows.length}</div>
          <div className="text-sm text-muted-foreground">إجمالي الاستشارات</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <div className="mt-2 text-2xl font-bold">{convertedCount}</div>
          <div className="text-sm text-muted-foreground">تحوّلوا لعملاء دفع</div>
        </div>
        <div className="rounded-2xl border border-brand/30 bg-brand/5 p-5 shadow-card">
          <TrendingUp className="h-5 w-5 text-brand" />
          <div className="mt-2 text-2xl font-bold text-brand">{conversionRate}%</div>
          <div className="text-sm text-muted-foreground">نسبة التحويل (Conversion Rate)</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: `الكل (${rows.length})` },
          ...Object.entries(STATUS).map(([k, v]) => ({
            key: k,
            label: `${v.label} (${rows.filter((r: any) => r.status === k).length})`,
          })),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${filter === tab.key ? "gradient-hero text-brand-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r: any) => {
          const st = STATUS[r.status as keyof typeof STATUS] ?? STATUS.new;
          const Icon = st.icon;
          return (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.full_name}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${st.color}`}>
                      <Icon className="h-3.5 w-3.5" /> {st.label}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground" dir="ltr">
                    {[r.phone, r.email].filter(Boolean).join(" · ")}
                  </div>
                  {r.specialty ? (
                    <div className="mt-1 text-xs text-brand">التخصص: {r.specialty}</div>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("ar-EG")}
                </div>
              </div>
              {r.message ? <p className="mt-3 text-sm leading-relaxed">{r.message}</p> : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">الحالة:</span>
                {Object.entries(STATUS).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => updateStatus(r.id, key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${r.status === key ? "gradient-hero text-brand-foreground" : "border border-border hover:bg-accent"}`}
                  >
                    {val.label}
                  </button>
                ))}
                <Button size="sm" variant="ghost" className="mr-auto" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            لا توجد استشارات في هذه الفئة.
          </div>
        )}
      </div>
    </div>
  );
}
