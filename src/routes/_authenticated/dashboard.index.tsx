import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Globe2,
  MessageSquare,
  ReceiptText,
} from "lucide-react";
import { getAdminSession } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: DashboardHome,
});

function DashboardHome() {
  const db = supabase as any;
  const { data: session } = useQuery({
    queryKey: ["admin-session"],
    queryFn: getAdminSession,
  });

  const { data: counts } = useQuery({
    queryKey: ["mdink-dashboard-counts", session?.user.id],
    queryFn: async () => {
      const [leads, applications, clients, portfolio, blogs, payments] = await Promise.all([
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
        db.from("blog_posts").select("*", { count: "exact", head: true }).eq("is_published", true),
        db
          .from("client_payments")
          .select("*", { count: "exact", head: true })
          .neq("payment_status", "paid"),
      ]);
      return {
        leads: leads.count ?? 0,
        applications: applications.count ?? 0,
        clients: clients.count ?? 0,
        portfolio: portfolio.count ?? 0,
        blogs: blogs.count ?? 0,
        payments: payments.count ?? 0,
      };
    },
  });

  const isTeamOnly =
    session?.roles.includes("team_member") &&
    !session?.isWebsiteAdmin &&
    !session?.isOperationsAdmin &&
    !session?.isSuperAdmin;
  const cards = [
    {
      icon: MessageSquare,
      label: "طلبات تواصل جديدة",
      value: counts?.leads ?? "—",
      to: "/admin/leads",
    },
    {
      icon: ClipboardList,
      label: "طلبات أطباء جديدة",
      value: counts?.applications ?? "—",
      to: "/admin/doctor-applications",
    },
    {
      icon: BriefcaseBusiness,
      label: "عملاء MDink",
      value: counts?.clients ?? "—",
      to: "/admin/clients",
    },
    {
      icon: Globe2,
      label: "أعمال منشورة",
      value: counts?.portfolio ?? "—",
      to: "/admin/portfolio",
    },
    { icon: FileText, label: "مقالات منشورة", value: counts?.blogs ?? "—", to: "/admin/blogs" },
    {
      icon: ReceiptText,
      label: "مدفوعات قيد المتابعة",
      value: session?.isSuperAdmin ? (counts?.payments ?? "—") : "محجوبة",
      to: "/admin/clients",
    },
  ];

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-brand">MDink CMS</p>
        <h1 className="mt-2 text-3xl font-bold">لوحة تحكم الشركة</h1>
        <p className="mt-1 text-muted-foreground">
          إدارة صفحات الموقع، طلبات العملاء، أعمال الفريق، والمحتوى المنشور من مكان واحد.
        </p>
      </header>

      {isTeamOnly ? (
        <TeamMemberHome />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.label}
              to={card.to as never}
              className="rounded-2xl border border-border bg-card p-5 shadow-card transition hover:border-brand/40 hover:shadow-brand"
            >
              <card.icon className="h-5 w-5 text-brand" />
              <div className="mt-3 text-3xl font-bold">{card.value}</div>
              <div className="text-sm text-muted-foreground">{card.label}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamMemberHome() {
  const db = supabase as any;
  const { data: userData } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const { data: profile } = useQuery({
    queryKey: ["my-team-profile"],
    queryFn: async () =>
      (
        await db
          .from("team_profiles")
          .select("*")
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle()
      ).data,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["my-tasks-summary", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () =>
      (
        await db
          .from("team_work_logs")
          .select("*")
          .eq("user_id", userData?.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = tasks.filter((t: any) => t.work_date === today).length;
  const inProgress = tasks.filter((t: any) =>
    ["in_progress", "pending", "not_started"].includes(t.status),
  ).length;
  const overdue = tasks.filter(
    (t: any) =>
      t.due_date &&
      t.due_date < today &&
      !["completed", "delivered", "approved"].includes(t.status),
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <ClipboardList className="h-5 w-5 text-brand" />
          <div className="mt-2 text-3xl font-bold">{todayCount}</div>
          <div className="text-sm text-muted-foreground">مهام اليوم</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <BriefcaseBusiness className="h-5 w-5 text-amber-500" />
          <div className="mt-2 text-3xl font-bold">{inProgress}</div>
          <div className="text-sm text-muted-foreground">قيد التنفيذ</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <MessageSquare className="h-5 w-5 text-destructive" />
          <div className="mt-2 text-3xl font-bold">{overdue}</div>
          <div className="text-sm text-muted-foreground">متأخرة</div>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">آخر مهامي</h2>
          <Link
            to="/dashboard/tasks"
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
          >
            تسجيل مهمة جديدة
          </Link>
        </div>
        {!profile ? (
          <p className="mt-4 text-sm text-muted-foreground">
            أكمل بياناتك المهنية أولاً من صفحة "بياناتي المهنية".
          </p>
        ) : tasks.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            لا توجد مهام مسجلة بعد. ابدأ بتسجيل أول مهمة.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {tasks.slice(0, 8).map((t: any) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border border-border p-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.title || t.task_type}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.role_title} · {t.work_date}
                  </div>
                </div>
                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
