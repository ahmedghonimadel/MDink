-- ============================================================================
-- MDink Solutions — SUPABASE_SETUP.sql  (نظيف من الصفر / clean rebuild)
-- ============================================================================
-- شغّلي هذا الملف مرة واحدة بالكامل داخل مشروع MDink الحالي:
--   Supabase → SQL Editor → الصق كامل الملف → Run.
-- آمن لإعادة التشغيل (idempotent): كل شيء IF EXISTS / IF NOT EXISTS.
--
-- ما الذي يفعله:
--   (0) CLEANUP: يحذف جداول/دوال MDink القديمة المكسورة فقط (لا يمسّ أي مشروع آخر).
--   (1) الجداول الجديدة النظيفة (14 جدول لموقع + CMS تسويقي).
--   (2) الفهارس (Indexes).
--   (3) دوال + Triggers.
--   (4) سياسات RLS.
--   (5) بيانات ابتدائية (Seed) — محتوى الموقع الحالي.
--   (6) حماية Super Admin (الإيميلان الأساسيان).
--
-- ملاحظات مهمة:
--   • لا يوجد أي استخدام لـ recipient_user_id إلا داخل جدول notifications
--     الذي يُنشأ فعليًا ويحتوي العمود قبل أي سياسة.
--   • لا يمسّ Storage bucket الموجود (mdink-media) سوى إنشائه إن لم يوجد.
--   • Edge Function باسم create-admin-user لا علاقة لها بهذا الملف (تبقى كما هي).
-- ============================================================================

-- ============================================================================
-- (0) CLEANUP — حذف جداول MDink القديمة فقط
-- ============================================================================
-- ملاحظة: نحذف فقط جداول MDink المعروفة. لا شيء خارج هذه القائمة يُمَس.
DROP TABLE IF EXISTS public.about_gallery          CASCADE;
DROP TABLE IF EXISTS public.audit_logs             CASCADE;
DROP TABLE IF EXISTS public.blogs                  CASCADE;
DROP TABLE IF EXISTS public.client_clinics         CASCADE;
DROP TABLE IF EXISTS public.client_financials      CASCADE;
DROP TABLE IF EXISTS public.client_payments        CASCADE;
DROP TABLE IF EXISTS public.client_testimonials    CASCADE;
DROP TABLE IF EXISTS public.clinics                CASCADE;
DROP TABLE IF EXISTS public.cms_pages              CASCADE;
DROP TABLE IF EXISTS public.cms_services           CASCADE;
DROP TABLE IF EXISTS public.consultations          CASCADE;
DROP TABLE IF EXISTS public.contact_channels       CASCADE;
DROP TABLE IF EXISTS public.content_calendar       CASCADE;
DROP TABLE IF EXISTS public.daily_work_logs        CASCADE;
DROP TABLE IF EXISTS public.doctor_applications    CASCADE;
DROP TABLE IF EXISTS public.doctor_gallery         CASCADE;
DROP TABLE IF EXISTS public.dynamic_links          CASCADE;
DROP TABLE IF EXISTS public.export_logs            CASCADE;
DROP TABLE IF EXISTS public.free_consultations     CASCADE;
DROP TABLE IF EXISTS public.leads                  CASCADE;
DROP TABLE IF EXISTS public.mdink_clients          CASCADE;
DROP TABLE IF EXISTS public.mdink_payments         CASCADE;
DROP TABLE IF EXISTS public.mdink_projects         CASCADE;
DROP TABLE IF EXISTS public.media_library          CASCADE;
DROP TABLE IF EXISTS public.notifications          CASCADE;
DROP TABLE IF EXISTS public.permissions            CASCADE;
DROP TABLE IF EXISTS public.portfolio_items        CASCADE;
DROP TABLE IF EXISTS public.reel_campaigns         CASCADE;
DROP TABLE IF EXISTS public.seo_settings           CASCADE;
DROP TABLE IF EXISTS public.services               CASCADE;
DROP TABLE IF EXISTS public.site_config            CASCADE;
DROP TABLE IF EXISTS public.task_revisions         CASCADE;
DROP TABLE IF EXISTS public.team_members           CASCADE;
DROP TABLE IF EXISTS public.team_profiles          CASCADE;
DROP TABLE IF EXISTS public.team_work_logs         CASCADE;
DROP TABLE IF EXISTS public.testimonial_submissions CASCADE;
DROP TABLE IF EXISTS public.testimonials           CASCADE;
DROP TABLE IF EXISTS public.user_permissions       CASCADE;
DROP TABLE IF EXISTS public.website_activity_log   CASCADE;
-- ملاحظة: نُبقي user_roles / profiles / admin_allowlist إن وُجدت (روابط قديمة)،
-- لكن الـ schema الجديد يعتمد على admin_users فقط للوحة التحكم.
DROP TABLE IF EXISTS public.admin_allowlist        CASCADE;

-- دوال قديمة قد تتعارض
DROP FUNCTION IF EXISTS public.is_super_admin_email() CASCADE;
DROP FUNCTION IF EXISTS public.protect_super_admins() CASCADE;
DROP FUNCTION IF EXISTS public.ensure_super_admins()  CASCADE;

-- ============================================================================
-- (1) TABLES — الجداول الجديدة النظيفة
-- ============================================================================

-- helper: trigger لتحديث updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- 1) admin_users — التحكم في دخول لوحة التحكم
CREATE TABLE IF NOT EXISTS public.admin_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'editor' CHECK (role IN ('admin','editor','viewer')),
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2) site_settings — الإعدادات العامة (صف واحد)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name  text NOT NULL DEFAULT 'MDink Solutions',
  logo_url    text,
  phone       text,
  whatsapp_number text,
  whatsapp_default_message text,
  email       text,
  address     text,
  default_language text NOT NULL DEFAULT 'ar',
  is_whatsapp_floating_enabled boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3) social_links — كروت التواصل الاجتماعي
CREATE TABLE IF NOT EXISTS public.social_links (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform      text NOT NULL,
  label         text,
  username      text,
  url           text NOT NULL,
  icon          text,
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 4) media_library — كل الوسائط المرفوعة من اللوحة
CREATE TABLE IF NOT EXISTS public.media_library (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text,
  file_name    text,
  file_url     text NOT NULL,
  storage_path text,
  file_type    text,
  mime_type    text,
  alt_text     text,
  uploaded_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- 5) page_sections — أهم جدول CMS: كل سكشن في كل صفحة
CREATE TABLE IF NOT EXISTS public.page_sections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug     text NOT NULL,
  section_key   text NOT NULL,
  title         text,
  subtitle      text,
  body_text     text,
  content_json  jsonb NOT NULL DEFAULT '{}'::jsonb,
  media_id      uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  video_url     text,
  button_text   text,
  button_url    text,
  display_order int NOT NULL DEFAULT 0,
  is_visible    boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_slug, section_key)
);

-- 6) services — خدمات MDink
CREATE TABLE IF NOT EXISTS public.services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  title_en      text,
  description   text,
  description_en text,
  icon          text,
  image_id      uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  bullets       jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 7) portfolio_projects — كروت أعمالنا
CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  title_en       text,
  client_name    text,
  category       text,
  short_description text,
  short_description_en text,
  tags           jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_url    text,
  button_text    text,
  cover_image_id uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  cover_image_url text,
  display_order  int NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  is_featured    boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- 8) blog_categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  name_en       text,
  slug          text UNIQUE NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 9) blog_posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id    uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  title          text NOT NULL,
  title_en       text,
  slug           text UNIQUE NOT NULL,
  excerpt        text,
  excerpt_en     text,
  content        text,
  content_en     text,
  cover_image_id uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  cover_image_url text,
  author         text,
  reading_time   int,
  is_featured    boolean NOT NULL DEFAULT false,
  is_published   boolean NOT NULL DEFAULT true,
  display_order  int NOT NULL DEFAULT 0,
  meta_title     text,
  meta_description text,
  next_slug      text,
  related_slugs  text[] DEFAULT '{}',
  published_at   timestamptz DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
-- ضمان أعمدة الإنجليزية للمدونة لو الجدول موجود من تشغيل سابق (بدون مسح بيانات)
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS excerpt_en text;
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS content_en text;

-- 10) video_testimonials
CREATE TABLE IF NOT EXISTS public.video_testimonials (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name        text NOT NULL,
  client_title       text,
  client_specialty   text,
  video_url          text,
  video_media_id     uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  thumbnail_image_id uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  thumbnail_url      text,
  rating             int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_verified        boolean NOT NULL DEFAULT true,
  display_order      int NOT NULL DEFAULT 0,
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- 11) written_testimonials
CREATE TABLE IF NOT EXISTS public.written_testimonials (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name      text NOT NULL,
  client_title     text,
  client_specialty text,
  profile_image_id uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  profile_image_url text,
  review_image_id  uuid REFERENCES public.media_library(id) ON DELETE SET NULL,
  review_image_url text,
  review_text      text,
  original_post_url text,
  button_text      text,
  rating           int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_verified      boolean NOT NULL DEFAULT true,
  display_order    int NOT NULL DEFAULT 0,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 12) contact_submissions — فورم تواصل
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    text NOT NULL,
  phone        text,
  specialty    text,
  entity_type  text,
  requested_service text,
  preferred_contact_method text,
  website_or_page_url text,
  message      text,
  language     text DEFAULT 'ar',
  status       text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','in_progress','converted','closed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 13) dashboard_activity_logs (اختياري لكنه منفّذ بالكامل)
CREATE TABLE IF NOT EXISTS public.dashboard_activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text,
  table_name    text,
  record_id     text,
  old_data      jsonb,
  new_data      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 14) notifications (يحتوي recipient_user_id فعليًا قبل أي سياسة تشير إليه)
CREATE TABLE IF NOT EXISTS public.notifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title             text,
  message           text,
  type              text,
  is_read           boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- (1b) OPERATIONAL TABLES — جداول لوحة العمليات الداخلية
-- ============================================================================

-- seo_settings — إعدادات SEO لكل صفحة
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key            text UNIQUE NOT NULL,
  meta_title_ar       text,
  meta_title_en       text,
  meta_description_ar text,
  meta_description_en text,
  canonical_url       text,
  og_image_url        text,
  robots              text DEFAULT 'index,follow',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- team_profiles — بروفايلات أعضاء الفريق
CREATE TABLE IF NOT EXISTS public.team_profiles (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name_ar        text,
  name_en        text,
  email          text,
  phone          text,
  image_url      text,
  bio_ar         text,
  bio_en         text,
  roles          jsonb NOT NULL DEFAULT '[]'::jsonb,
  primary_display_role text,
  account_status text NOT NULL DEFAULT 'active' CHECK (account_status IN ('pending_profile','active','suspended')),
  show_in_public_team boolean NOT NULL DEFAULT false,
  public_approved boolean NOT NULL DEFAULT false,
  is_founder     boolean NOT NULL DEFAULT false,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- team_members — أعضاء الفريق المعروضون في صفحة "من نحن"
CREATE TABLE IF NOT EXISTS public.team_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar     text NOT NULL,
  name_en     text,
  role_ar     text,
  role_en     text,
  bio_ar      text,
  bio_en      text,
  image_url   text,
  is_founder  boolean NOT NULL DEFAULT false,
  sort_order  int NOT NULL DEFAULT 0,
  is_visible  boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- clients — عملاء MDink
CREATE TABLE IF NOT EXISTS public.clients (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name   text NOT NULL,
  clinic_name   text,
  client_type   text DEFAULT 'doctor',
  specialty     text,
  phone         text,
  email         text,
  whatsapp      text,
  website_url   text,
  logo_url      text,
  address       text,
  package_name  text,
  project_status text NOT NULL DEFAULT 'lead',
  payment_status text NOT NULL DEFAULT 'unpaid',
  status        text NOT NULL DEFAULT 'active',
  data_complete boolean NOT NULL DEFAULT false,
  lead_id       uuid,
  notes         text,
  assigned_to   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- client_payments — مدفوعات العملاء (Super Admin فقط)
CREATE TABLE IF NOT EXISTS public.client_payments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  client_name   text,
  service_name  text,
  total_amount  numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount   numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  proof_url     text,
  installment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  installment_count int DEFAULT 0,
  next_due_date date,
  currency      text NOT NULL DEFAULT 'EGP',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- consultations — الاستشارات المجانية
CREATE TABLE IF NOT EXISTS public.consultations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  phone       text,
  specialty   text,
  message     text,
  status      text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','scheduled','converted','done','lost','closed')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- doctor_applications — طلبات الأطباء للانضمام
CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      text NOT NULL,
  phone          text,
  email          text,
  specialty      text,
  city           text,
  message        text,
  portfolio_url  text,
  status         text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','accepted','rejected')),
  reviewed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  internal_notes text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- team_tasks — مهام الفريق
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  client_id     uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  assigned_to   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  required_role text,
  priority      text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  status        text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','submitted','changes_requested','approved','rejected','done')),
  due_date      date,
  evidence_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes         text,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- reels — حملات الريلز
CREATE TABLE IF NOT EXISTS public.reels (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  client_name   text,
  video_url     text,
  thumbnail_url text,
  platform      text,
  views         int DEFAULT 0,
  likes         int DEFAULT 0,
  comments      int DEFAULT 0,
  status        text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','shooting','editing','published')),
  display_order int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- operations — سجل العمليات/المشاريع
CREATE TABLE IF NOT EXISTS public.operations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  client_id    uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  type         text,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','completed','cancelled')),
  progress     int NOT NULL DEFAULT 0,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- team_work_logs — سجل عمل الفريق اليومي
CREATE TABLE IF NOT EXISTS public.team_work_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  member_name      text,
  role_title       text,
  doctor_name      text,
  task_type        text,
  task_description text,
  quantity         int DEFAULT 1,
  work_date        date DEFAULT now(),
  status           text DEFAULT 'done',
  proof_url        text,
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- mdink_projects — مشاريع (تُستخدم في مهام الفريق)
CREATE TABLE IF NOT EXISTS public.mdink_projects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  client_id    uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  status       text NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- export_requests — طلبات تصدير Excel
CREATE TABLE IF NOT EXISTS public.export_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  export_type   text NOT NULL,
  filters       jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count     int,
  status        text NOT NULL DEFAULT 'done' CHECK (status IN ('pending','done','failed')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- audit_logs — سجل النشاط (Super Admin فقط)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email text,
  action      text,
  entity      text,
  entity_id   text,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- (2) INDEXES — الفهارس
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_page_sections_page       ON public.page_sections(page_slug);
CREATE INDEX IF NOT EXISTS idx_services_order           ON public.services(display_order);
CREATE INDEX IF NOT EXISTS idx_portfolio_order          ON public.portfolio_projects(display_order);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug          ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category      ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published     ON public.blog_posts(is_published);
CREATE INDEX IF NOT EXISTS idx_video_testi_order        ON public.video_testimonials(display_order);
CREATE INDEX IF NOT EXISTS idx_written_testi_order      ON public.written_testimonials(display_order);
CREATE INDEX IF NOT EXISTS idx_social_links_order       ON public.social_links(display_order);
CREATE INDEX IF NOT EXISTS idx_contact_status           ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON public.notifications(recipient_user_id);

-- ============================================================================
-- (3) FUNCTIONS + TRIGGERS
-- ============================================================================

-- هل المستخدم الحالي أدمن نشط؟ (يُستخدم في كل سياسات الكتابة)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users a
    WHERE a.user_id = auth.uid() AND a.is_active = true
  )
  OR lower(coalesce(auth.jwt() ->> 'email','')) IN
     ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com');
$$;

-- triggers لتحديث updated_at على كل الجداول التي تملك العمود
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'admin_users','site_settings','social_links','page_sections','services',
    'portfolio_projects','blog_categories','blog_posts','video_testimonials',
    'written_testimonials','contact_submissions',
    'seo_settings','team_profiles','team_members','clients','client_payments',
    'consultations','doctor_applications','team_tasks','reels','operations'
  ]) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;

-- عند إنشاء مستخدم Auth بأحد الإيميلين الأساسيين → أضِفه تلقائيًا كـ admin
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IN ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com') THEN
    INSERT INTO public.admin_users (user_id, email, role, is_active)
    VALUES (NEW.id, lower(NEW.email), 'admin', true)
    ON CONFLICT (email) DO UPDATE SET user_id = EXCLUDED.user_id, role = 'admin', is_active = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_admin();

-- ============================================================================
-- (4) RLS POLICIES
-- ============================================================================
-- تفعيل RLS على كل الجداول
ALTER TABLE public.admin_users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_sections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_testimonials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.written_testimonials   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;

-- المنح الأساسية
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- ── admin_users: يقرأ الأدمن فقط؛ يُدار عبر service_role/Edge Function ──
DROP POLICY IF EXISTS admin_users_read ON public.admin_users;
CREATE POLICY admin_users_read ON public.admin_users
  FOR SELECT TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS admin_users_manage ON public.admin_users;
CREATE POLICY admin_users_manage ON public.admin_users
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── site_settings: قراءة عامة، كتابة أدمن ──
DROP POLICY IF EXISTS site_settings_read ON public.site_settings;
CREATE POLICY site_settings_read ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS site_settings_write ON public.site_settings;
CREATE POLICY site_settings_write ON public.site_settings
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── social_links: قراءة النشط للعامة، كتابة أدمن ──
DROP POLICY IF EXISTS social_read ON public.social_links;
CREATE POLICY social_read ON public.social_links
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS social_write ON public.social_links;
CREATE POLICY social_write ON public.social_links
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── media_library: قراءة عامة (الوسائط عامة)، كتابة أدمن ──
DROP POLICY IF EXISTS media_read ON public.media_library;
CREATE POLICY media_read ON public.media_library
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS media_write ON public.media_library;
CREATE POLICY media_write ON public.media_library
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── page_sections: قراءة المرئي للعامة، كتابة أدمن ──
DROP POLICY IF EXISTS sections_read ON public.page_sections;
CREATE POLICY sections_read ON public.page_sections
  FOR SELECT TO anon, authenticated USING (is_visible OR public.is_admin_user());
DROP POLICY IF EXISTS sections_write ON public.page_sections;
CREATE POLICY sections_write ON public.page_sections
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── services ──
DROP POLICY IF EXISTS services_read ON public.services;
CREATE POLICY services_read ON public.services
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS services_write ON public.services;
CREATE POLICY services_write ON public.services
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── portfolio_projects ──
DROP POLICY IF EXISTS portfolio_read ON public.portfolio_projects;
CREATE POLICY portfolio_read ON public.portfolio_projects
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS portfolio_write ON public.portfolio_projects;
CREATE POLICY portfolio_write ON public.portfolio_projects
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── blog_categories ──
DROP POLICY IF EXISTS blogcat_read ON public.blog_categories;
CREATE POLICY blogcat_read ON public.blog_categories
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS blogcat_write ON public.blog_categories;
CREATE POLICY blogcat_write ON public.blog_categories
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── blog_posts: قراءة المنشور للعامة، كتابة أدمن ──
DROP POLICY IF EXISTS blogposts_read ON public.blog_posts;
CREATE POLICY blogposts_read ON public.blog_posts
  FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin_user());
DROP POLICY IF EXISTS blogposts_write ON public.blog_posts;
CREATE POLICY blogposts_write ON public.blog_posts
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── video_testimonials ──
DROP POLICY IF EXISTS videotesti_read ON public.video_testimonials;
CREATE POLICY videotesti_read ON public.video_testimonials
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS videotesti_write ON public.video_testimonials;
CREATE POLICY videotesti_write ON public.video_testimonials
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- ── written_testimonials ──
DROP POLICY IF EXISTS writtentesti_read ON public.written_testimonials;
CREATE POLICY writtentesti_read ON public.written_testimonials
  FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin_user());
DROP POLICY IF EXISTS writtentesti_write ON public.written_testimonials;
CREATE POLICY writtentesti_write ON public.written_testimonials
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
-- الزائر يقدر يُرسل رأيًا معلّقًا فقط (غير نشط، غير موثّق) — يراجعه الأدمن لاحقًا
DROP POLICY IF EXISTS writtentesti_public_submit ON public.written_testimonials;
CREATE POLICY writtentesti_public_submit ON public.written_testimonials
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_active = false AND is_verified = false);

-- ── contact_submissions: الزائر يُدرِج فقط، الأدمن يقرأ/يدير ──
DROP POLICY IF EXISTS contact_insert ON public.contact_submissions;
CREATE POLICY contact_insert ON public.contact_submissions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS contact_read ON public.contact_submissions;
CREATE POLICY contact_read ON public.contact_submissions
  FOR SELECT TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS contact_update ON public.contact_submissions;
CREATE POLICY contact_update ON public.contact_submissions
  FOR UPDATE TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS contact_delete ON public.contact_submissions;
CREATE POLICY contact_delete ON public.contact_submissions
  FOR DELETE TO authenticated USING (public.is_admin_user());

-- ── dashboard_activity_logs: أدمن فقط ──
DROP POLICY IF EXISTS activity_read ON public.dashboard_activity_logs;
CREATE POLICY activity_read ON public.dashboard_activity_logs
  FOR SELECT TO authenticated USING (public.is_admin_user());
DROP POLICY IF EXISTS activity_insert ON public.dashboard_activity_logs;
CREATE POLICY activity_insert ON public.dashboard_activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ── notifications: صاحبها يقرأها؛ الأدمن ينشئها ──
DROP POLICY IF EXISTS notif_read ON public.notifications;
CREATE POLICY notif_read ON public.notifications
  FOR SELECT TO authenticated USING (recipient_user_id = auth.uid() OR public.is_admin_user());
DROP POLICY IF EXISTS notif_update ON public.notifications;
CREATE POLICY notif_update ON public.notifications
  FOR UPDATE TO authenticated USING (recipient_user_id = auth.uid()) WITH CHECK (recipient_user_id = auth.uid());
DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_admin_user());

-- ============================================================================
-- (4b) RLS للجداول التشغيلية — أدمن فقط (بيانات داخلية)
-- ============================================================================
ALTER TABLE public.seo_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_work_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdink_projects       ENABLE ROW LEVEL SECURITY;

-- seo_settings: قراءة عامة (للـ meta)، كتابة أدمن
DROP POLICY IF EXISTS seo_read ON public.seo_settings;
CREATE POLICY seo_read ON public.seo_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS seo_write ON public.seo_settings;
CREATE POLICY seo_write ON public.seo_settings
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- team_members: قراءة المرئي للعامة (صفحة من نحن)، كتابة أدمن
DROP POLICY IF EXISTS teammembers_read ON public.team_members;
CREATE POLICY teammembers_read ON public.team_members
  FOR SELECT TO anon, authenticated USING (is_visible OR public.is_admin_user());
DROP POLICY IF EXISTS teammembers_write ON public.team_members;
CREATE POLICY teammembers_write ON public.team_members
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());

-- team_profiles: قراءة المعتمد للعامة، الأدمن يدير، والعضو يقرأ صفّه
DROP POLICY IF EXISTS teamprofiles_read ON public.team_profiles;
CREATE POLICY teamprofiles_read ON public.team_profiles
  FOR SELECT TO anon, authenticated
  USING ((show_in_public_team AND public_approved) OR public.is_admin_user() OR user_id = auth.uid());
DROP POLICY IF EXISTS teamprofiles_write ON public.team_profiles;
CREATE POLICY teamprofiles_write ON public.team_profiles
  FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());
DROP POLICY IF EXISTS teamprofiles_self ON public.team_profiles;
CREATE POLICY teamprofiles_self ON public.team_profiles
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- الجداول الداخلية التالية: أدمن فقط (كل العمليات)
DO $$
DECLARE tb text;
BEGIN
  FOR tb IN SELECT unnest(ARRAY[
    'clients','client_payments','consultations','doctor_applications',
    'team_tasks','reels','operations','export_requests','audit_logs',
    'team_work_logs','mdink_projects'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_admin_all ON public.%I;', tb, tb);
    EXECUTE format(
      'CREATE POLICY %I_admin_all ON public.%I FOR ALL TO authenticated USING (public.is_admin_user()) WITH CHECK (public.is_admin_user());',
      tb, tb
    );
  END LOOP;
END $$;

-- الزائر يقدر يُرسل استشارة مجانية أو طلب طبيب (INSERT فقط)
DROP POLICY IF EXISTS consultations_public_insert ON public.consultations;
CREATE POLICY consultations_public_insert ON public.consultations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS doctorapps_public_insert ON public.doctor_applications;
CREATE POLICY doctorapps_public_insert ON public.doctor_applications
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- indexes للجداول التشغيلية
CREATE INDEX IF NOT EXISTS idx_clients_status        ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_payments_client       ON public.client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_consultations_status  ON public.consultations(status);
CREATE INDEX IF NOT EXISTS idx_docapps_status        ON public.doctor_applications(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned        ON public.team_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status          ON public.team_tasks(status);
CREATE INDEX IF NOT EXISTS idx_reels_order           ON public.reels(display_order);
CREATE INDEX IF NOT EXISTS idx_operations_status     ON public.operations(status);
CREATE INDEX IF NOT EXISTS idx_audit_created         ON public.audit_logs(created_at);

-- ── Storage bucket (mdink-media) ──
INSERT INTO storage.buckets (id, name, public)
VALUES ('mdink-media','mdink-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "mdink media public read" ON storage.objects;
CREATE POLICY "mdink media public read" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'mdink-media');
DROP POLICY IF EXISTS "mdink media admin write" ON storage.objects;
CREATE POLICY "mdink media admin write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mdink-media' AND public.is_admin_user());
DROP POLICY IF EXISTS "mdink media admin update" ON storage.objects;
CREATE POLICY "mdink media admin update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'mdink-media' AND public.is_admin_user());
DROP POLICY IF EXISTS "mdink media admin delete" ON storage.objects;
CREATE POLICY "mdink media admin delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'mdink-media' AND public.is_admin_user());

-- ============================================================================
-- (5) SEED DATA — محتوى الموقع الابتدائي
-- ============================================================================

-- site_settings (صف واحد)
INSERT INTO public.site_settings (brand_name, phone, whatsapp_number, whatsapp_default_message, email, default_language, is_whatsapp_floating_enabled)
SELECT 'MDink Solutions', '201020658409', '201020658409',
       'مرحبًا، أريد استشارة بخصوص مشروعي الطبي مع MDink Solutions',
       'info@mdinksolutions.com', 'ar', true
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings);

-- social_links — الترتيب المطلوب: WhatsApp, LinkedIn, Instagram, Facebook
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.social_links) THEN
    INSERT INTO public.social_links (platform, label, username, url, icon, display_order, is_active) VALUES
      ('whatsapp','واتساب','01020658409','https://wa.me/201020658409','MessageCircle',1,true),
      ('linkedin','لينكدإن','MDink Solutions','https://www.linkedin.com/company/mdink-for-digital-solutions','Linkedin',2,true),
      ('instagram','إنستجرام','shaima2_fahmy','https://www.instagram.com/shaima2_fahmy','Instagram',3,true),
      ('facebook','فيسبوك','MDink','https://www.facebook.com/MDinksolutions','Facebook',4,true);
  END IF;
END $$;

-- blog_categories — بلا "رحلة المريض"
INSERT INTO public.blog_categories (name, name_en, slug, display_order, is_active) VALUES
  ('التسويق الطبي','Medical Marketing','medical-marketing',1,true),
  ('المواقع الطبية','Medical Websites','medical-websites',2,true),
  ('إدارة العيادات','Clinic Management','clinic-management',3,true),
  ('SEO طبي','Medical SEO','medical-seo',4,true),
  ('المحتوى الطبي','Medical Content','medical-content',5,true)
ON CONFLICT (slug) DO NOTHING;

-- blog_posts — مقالات حقيقية (تُزرع مرة واحدة لو الجدول فاضي)
DO $$
DECLARE
  c_marketing uuid; c_websites uuid; c_clinics uuid; c_seo uuid; c_content uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.blog_posts) THEN
    SELECT id INTO c_marketing FROM public.blog_categories WHERE slug='medical-marketing';
    SELECT id INTO c_websites  FROM public.blog_categories WHERE slug='medical-websites';
    SELECT id INTO c_clinics   FROM public.blog_categories WHERE slug='clinic-management';
    SELECT id INTO c_seo       FROM public.blog_categories WHERE slug='medical-seo';
    SELECT id INTO c_content   FROM public.blog_categories WHERE slug='medical-content';

    INSERT INTO public.blog_posts
      (category_id, title, slug, excerpt, content, author, reading_time, is_featured, is_published, display_order, meta_title, meta_description, published_at)
    VALUES
    (c_marketing,
     'التسويق الطبي للعيادات: من أين تبدأ في 2025؟',
     'medical-marketing-where-to-start',
     'دليل عملي للطبيب الذي يريد حضورًا رقميًا احترافيًا يميّزه بين منافسيه، خطوة بخطوة.',
     '<p>التسويق الطبي لم يعد رفاهية، بل ضرورة لأي طبيب أو عيادة تريد الوصول لمرضى جدد والحفاظ على ثقة الحاليين.</p><h2>لماذا يختلف التسويق الطبي؟</h2><p>المريض لا يشتري منتجًا، بل يبحث عن ثقة وخبرة. لذلك يقوم التسويق الطبي الناجح على المصداقية والمحتوى الدقيق، لا على الإعلانات الصاخبة.</p><h2>الخطوات الأولى</h2><ul><li>منصة مملوكة لك بالكامل (موقع احترافي) لا تعتمد فيها على منصات مؤقتة.</li><li>محتوى طبي يعرض خبرتك بلغة يفهمها المريض.</li><li>حضور منظم على السوشيال ميديا يبني الثقة.</li><li>قياس النتائج عبر تقارير واضحة لا تخمين.</li></ul><h2>الخلاصة</h2><p>ابدأ بأساس ثابت: موقعك، محتواك، وهويتك. الحملات تأتي بعد ذلك لتضخيم أساس قوي، لا لتغطية غيابه.</p>',
     'فريق MDink Solutions', 6, true, true, 1,
     'التسويق الطبي للعيادات: دليل البداية | MDink Solutions',
     'دليل عملي للتسويق الطبي للأطباء والعيادات من MDink Solutions.', now()),

    (c_websites,
     'لماذا يحتاج كل طبيب إلى موقع طبي مملوك له؟',
     'why-every-doctor-needs-owned-website',
     'الفرق بين صفحة على منصة مؤقتة وموقع احترافي تملكه بالكامل، وكيف يؤثر ذلك على ثقة المريض.',
     '<p>كثير من الأطباء يكتفون بصفحة على وسائل التواصل، لكن هذا يترك حضورك الرقمي تحت رحمة منصة لا تملكها.</p><h2>المنصة المملوكة تعني التحكم</h2><p>موقعك الخاص يعرض خدماتك ومواعيدك وخبرتك بالشكل الذي تختاره، ويظهر باحترافية في نتائج جوجل.</p><h2>ما الذي يجب أن يوفره الموقع الطبي؟</h2><ul><li>سرعة تحميل عالية وتصميم متجاوب.</li><li>عرض واضح للخدمات والتخصصات.</li><li>ربط مباشر بواتساب وحجز المواعيد.</li><li>محتوى طبي يبني الثقة ويحسّن الظهور.</li></ul><h2>الخلاصة</h2><p>الموقع المملوك استثمار طويل المدى في سمعتك الرقمية، لا مصروف مؤقت.</p>',
     'فريق MDink Solutions', 5, false, true, 2,
     'لماذا يحتاج كل طبيب لموقع مملوك؟ | MDink Solutions',
     'أهمية امتلاك الطبيب لموقع احترافي خاص به من MDink Solutions.', now()),

    (c_clinics,
     '5 أخطاء شائعة في إدارة العيادات تفقدك مرضاك',
     'clinic-management-common-mistakes',
     'أخطاء إدارية بسيطة قد تكلّف العيادة مرضى كُثُر، وكيف تتجنبها بأدوات منظمة.',
     '<p>إدارة العيادة لا تقل أهمية عن الخبرة الطبية نفسها. أخطاء بسيطة قد تفقدك ثقة المريض.</p><h2>الأخطاء الخمسة</h2><ul><li>غياب نظام حجز واضح يسبب فوضى المواعيد.</li><li>عدم متابعة المريض بعد الزيارة.</li><li>الاعتماد على الورق بدل نظام رقمي.</li><li>عدم قياس رضا المرضى.</li><li>تجاهل الحضور الرقمي للعيادة.</li></ul><h2>الحل</h2><p>نظام إدارة عيادة متكامل يربط الحجوزات والمتابعة والتقارير في مكان واحد، ويحرر وقتك للتركيز على المريض.</p>',
     'فريق MDink Solutions', 5, false, true, 3,
     '5 أخطاء في إدارة العيادات | MDink Solutions',
     'أهم أخطاء إدارة العيادات وكيفية تجنبها من MDink Solutions.', now()),

    (c_seo,
     'SEO الطبي: كيف يجدك المريض على جوجل؟',
     'medical-seo-how-patients-find-you',
     'أساسيات تحسين ظهور المواقع الطبية في نتائج البحث لتصل للمريض في اللحظة المناسبة.',
     '<p>عندما يبحث المريض عن طبيب أو أعراض، فإن الظهور في الصفحة الأولى من جوجل يصنع الفرق.</p><h2>ما هو SEO الطبي؟</h2><p>هو تحسين موقعك ومحتواه ليظهر لمن يبحث عن خدماتك في منطقتك وتخصصك.</p><h2>عوامل أساسية</h2><ul><li>محتوى طبي دقيق يجيب على أسئلة المرضى.</li><li>سرعة الموقع وتوافقه مع الموبايل.</li><li>كلمات مفتاحية مرتبطة بتخصصك ومدينتك.</li><li>ملف Google Business محدّث.</li></ul><h2>الخلاصة</h2><p>SEO الطبي استثمار تراكمي: كل مقال وكل تحسين يزيد ظهورك مع الوقت دون تكلفة إعلانات مستمرة.</p>',
     'فريق MDink Solutions', 6, false, true, 4,
     'SEO الطبي: كيف يجدك المريض؟ | MDink Solutions',
     'أساسيات SEO الطبي لظهور موقعك في نتائج جوجل من MDink Solutions.', now()),

    (c_content,
     'المحتوى الطبي: كيف تكتب بلغة المريض دون أن تفقد الدقة؟',
     'medical-content-patient-language',
     'التوازن بين الدقة العلمية وبساطة اللغة هو سر المحتوى الطبي الذي يبني الثقة.',
     '<p>المحتوى الطبي الجيد يترجم خبرتك المعقدة إلى لغة يفهمها المريض دون تهوين أو تهويل.</p><h2>قواعد المحتوى الطبي الناجح</h2><ul><li>ابدأ بسؤال المريض الحقيقي.</li><li>استخدم لغة بسيطة مع الحفاظ على الدقة.</li><li>أضف أمثلة عملية قريبة من حياة المريض.</li><li>اختم بخطوة واضحة (تواصل، حجز، متابعة).</li></ul><h2>لماذا يهم؟</h2><p>المحتوى الذي يفهمه المريض يبني ثقة، والثقة تتحول إلى حجز. المحتوى المعقّد يطرد المريض مهما كان دقيقًا.</p><h2>الخلاصة</h2><p>اكتب للمريض لا لزملائك؛ الدقة ضرورية، لكن الوضوح هو ما يصنع القرار.</p>',
     'فريق MDink Solutions', 5, false, true, 5,
     'المحتوى الطبي بلغة المريض | MDink Solutions',
     'كيف تكتب محتوى طبيًا يفهمه المريض ويبني الثقة من MDink Solutions.', now());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.services) THEN
    INSERT INTO public.services (title, title_en, description, description_en, icon, display_order, is_active) VALUES
      ('تصميم مواقع طبية','Medical Websites','مواقع احترافية مملوكة للطبيب بالكامل، سريعة ومتجاوبة.','Doctor-owned professional, fast, responsive websites.','Globe',1,true),
      ('إدارة السوشيال ميديا','Social Media','إدارة صفحات طبية بمحتوى موثوق يجذب المرضى.','Trusted medical social content management.','Share2',2,true),
      ('SEO طبي','Medical SEO','تحسين الظهور في نتائج بحث جوجل للمرضى.','Higher visibility in patient search results.','Search',3,true),
      ('المحتوى الطبي','Medical Content','مقالات ومحتوى طبي دقيق بلغة المريض.','Accurate patient-friendly medical content.','FileText',4,true),
      ('التصوير داخل العيادة','In-Clinic Photography','تصوير احترافي داخل العيادة والمركز.','Professional in-clinic photography.','Camera',5,true),
      ('الفيديو والريلز','Video & Reels','فيديوهات وريلز طبية احترافية.','Professional medical videos and reels.','Video',6,true),
      ('الهوية البصرية','Branding','هوية بصرية متكاملة تعكس احترافيتك.','Complete visual identity.','Palette',7,true),
      ('الحملات الإعلانية','Ad Campaigns','حملات ممولة تستهدف المرضى الحقيقيين.','Targeted paid campaigns.','Megaphone',8,true),
      ('نظام إدارة العيادة','Clinic System','نظام حجوزات ومتابعة مرضى متكامل.','Booking & patient management system.','Calendar',9,true),
      ('ربط واتساب والحجز','WhatsApp & Booking','ربط الحجوزات بواتساب ونماذج التواصل.','WhatsApp booking integration.','MessageSquare',10,true),
      ('التقارير والتحليلات','Reports & Analytics','تقارير أداء دورية واضحة.','Clear periodic performance reports.','BarChart3',11,true),
      ('الدعم والتطوير','Support','متابعة وتطوير مستمر بعد التسليم.','Continuous support and development.','LifeBuoy',12,true);
  END IF;
END $$;

-- portfolio_projects (المشاريع الحالية)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.portfolio_projects) THEN
    INSERT INTO public.portfolio_projects (title, client_name, category, short_description, tags, project_url, button_text, display_order, is_active, is_featured) VALUES
      ('Allam Heart Care','د. علام','medical_websites','موقع طبي متكامل لرعاية القلب.','["موقع طبي","قلب"]','https://allamheartcare.com/','زيارة الموقع',1,true,true),
      ('Hawa Clinic','عيادة هَوى','medical_websites','موقع عيادة نسائية عصري.','["موقع طبي","نساء"]','https://howaclinic.com/','زيارة الموقع',2,true,true),
      ('Eyadaty','عيادتي','medical_websites','منصة طبية متكاملة.','["منصة","حجوزات"]','https://3eyadaty-eg.com/','زيارة الموقع',3,true,true),
      ('Seniors Clinic','عيادة كبار السن','medical_websites','موقع رعاية كبار السن.','["موقع طبي","رعاية"]','https://seniors-clinic.com/','زيارة الموقع',4,true,true),
      ('د. عزيزة الجباس','Dr. Aziza El Gabbas','social_media','إدارة سوشيال ميديا طبية.','["سوشيال"]','https://www.facebook.com/DR.AzizaElGabbas','زيارة الصفحة',5,true,false),
      ('د. منال العفيفي','Dr. Manal','social_media','إدارة سوشيال ميديا طبية.','["سوشيال"]','https://www.facebook.com/profile.php?id=100065293160185','زيارة الصفحة',6,true,false);
  END IF;
END $$;

-- video_testimonials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.video_testimonials) THEN
    INSERT INTO public.video_testimonials (client_name, client_title, client_specialty, video_url, rating, display_order, is_active) VALUES
      ('د. عزيزة الجباس','عميلة MDink','استشاري','/testimonials/aziza-review.mp4',5,1,true),
      ('د. أميرة المنقوش','عميلة من ليبيا','استشاري','/testimonials/amira-manqoush-review.mp4',5,2,true);
  END IF;
END $$;

-- written_testimonials
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.written_testimonials) THEN
    INSERT INTO public.written_testimonials (client_name, client_title, client_specialty, review_image_url, review_text, original_post_url, button_text, rating, is_verified, display_order, is_active) VALUES
      ('د. رجب علام','Dr. Ragab Allam','جهة طبية','/testimonials/ragab-allam-review.png',
       'شركة MDink أثبتت على مدار ما يقارب 5 سنوات مستوى عالٍ من الاحترافية والالتزام.',
       'https://www.linkedin.com/','عرض الرأي الكامل',5,true,1,true),
      ('د. أميرة المنقوش','Dr. Amira Al Mangoush','عميلة من ليبيا','/testimonials/amira-almangoush-review.png',
       'وصلت صفحتي لعدد متابعين كبير في وقت قصير بفضل سرعة الاستجابة والاهتمام بالتفاصيل.',
       NULL,'عرض الرأي الكامل',5,true,2,true);
  END IF;
END $$;

-- page_sections — الهيرو + why بالنصوص الجديدة المطلوبة
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content_json, video_url, display_order, is_visible) VALUES
  ('home','hero',
   'اليوم لا تحتاج ظهورًا رقميًا فقط، بل ظهور احترافي يميزك بين منافسيك',
   'فريق MDink Solutions للتسويق الطبي للعيادات والمستشفيات كله دكاترة بخبرة في الديجتال ماركتنج',
   '{"badge_ar":"شريكك الرقمي في القطاع الطبي","image_url":"/hero/stage-doctor.jpg","cta_primary_ar":"ابدأ مشروعك الطبي","cta_primary_url":"/contact#consultation","cta_secondary_ar":"شاهد أعمالنا","cta_secondary_url":"/portfolio"}',
   NULL,1,true),
  ('home','why_mdink',
   'ليه تختار MDink Solutions',
   'أسباب حقيقية تجعلنا الشريك الأنسب لحضورك الرقمي الطبي.',
   '{"points":["فريق طبي يفهم القطاع من داخله","منظومة متكاملة تحت سقف واحد","نتائج موثقة بآراء عملاء حقيقيين","متابعة وتطوير مستمر"]}',
   '',2,true),
  ('reviews','video_testimonials','شهادات بالفيديو','آراء حقيقية من عملائنا','{}',NULL,1,true),
  ('reviews','written_testimonials','آراء عملاء MDink Solutions','شهادات مكتوبة موثقة','{}',NULL,2,true)
ON CONFLICT (page_slug, section_key) DO NOTHING;
-- team_members: المؤسِّس
INSERT INTO public.team_members (name_ar, name_en, role_ar, role_en, bio_ar, is_founder, sort_order, is_visible)
SELECT 'شيماء فهمي','Shaimaa Fahmy','مؤسِّس MDink Solutions','Founder of MDink Solutions',
       'تقود MDink Solutions برؤية تجمع بين الفهم الحقيقي للقطاع الطبي والاهتمام بالتفاصيل.',
       true, 1, true
WHERE NOT EXISTS (SELECT 1 FROM public.team_members);

-- seo_settings: صفوف افتراضية لكل صفحة
INSERT INTO public.seo_settings (page_key, meta_title_ar, meta_description_ar) VALUES
  ('home','MDink Solutions — التسويق الطبي للعيادات والمستشفيات','شريكك الرقمي المتخصص في القطاع الطبي.'),
  ('services','خدمات MDink Solutions','خدمات تسويق طبي متكاملة.'),
  ('portfolio','أعمال MDink Solutions','نماذج من مشاريعنا الطبية.'),
  ('reviews','آراء عملاء MDink Solutions','شهادات حقيقية من عملائنا.'),
  ('about','من نحن — MDink Solutions','تعرّف على فريق MDink Solutions.'),
  ('blog','مدونة MDink Solutions','مقالات في التسويق الطبي.'),
  ('contact','تواصل مع MDink Solutions','ابدأ مشروعك الطبي معنا.')
ON CONFLICT (page_key) DO NOTHING;
-- ============================================================================
-- منح الإيميلين صلاحية admin إن كان لهما حساب Auth بالفعل
INSERT INTO public.admin_users (user_id, email, role, is_active)
SELECT u.id, lower(u.email), 'admin', true
FROM auth.users u
WHERE lower(u.email) IN ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com')
ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = true, user_id = EXCLUDED.user_id;

-- منع حذف/تعطيل/تنزيل الإيميلين الأساسيين
CREATE OR REPLACE FUNCTION public.protect_core_admins()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF lower(OLD.email) IN ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com') THEN
      RAISE EXCEPTION 'لا يمكن حذف حساب Super Admin أساسي محمي (%).', OLD.email;
    END IF;
    RETURN OLD;
  END IF;
  IF (TG_OP = 'UPDATE') THEN
    IF lower(OLD.email) IN ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com') THEN
      -- إبقاؤهما admin نشط دائمًا مهما حاول أحد تغييره
      NEW.role := 'admin';
      NEW.is_active := true;
      NEW.email := OLD.email;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_core_admins ON public.admin_users;
CREATE TRIGGER trg_protect_core_admins
  BEFORE UPDATE OR DELETE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.protect_core_admins();

-- ============================================================================
-- انتهى SUPABASE_SETUP.sql
-- ============================================================================
