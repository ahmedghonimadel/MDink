import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Download, ExternalLink, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { requireOperationsAdmin } from "@/lib/admin";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/doctor-applications")({
  beforeLoad: requireOperationsAdmin,
  component: DoctorApplicationsAdmin,
});

const STATUS_LABEL: Record<string, string> = {
  new: "جديد",
  reviewing: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

function DoctorApplicationsAdmin() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const { data: rows = [] } = useQuery({
    queryKey: ["doctor-applications"],
    queryFn: async () =>
      (await db.from("doctor_applications").select("*").order("created_at", { ascending: false }))
        .data ?? [],
  });

  async function setStatus(id: string, status: "approved" | "rejected" | "reviewing") {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db
      .from("doctor_applications")
      .update({ status, reviewed_by: u.user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("تم تحديث حالة الطلب");
      qc.invalidateQueries({ queryKey: ["doctor-applications"] });
    }
  }

  async function saveNote(id: string) {
    const { error } = await db
      .from("doctor_applications")
      .update({ internal_notes: noteDrafts[id] ?? "" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("تم حفظ الملاحظة");
      qc.invalidateQueries({ queryKey: ["doctor-applications"] });
    }
  }

  function exportRows() {
    exportTableAsExcel(
      "mdink-doctor-applications.xls",
      [
        "الاسم",
        "التخصص",
        "الهاتف",
        "البريد",
        "العيادة",
        "العنوان",
        "الفروع",
        "الخدمات المطلوبة",
        "الحالة",
        "المؤهلات",
        "النبذة",
        "ملاحظات داخلية",
        "تاريخ الطلب",
      ],
      rows.map((r: any) => [
        r.full_name,
        r.specialty,
        r.phone,
        r.email,
        r.clinic_name,
        r.clinic_address,
        (r.branches || []).join(" | "),
        (r.requested_services || []).join(", "),
        STATUS_LABEL[r.status] ?? r.status,
        r.qualifications,
        r.bio,
        r.internal_notes,
        new Date(r.created_at).toLocaleDateString("ar-EG"),
      ]),
    );
  }

  const filtered = filter === "all" ? rows : rows.filter((r: any) => r.status === filter);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">طلبات انضمام الأطباء</h1>
          <p className="mt-1 text-muted-foreground">
            مراجعة الطلبات العامة بدون إنشاء حسابات دخول تلقائية.
          </p>
        </div>
        <Button variant="outline" onClick={exportRows} disabled={!rows.length}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: `الكل (${rows.length})` },
          ...Object.entries(STATUS_LABEL).map(([k, v]) => ({
            key: k,
            label: `${v} (${rows.filter((r: any) => r.status === k).length})`,
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

      <div className="grid gap-4">
        {filtered.map((r: any) => (
          <article key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {r.photo_url ? (
                  <img
                    src={r.photo_url}
                    alt={r.full_name}
                    className="h-12 w-12 rounded-xl object-cover"
                  />
                ) : null}
                <div>
                  <h2 className="text-xl font-bold">{r.full_name}</h2>
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {[r.specialty, r.phone, r.email].filter(Boolean).join(" • ")}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>

            <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
              {r.clinic_name && (
                <p>
                  <b>العيادة:</b> {r.clinic_name}
                </p>
              )}
              {r.clinic_address && (
                <p>
                  <b>العنوان:</b> {r.clinic_address}
                </p>
              )}
              {Array.isArray(r.branches) && r.branches.length ? (
                <p className="md:col-span-2">
                  <b>الفروع:</b> {r.branches.join(" | ")}
                </p>
              ) : null}
              {r.bio && (
                <p className="md:col-span-2">
                  <b>النبذة:</b> {r.bio}
                </p>
              )}
              {r.qualifications && (
                <p className="md:col-span-2">
                  <b>المؤهلات:</b> {r.qualifications}
                </p>
              )}
            </div>

            {Array.isArray(r.requested_services) && r.requested_services.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {r.requested_services.map((s: string) => (
                  <span key={s} className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {r.certificates_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={r.certificates_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="ml-1 h-4 w-4" /> الشهادات
                  </a>
                </Button>
              )}
              {r.clinic_logo_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={r.clinic_logo_url} target="_blank" rel="noreferrer">
                    <ExternalLink className="ml-1 h-4 w-4" /> لوجو العيادة
                  </a>
                </Button>
              )}
            </div>

            {/* Internal notes */}
            <div className="mt-4">
              <Textarea
                placeholder="ملاحظات داخلية (لا تظهر للطبيب)…"
                value={noteDrafts[r.id] ?? r.internal_notes ?? ""}
                onChange={(e) => setNoteDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                rows={2}
              />
              <Button size="sm" variant="ghost" className="mt-1" onClick={() => saveNote(r.id)}>
                حفظ الملاحظة
              </Button>
            </div>

            <div className="mt-2 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "reviewing")}>
                <Clock className="ml-1 h-4 w-4" /> قيد المراجعة
              </Button>
              <Button
                size="sm"
                className="bg-brand text-brand-foreground"
                onClick={() => setStatus(r.id, "approved")}
              >
                <CheckCircle2 className="ml-1 h-4 w-4" /> موافقة
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "rejected")}>
                <XCircle className="ml-1 h-4 w-4" /> رفض
              </Button>
            </div>
          </article>
        ))}
        {!filtered.length && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا توجد طلبات في هذه الفئة.
          </div>
        )}
      </div>
    </div>
  );
}
