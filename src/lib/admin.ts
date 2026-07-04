import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const SUPER_ADMIN_EMAILS = ["shfahmy2010@gmail.com", "tasneemfahmy21@gmail.com"];

export type MdinkRole =
  | "super_admin"
  | "website_admin"
  | "operations_admin"
  | "team_member"
  | "viewer"
  | "admin"
  | "moderator"
  | "doctor";

export type AdminSession = {
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>;
  roles: MdinkRole[];
  isSuperAdmin: boolean;
  isWebsiteAdmin: boolean;
  isOperationsAdmin: boolean;
  isTeamMember: boolean;
};

const websiteRoles = new Set<MdinkRole>(["super_admin", "website_admin", "admin", "moderator"]);
const operationsRoles = new Set<MdinkRole>(["super_admin", "operations_admin", "admin"]);
const dashboardRoles = new Set<MdinkRole>([
  "super_admin",
  "website_admin",
  "operations_admin",
  "team_member",
  "viewer",
  "admin",
  "moderator",
]);

export async function getAdminSession(): Promise<AdminSession | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const email = data.user.email?.toLowerCase() ?? "";
  const isCoreAdmin = SUPER_ADMIN_EMAILS.includes(email);

  // اقرأ صف admin_users الخاص بالمستخدم (schema الجديد)
  const { data: adminRow } = await (supabase as any)
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const dashRole: string = adminRow?.is_active ? adminRow.role : "";
  // خريطة أدوار admin_users → الأدوار الداخلية
  const roles: MdinkRole[] = [];
  if (isCoreAdmin || dashRole === "admin") roles.push("super_admin", "website_admin", "operations_admin", "admin");
  else if (dashRole === "editor") roles.push("website_admin");
  else if (dashRole === "viewer") roles.push("viewer");

  return {
    user: data.user,
    roles,
    isSuperAdmin: isCoreAdmin || dashRole === "admin",
    isWebsiteAdmin: isCoreAdmin || dashRole === "admin" || dashRole === "editor",
    isOperationsAdmin: isCoreAdmin || dashRole === "admin",
    isTeamMember: false,
  };
}

export async function requireDashboard() {
  const session = await getAdminSession();
  if (!session) throw redirect({ to: "/auth" });
  if (!session.roles.some((role) => dashboardRoles.has(role))) throw redirect({ to: "/auth" });
  return session;
}

export async function requireWebsiteAdmin() {
  const session = await requireDashboard();
  if (!session.isWebsiteAdmin) throw redirect({ to: "/dashboard" });
  return session;
}

export async function requireOperationsAdmin() {
  const session = await requireDashboard();
  if (!session.isOperationsAdmin) throw redirect({ to: "/dashboard" });
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireDashboard();
  if (!session.isSuperAdmin) throw redirect({ to: "/dashboard" });
  return session;
}

export function hasAnyRole(roles: MdinkRole[], allowed: MdinkRole[]) {
  return roles.some((role) => allowed.includes(role));
}
