import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const protectedAdmins = new Set(["shfahmy2010@gmail.com", "tasneemfahmy21@gmail.com"]);

// خريطة الدور المختار في الفورم → صلاحيات النظام:
//  admin  = admin_users.role  (مصدر الوصول للتطبيق — يقرأه getAdminSession والحماية)
//  user   = user_roles.role   (لـ is_admin في RLS: moderator/admin ⇒ صلاحية تعديل محتوى الموقع)
//  job    = دور وظيفي يُخزَّن في team_profiles للعرض وتوزيع المهام
type RoleTarget = { admin: string; user: string; job?: string };
const ROLE_MAP: Record<string, RoleTarget> = {
  website_admin: { admin: "editor", user: "moderator" },
  accountant: { admin: "accountant", user: "viewer" },
  content_writer: { admin: "viewer", user: "team_member", job: "content_writer" },
  video_editor: { admin: "viewer", user: "team_member", job: "video_editor" },
  graphic_designer: { admin: "viewer", user: "team_member", job: "graphic_designer" },
  photographer: { admin: "viewer", user: "team_member", job: "photographer" },
  moderator: { admin: "viewer", user: "team_member", job: "moderator" },
  medical_reviewer: { admin: "viewer", user: "team_member", job: "medical_reviewer" },
  web_developer: { admin: "viewer", user: "team_member", job: "web_developer" },
  custom: { admin: "viewer", user: "team_member", job: "custom" },
};
// دور السوبر أدمن مثبّت للإيميلين المحميّين فقط — غير متاح للاختيار من الفورم.
const SUPER_TARGET: RoleTarget = { admin: "admin", user: "super_admin" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("PROJECT_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey =
    Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey)
    return json({ error: "Supabase function environment is not configured" }, 500);

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // المتصل لازم يكون أدمن. نقبله عبر أي مصدر من الثلاثة (النظام فيه أكثر من جدول أدوار):
  //  (1) أحد الإيميلين المحميّين، أو (2) user_roles=super_admin/admin، أو (3) admin_users.role=admin.
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json({ error: "Unauthorized" }, 401);

  const callerEmail = (callerData.user.email ?? "").toLowerCase();
  const isProtectedAdmin = protectedAdmins.has(callerEmail);

  // user_roles (قد يفشل بسبب RLS — نتجاهله بدل الفشل)
  const { data: callerRoles } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerData.user.id);
  const hasAdminRole = (callerRoles ?? []).some((r) => ["super_admin", "admin"].includes(r.role));

  // admin_users (مصدر وصول التطبيق) — نقرأه بمفتاح الخدمة لتجاوز RLS
  const { data: callerAdmin } = await adminClient
    .from("admin_users")
    .select("role,is_active")
    .eq("user_id", callerData.user.id)
    .maybeSingle();
  const isAppAdmin = !!callerAdmin?.is_active && callerAdmin.role === "admin";

  if (!isProtectedAdmin && !hasAdminRole && !isAppAdmin)
    return json({ error: "Only admins can create users" }, 403);

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.full_name ?? "").trim();
  const role = String(body?.role ?? "");
  const customRole = String(body?.custom_role ?? "").trim();

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ error: "Invalid email" }, 400);
  if (!fullName || fullName.length < 2) return json({ error: "Full name is required" }, 400);
  if (!password || password.length < 8 || password.length > 72)
    return json({ error: "Password must be 8-72 characters" }, 400);
  if (!ROLE_MAP[role]) return json({ error: "Invalid role" }, 400);
  if (role === "custom" && customRole.length < 2)
    return json({ error: "Custom role name is required" }, 400);

  // الإيميلان المحميّان دائمًا سوبر أدمن؛ الباقي حسب الخريطة (لا سوبر أدمن أبدًا)
  const target: RoleTarget = protectedAdmins.has(email) ? SUPER_TARGET : ROLE_MAP[role];
  const jobRole = target.job === "custom" ? customRole : target.job;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createError && !createError.message.toLowerCase().includes("already"))
    return json({ error: createError.message }, 400);

  let userId = created?.user?.id;
  if (!userId) {
    const { data: list, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) return json({ error: listError.message }, 500);
    userId = list.users.find((u) => u.email?.toLowerCase() === email)?.id;
  }
  if (!userId) return json({ error: "Could not resolve user id" }, 500);

  const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({ id: userId, username, full_name: fullName, email, is_published: false });
  if (profileError) return json({ error: profileError.message }, 500);

  // user_roles — لأجل is_admin في RLS
  const { error: urErr } = await adminClient
    .from("user_roles")
    .upsert({ user_id: userId, role: target.user }, { onConflict: "user_id,role" });
  if (urErr) return json({ error: urErr.message }, 500);

  // admin_users — مصدر الوصول للتطبيق (هذا ما كان ناقصًا: بدونه لا يستطيع المستخدم الدخول)
  const { error: auErr } = await adminClient
    .from("admin_users")
    .upsert(
      { user_id: userId, email, role: target.admin, is_active: true },
      { onConflict: "user_id" },
    );
  if (auErr) return json({ error: auErr.message }, 500);

  // team_profiles — للأدوار الوظيفية (عرض + توزيع مهام). أفضل جهد: لا نُفشل الإنشاء إن تعذّر.
  if (jobRole) {
    const { error: tpErr } = await adminClient
      .from("team_profiles")
      .upsert(
        {
          user_id: userId,
          name_ar: fullName,
          email,
          roles: [jobRole],
          account_status: "active",
        },
        { onConflict: "user_id" },
      );
    if (tpErr) console.error("[create-admin-user] team_profiles upsert failed:", tpErr.message);
  }

  return json({ ok: true, user_id: userId, role: target.admin, job_role: jobRole ?? null });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
