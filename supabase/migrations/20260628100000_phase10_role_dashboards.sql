-- ============================================================
-- MDink — Phase 10: Role-Based Dashboards
-- جداول البروفايل المهني + توسيع سجل المهام لكل دور + سجل التعديلات
-- ============================================================

-- 0) is_operations_admin helper (لازم يتعرّف الأول قبل استخدامه في الـ policies)
CREATE OR REPLACE FUNCTION public.is_operations_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role IN ('operations_admin','super_admin')
  );
$$;

-- 1) جدول البروفايل المهني لأعضاء الفريق
CREATE TABLE IF NOT EXISTS public.team_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name_ar text,
  name_en text,
  image_url text,
  email text,
  phone text,
  whatsapp text,
  roles jsonb NOT NULL DEFAULT '[]'::jsonb,        -- ["Video Editor","Graphic Designer",...]
  medical_specialty text,                          -- التخصص الطبي إن وجد
  bio_ar text,
  bio_en text,
  years_experience int,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  portfolio_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  cv_url text,
  show_in_public_team boolean NOT NULL DEFAULT false,  -- يظهر في الفريق العام؟
  public_approved boolean NOT NULL DEFAULT false,      -- موافقة super_admin
  account_status text NOT NULL DEFAULT 'pending_profile'
    CHECK (account_status IN ('pending_profile','active','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_profiles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_profiles TO authenticated, service_role;

-- العضو يقرأ ويعدّل بروفايله، والأدمن يقرأ ويعدّل الكل
DROP POLICY IF EXISTS "Members read own profile" ON public.team_profiles;
CREATE POLICY "Members read own profile" ON public.team_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Members upsert own profile" ON public.team_profiles;
CREATE POLICY "Members upsert own profile" ON public.team_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Members update own profile" ON public.team_profiles;
CREATE POLICY "Members update own profile" ON public.team_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete profiles" ON public.team_profiles;
CREATE POLICY "Admins delete profiles" ON public.team_profiles FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 2) توسيع team_work_logs بكل الحقول الموحدة + بيانات الدور كـ JSONB
ALTER TABLE public.team_work_logs
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS role_used text,                    -- الدور المستخدم في المهمة
  ADD COLUMN IF NOT EXISTS doctor_id uuid,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal',  -- low/normal/high/urgent
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS start_time text,
  ADD COLUMN IF NOT EXISTS end_time text,
  ADD COLUMN IF NOT EXISTS time_spent text,
  ADD COLUMN IF NOT EXISTS files jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS role_data jsonb NOT NULL DEFAULT '{}'::jsonb;  -- حقول مخصصة لكل دور

-- توسيع قيم الحالة المسموحة (كانت pending/in_progress/done/blocked)
ALTER TABLE public.team_work_logs DROP CONSTRAINT IF EXISTS team_work_logs_status_check;
ALTER TABLE public.team_work_logs ADD CONSTRAINT team_work_logs_status_check
  CHECK (status IN ('not_started','pending','in_progress','waiting_review','revision_required','approved','delivered','completed','cancelled','done','blocked'));

-- 3) RLS على team_work_logs: العضو يشوف شغله بس، الأدمن يشوف الكل
ALTER TABLE public.team_work_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_work_logs TO authenticated, service_role;

DROP POLICY IF EXISTS "Members read own logs" ON public.team_work_logs;
CREATE POLICY "Members read own logs" ON public.team_work_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Members insert own logs" ON public.team_work_logs;
CREATE POLICY "Members insert own logs" ON public.team_work_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Members update own logs" ON public.team_work_logs;
CREATE POLICY "Members update own logs" ON public.team_work_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete logs" ON public.team_work_logs;
CREATE POLICY "Admins delete logs" ON public.team_work_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

-- 4) سجل التعديلات (revisions) للمهام
CREATE TABLE IF NOT EXISTS public.task_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.team_work_logs(id) ON DELETE CASCADE,
  author_id uuid,
  author_name text,
  note text NOT NULL DEFAULT '',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_revisions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.task_revisions TO authenticated, service_role;
DROP POLICY IF EXISTS "Read task revisions" ON public.task_revisions;
CREATE POLICY "Read task revisions" ON public.task_revisions FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_work_logs t WHERE t.id = task_id AND t.user_id = auth.uid()));
DROP POLICY IF EXISTS "Insert task revisions" ON public.task_revisions;
CREATE POLICY "Insert task revisions" ON public.task_revisions FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

-- 6) updated_at triggers
DROP TRIGGER IF EXISTS trg_team_profiles_touch ON public.team_profiles;
CREATE TRIGGER trg_team_profiles_touch BEFORE UPDATE ON public.team_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 7) فهرس لتسريع استعلام مهام العضو
CREATE INDEX IF NOT EXISTS idx_work_logs_user ON public.team_work_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_work_logs_role ON public.team_work_logs(role_used);
CREATE INDEX IF NOT EXISTS idx_work_logs_client ON public.team_work_logs(client_id);
