import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  Contact,
  FileSpreadsheet,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Newspaper,
  Shield,
  SlidersHorizontal,
  SquareActivity,
  Star,
  Users,
  UserCog,
  X,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { NotificationsBell } from "@/components/NotificationsBell";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAdminSession, type AdminSession } from "@/lib/admin";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  head: () => ({ meta: [{ name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    const email = data.user.email?.toLowerCase() ?? "";
    const isCoreAdmin = ["shfahmy2010@gmail.com", "tasneemfahmy21@gmail.com"].includes(email);
    if (!isCoreAdmin) {
      const { data: adminRow } = await (supabase as any)
        .from("admin_users")
        .select("is_active")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!adminRow || !adminRow.is_active) {
        throw redirect({ to: "/auth" });
      }
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    getAdminSession().then(setSession);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      {mobileNavOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-64 flex-col border-l border-border bg-card transition-transform lg:translate-x-0 lg:flex ${
          mobileNavOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-6">
          <Logo size={36} />
          <button
            onClick={() => setMobileNavOpen(false)}
            className="lg:hidden"
            aria-label="إغلاق القائمة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav
          className="flex-1 space-y-1 overflow-y-auto p-4"
          onClick={() => setMobileNavOpen(false)}
        >
          <SideLink to="/dashboard" icon={BarChart3}>
            نظرة عامة
          </SideLink>
          {session?.isWebsiteAdmin && (
            <>
              <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
                إدارة الموقع
              </div>
              <SideLink to="/admin/home" icon={Home}>
                الصفحة الرئيسية
              </SideLink>
              <SideLink to="/admin/services" icon={BriefcaseBusiness}>
                الخدمات
              </SideLink>
              <SideLink to="/admin/portfolio" icon={SquareActivity}>
                الأعمال
              </SideLink>
              <SideLink to="/admin/reviews" icon={Star}>
                آراء عملائنا
              </SideLink>
              <SideLink to="/admin/blogs" icon={Newspaper}>
                المدونة
              </SideLink>
              <SideLink to="/admin/about" icon={UserCog}>
                من نحن والفريق
              </SideLink>
              <SideLink to="/admin/contact-settings" icon={Contact}>
                التواصل والسوشيال
              </SideLink>
              {/* إعدادات SEO أصبحت تلقائية بالكامل من الكود (عناوين/أوصاف/سكيمة/
                  canonical/sitemap) — لا حاجة لصفحة إعداد يدوية. */}
            </>
          )}
          {(session?.isOperationsAdmin || session?.isSuperAdmin) && (
            <>
              <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
                إدارة العمليات
              </div>
              <SideLink to="/admin/leads" icon={MessageSquare}>
                طلبات العملاء / Leads
              </SideLink>
              <SideLink to="/admin/clients" icon={Users}>
                العملاء والمدفوعات
              </SideLink>
              <SideLink to="/admin/payments" icon={CircleDollarSign}>
                المدفوعات
              </SideLink>
              <SideLink to="/admin/team-tasks" icon={ClipboardList}>
                مهام الفريق
              </SideLink>
              <SideLink to="/admin/exports" icon={FileSpreadsheet}>
                تصدير Excel
              </SideLink>
            </>
          )}
          {/* محاسب فقط (بلا صلاحيات عمليات) — قسم مالي مستقل */}
          {session?.isAccountant && !session?.isOperationsAdmin && (
            <>
              <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">المالية</div>
              <SideLink to="/admin/payments" icon={CircleDollarSign}>
                المدفوعات
              </SideLink>
            </>
          )}
          {session?.isSuperAdmin && (
            <>
              <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
                Super Admin
              </div>
              <SideLink to="/admin/team" icon={Shield}>
                المستخدمون والصلاحيات
              </SideLink>
              <SideLink to="/admin/team-profiles" icon={UserCog}>
                بروفايلات الفريق
              </SideLink>
              <SideLink to="/admin/audit-logs" icon={Shield}>
                سجل النشاط
              </SideLink>
              <SideLink to="/admin/settings" icon={SlidersHorizontal}>
                إعدادات متقدمة
              </SideLink>
            </>
          )}
          {/* مساحة "مهامي" تظهر لأي مستخدم — بما فيهم الأدمن (يقدروا يسجّلوا شغلهم في الفريق بجانب الإدارة) */}
          <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">مهامي الشخصية</div>
          <SideLink to="/dashboard/tasks" icon={SquareActivity}>
            تسجيل عملي في الفريق
          </SideLink>
          <SideLink to="/dashboard/onboarding" icon={UserCog}>
            بياناتي المهنية
          </SideLink>
        </nav>
        <div className="shrink-0 border-t border-border p-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:mr-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-lg sm:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setMobileNavOpen(true)} aria-label="فتح القائمة">
              <Menu className="h-6 w-6" />
            </button>
            <Logo size={32} />
          </div>
          <div className="flex items-center gap-3">
            <NotificationsBell />
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              عرض الموقع العام ←
            </Link>
          </div>
          <button
            onClick={signOut}
            className="lg:hidden text-sm text-muted-foreground"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideLink({
  to,
  icon: Icon,
  children,
}: {
  to: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to as never}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      activeProps={{ className: "bg-brand/10 text-brand" }}
      activeOptions={{ exact: true }}
    >
      <Icon className="h-4 w-4" /> {children}
    </Link>
  );
}
