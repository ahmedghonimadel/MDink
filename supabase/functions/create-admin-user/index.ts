import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole =
  | "super_admin"
  | "website_admin"
  | "operations_admin"
  | "team_member"
  | "viewer"
  | "admin"
  | "moderator";

const protectedAdmins = new Set(["shfahmy2010@gmail.com", "tasneemfahmy21@gmail.com"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("PROJECT_URL") ?? Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("PROJECT_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey =
    Deno.env.get("PROJECT_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Supabase function environment is not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) {
    return json({ error: "Unauthorized" }, 401);
  }

  const { data: callerRoles, error: rolesError } = await callerClient
    .from("user_roles")
    .select("role")
    .eq("user_id", callerData.user.id);

  if (rolesError) return json({ error: rolesError.message }, 500);
  const callerEmail = (callerData.user.email ?? "").toLowerCase();
  const isProtectedAdmin = protectedAdmins.has(callerEmail);
  const hasAdminRole = (callerRoles ?? []).some((row) =>
    ["super_admin", "admin"].includes(row.role),
  );
  if (!isProtectedAdmin && !hasAdminRole)
    return json({ error: "Only admins can create users" }, 403);

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  const fullName = String(body?.full_name ?? "").trim();
  const role = String(body?.role ?? "team_member") as AppRole;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return json({ error: "Invalid email" }, 400);
  if (!fullName || fullName.length < 2) return json({ error: "Full name is required" }, 400);
  if (!password || password.length < 8 || password.length > 72)
    return json({ error: "Password must be 8-72 characters" }, 400);
  if (
    ![
      "super_admin",
      "website_admin",
      "operations_admin",
      "team_member",
      "viewer",
      "admin",
      "moderator",
    ].includes(role)
  )
    return json({ error: "Invalid role" }, 400);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    return json({ error: createError.message }, 400);
  }

  let userId = created?.user?.id;
  if (!userId) {
    const { data: list, error: listError } = await adminClient.auth.admin.listUsers();
    if (listError) return json({ error: listError.message }, 500);
    userId = list.users.find((user) => user.email?.toLowerCase() === email)?.id;
  }

  if (!userId) return json({ error: "Could not resolve user id" }, 500);

  const username = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    username,
    full_name: fullName,
    email,
    is_published: false,
  });
  if (profileError) return json({ error: profileError.message }, 500);

  const finalRole: AppRole = protectedAdmins.has(email) ? "super_admin" : role;
  const { error: roleError } = await adminClient
    .from("user_roles")
    .upsert({ user_id: userId, role: finalRole }, { onConflict: "user_id,role" });
  if (roleError) return json({ error: roleError.message }, 500);

  return json({ ok: true, user_id: userId, role: finalRole });
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
