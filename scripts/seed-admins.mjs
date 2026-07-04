import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminPassword = process.env.MDINK_ADMIN_PASSWORD || "0102929TSH";

const admins = [
  { email: "shfahmy2010@gmail.com", full_name: "Shaimaa Fahmy" },
  { email: "tasneemfahmy21@gmail.com", full_name: "MDink Admin" },
];

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === "PUT_YOUR_SERVICE_ROLE_KEY_HERE") {
  console.error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Add them to .env before running npm run seed:admins.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

for (const admin of admins) {
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: admin.email,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { full_name: admin.full_name },
  });

  if (createError && !createError.message.toLowerCase().includes("already")) {
    console.error(`Failed to create ${admin.email}: ${createError.message}`);
    process.exitCode = 1;
    continue;
  }

  let userId = created?.user?.id;
  if (!userId) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error(`Failed to list users: ${listError.message}`);
      process.exitCode = 1;
      continue;
    }
    userId = list.users.find((user) => user.email?.toLowerCase() === admin.email.toLowerCase())?.id;
  }

  if (!userId) {
    console.error(`Could not resolve user id for ${admin.email}`);
    process.exitCode = 1;
    continue;
  }

  const username = admin.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
  await supabase.from("profiles").upsert({
    id: userId,
    username,
    full_name: admin.full_name,
    email: admin.email,
    is_published: false,
  });

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id,role" });

  if (roleError) {
    console.error(`Failed to assign role for ${admin.email}: ${roleError.message}`);
    process.exitCode = 1;
  } else {
    console.log(`Super admin ready: ${admin.email}`);
  }
}
