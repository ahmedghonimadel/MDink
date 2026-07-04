import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness, ClipboardList, Globe2, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { requireDashboard } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: requireDashboard,
  component: AdminHome,
});

function AdminHome() {
  const db = supabase as any;
  const { data: counts } = useQuery({
    queryKey: ["admin-overview-counts"],
    queryFn: async () => {
      const [leads, applications, clients, published] = await Promise.all([
        db.from("contact_submissions").select("*", { count: "exact", head: true }).eq("status", "new"),
        db
          .from("doctor_applications")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        db.from("clients").select("*", { count: "exact", head: true }),
        db
          .from("portfolio_projects")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
      ]);
      return {
        leads: leads.count ?? 0,
        applications: applications.count ?? 0,
        clients: clients.count ?? 0,
        published: published.count ?? 0,
      };
    },
  });

  const cards = [
    {
      icon: MessageSquare,
      label: "طلبات تواصل جديدة",
      value: counts?.leads ?? "—",
      to: "/admin/leads",
    },
    {
      icon: ClipboardList,
      label: "طلبات انضمام أطباء",
      value: counts?.applications ?? "—",
      to: "/admin/doctor-applications",
    },
    {
      icon: BriefcaseBusiness,
      label: "عملاء الشركة",
      value: counts?.clients ?? "—",
      to: "/admin/clients",
    },
    {
      icon: Globe2,
      label: "أعمال منشورة",
      value: counts?.published ?? "—",
      to: "/admin/portfolio",
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة MDink</h1>
        <p className="mt-1 text-muted-foreground">اختصار سريع لأهم أقسام المحتوى والعمليات.</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to as never}
            className="rounded-2xl border border-border bg-card p-6 shadow-card transition hover:border-brand/40 hover:shadow-brand"
          >
            <card.icon className="h-5 w-5 text-brand" />
            <div className="mt-3 text-3xl font-bold">{card.value}</div>
            <div className="text-xs text-muted-foreground">{card.label}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
