-- ============================================================
-- MDink — Operations/Financial hardening (safe, additive)
-- Focus: STRICT financial privacy + core support tables the
-- master ops prompt requires, without touching existing modules.
-- ============================================================

-- Helper: is the current user one of the two real Super Admins (by email)?
CREATE OR REPLACE FUNCTION public.is_super_admin_email()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) IN
    ('shfahmy2010@gmail.com', 'tasneemfahmy21@gmail.com');
$$;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_email() FROM anon;

-- ── client_financials: EXACT money values, Super-Admin-only ──
CREATE TABLE IF NOT EXISTS public.client_financials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid,
  package_name text,
  package_price numeric,
  paid_amount numeric,
  remaining_amount numeric,
  payment_status text,
  invoices jsonb DEFAULT '[]'::jsonb,
  installment_plan jsonb DEFAULT '[]'::jsonb,
  financial_notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_financials ENABLE ROW LEVEL SECURITY;
-- No grants to anon; only authenticated + RLS gate
GRANT ALL ON public.client_financials TO authenticated, service_role;

-- HARD RESTRICTION: only the two Super Admin emails — for every operation
DROP POLICY IF EXISTS "Only super admins read financials" ON public.client_financials;
CREATE POLICY "Only super admins read financials" ON public.client_financials
  FOR SELECT TO authenticated USING (public.is_super_admin_email());

DROP POLICY IF EXISTS "Only super admins insert financials" ON public.client_financials;
CREATE POLICY "Only super admins insert financials" ON public.client_financials
  FOR INSERT TO authenticated WITH CHECK (public.is_super_admin_email());

DROP POLICY IF EXISTS "Only super admins update financials" ON public.client_financials;
CREATE POLICY "Only super admins update financials" ON public.client_financials
  FOR UPDATE TO authenticated
  USING (public.is_super_admin_email()) WITH CHECK (public.is_super_admin_email());

DROP POLICY IF EXISTS "Only super admins delete financials" ON public.client_financials;
CREATE POLICY "Only super admins delete financials" ON public.client_financials
  FOR DELETE TO authenticated USING (public.is_super_admin_email());

-- ── permissions catalog + user_permissions (granular grants) ──
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_key text UNIQUE NOT NULL,
  label_ar text,
  label_en text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.permissions TO authenticated;
GRANT ALL ON public.permissions TO service_role;
DROP POLICY IF EXISTS "Authed read permissions" ON public.permissions;
CREATE POLICY "Authed read permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admins manage permissions" ON public.permissions;
CREATE POLICY "Super admins manage permissions" ON public.permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin_email()) WITH CHECK (public.is_super_admin_email());

CREATE TABLE IF NOT EXISTS public.user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  permission_key text NOT NULL,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission_key)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_permissions TO authenticated;
GRANT ALL ON public.user_permissions TO service_role;
-- users can read their own grants; super admins manage all
DROP POLICY IF EXISTS "Read own permissions" ON public.user_permissions;
CREATE POLICY "Read own permissions" ON public.user_permissions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin_email());
DROP POLICY IF EXISTS "Super admins manage user_permissions" ON public.user_permissions;
CREATE POLICY "Super admins manage user_permissions" ON public.user_permissions
  FOR ALL TO authenticated
  USING (public.is_super_admin_email()) WITH CHECK (public.is_super_admin_email());

-- Seed the permission catalog (idempotent)
INSERT INTO public.permissions (permission_key, label_ar, label_en) VALUES
  ('can_view_website_management','إدارة الموقع','Website Management'),
  ('can_view_operations','عرض العمليات','View Operations'),
  ('can_manage_leads','إدارة الطلبات','Manage Leads'),
  ('can_export_leads','تصدير الطلبات','Export Leads'),
  ('can_manage_clients_basic','إدارة العملاء (بدون مالية)','Manage Clients (no financials)'),
  ('can_manage_team_tasks','إدارة مهام الفريق','Manage Team Tasks'),
  ('can_assign_tasks','إسناد المهام','Assign Tasks'),
  ('can_review_task_submissions','مراجعة التسليمات','Review Submissions'),
  ('can_export_operational_reports','تصدير تقارير تشغيلية','Export Operational Reports'),
  ('can_view_team_profiles','عرض بروفايلات الفريق','View Team Profiles'),
  ('can_manage_team_profiles','إدارة بروفايلات الفريق','Manage Team Profiles')
ON CONFLICT (permission_key) DO NOTHING;

-- ── notifications ──
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid NOT NULL,
  sender_user_id uuid,
  title_ar text,
  title_en text,
  message_ar text,
  message_en text,
  notification_type text,
  related_entity_type text,
  related_entity_id text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO authenticated, service_role;
DROP POLICY IF EXISTS "Read own notifications" ON public.notifications;
CREATE POLICY "Read own notifications" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_user_id = auth.uid() OR public.is_super_admin_email());
DROP POLICY IF EXISTS "Update own notifications" ON public.notifications;
CREATE POLICY "Update own notifications" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
DROP POLICY IF EXISTS "Authed create notifications" ON public.notifications;
CREATE POLICY "Authed create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- ── daily_work_logs ──
CREATE TABLE IF NOT EXISTS public.daily_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  task_id uuid,
  role_key text,
  work_title text,
  work_description text,
  time_spent_minutes int,
  work_date date NOT NULL DEFAULT current_date,
  status text DEFAULT 'submitted',
  needs_review boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.daily_work_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.daily_work_logs TO authenticated, service_role;
DROP POLICY IF EXISTS "Own or admin read work logs" ON public.daily_work_logs;
CREATE POLICY "Own or admin read work logs" ON public.daily_work_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));
DROP POLICY IF EXISTS "Own insert work logs" ON public.daily_work_logs;
CREATE POLICY "Own insert work logs" ON public.daily_work_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Own update work logs" ON public.daily_work_logs;
CREATE POLICY "Own update work logs" ON public.daily_work_logs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- ── export_logs (audit of every export) ──
CREATE TABLE IF NOT EXISTS public.export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exported_by uuid,
  export_type text,
  filters_json jsonb,
  included_columns text[],
  excluded_columns text[],
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.export_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.export_logs TO authenticated, service_role;
DROP POLICY IF EXISTS "Admins read export logs" ON public.export_logs;
CREATE POLICY "Admins read export logs" ON public.export_logs
  FOR SELECT TO authenticated USING (public.is_super_admin_email());
DROP POLICY IF EXISTS "Authed insert export logs" ON public.export_logs;
CREATE POLICY "Authed insert export logs" ON public.export_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
