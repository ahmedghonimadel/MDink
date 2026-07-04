import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { requireSuperAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportTableAsExcel } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/admin/audit-logs")({
  beforeLoad: requireSuperAdmin,
  component: AuditLogsAdmin,
});

const ACTION_LABEL: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  login: "دخول",
  export: "تصدير",
  role_change: "تغيير صلاحية",
};

function AuditLogsAdmin() {
  const db = supabase as any;
  const [search, setSearch] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () =>
      (await db.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500))
        .data ?? [],
  });

  const filtered = logs.filter((l: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return [l.actor_email, l.action, l.entity, l.entity_id].some((v) =>
      (v || "").toLowerCase().includes(q),
    );
  });

  function exportLogs() {
    exportTableAsExcel(
      "mdink-audit-logs.xls",
      ["المستخدم", "الإجراء", "العنصر", "المعرّف", "التاريخ"],
      filtered.map((l: any) => [
        l.actor_email,
        ACTION_LABEL[l.action] ?? l.action,
        l.entity,
        l.entity_id,
        new Date(l.created_at).toLocaleString("ar-EG"),
      ]),
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">سجل النشاط</h1>
          <p className="mt-1 text-muted-foreground">
            سجل بكل العمليات الحساسة: من فعل ماذا ومتى (إنشاء، تعديل، حذف، تغيير صلاحيات، تصدير).
          </p>
        </div>
        <Button variant="outline" onClick={exportLogs} disabled={!filtered.length}>
          <Download className="ml-2 h-4 w-4" /> تصدير Excel
        </Button>
      </header>

      <div className="relative">
        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="بحث بالمستخدم، الإجراء، العنصر…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-right">المستخدم</th>
                <th className="px-4 py-3 text-right">الإجراء</th>
                <th className="px-4 py-3 text-right">العنصر</th>
                <th className="px-4 py-3 text-right">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l: any) => (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3" dir="ltr">
                    {l.actor_email || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      {ACTION_LABEL[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {l.entity}
                    {l.entity_id ? (
                      <span className="text-muted-foreground"> · {l.entity_id}</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("ar-EG")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="p-10 text-center text-muted-foreground">
            {search ? "لا توجد نتائج مطابقة." : "لا يوجد نشاط مسجّل بعد."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
