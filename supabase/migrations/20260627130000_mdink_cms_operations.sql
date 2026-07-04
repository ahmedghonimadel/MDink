DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'website_admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'website_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'operations_admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'operations_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'team_member' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'team_member';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'viewer' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'viewer';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('super_admin','admin','moderator','website_admin','operations_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.admin_allowlist a ON lower(a.email) = lower(u.email)
    WHERE u.id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'super_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) IN ('shfahmy2010@gmail.com','tasneemfahmy21@gmail.com')
  )
$$;

ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS excerpt_ar text,
  ADD COLUMN IF NOT EXISTS excerpt_en text,
  ADD COLUMN IF NOT EXISTS content_ar text,
  ADD COLUMN IF NOT EXISTS content_en text,
  ADD COLUMN IF NOT EXISTS category_ar text,
  ADD COLUMN IF NOT EXISTS category_en text;

UPDATE public.blogs
SET
  title_ar = COALESCE(title_ar, title),
  excerpt_ar = COALESCE(excerpt_ar, excerpt),
  content_ar = COALESCE(content_ar, content),
  category_ar = COALESCE(category_ar, category)
WHERE title_ar IS NULL OR content_ar IS NULL;

ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS client_name_ar text,
  ADD COLUMN IF NOT EXISTS client_name_en text,
  ADD COLUMN IF NOT EXISTS specialty_ar text,
  ADD COLUMN IF NOT EXISTS specialty_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS challenge_ar text,
  ADD COLUMN IF NOT EXISTS challenge_en text,
  ADD COLUMN IF NOT EXISTS result_ar text,
  ADD COLUMN IF NOT EXISTS result_en text;

UPDATE public.portfolio_items
SET
  title_ar = COALESCE(title_ar, title),
  client_name_ar = COALESCE(client_name_ar, client_name),
  specialty_ar = COALESCE(specialty_ar, specialty),
  description_ar = COALESCE(description_ar, description),
  result_ar = COALESCE(result_ar, metrics->>'result')
WHERE title_ar IS NULL OR description_ar IS NULL;

ALTER TABLE public.reel_campaigns
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS notes_ar text,
  ADD COLUMN IF NOT EXISTS notes_en text,
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

UPDATE public.reel_campaigns
SET title_ar = COALESCE(title_ar, title), notes_ar = COALESCE(notes_ar, notes)
WHERE title_ar IS NULL;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS value_en text;

INSERT INTO public.site_config (key, value, description, value_en)
VALUES (
  'footer_about_text',
  'شريكك الرقمي المتخصص في القطاع الطبي: مواقع احترافية مملوكة للطبيب، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية تجذب المرضى الحقيقيين.',
  'النص التعريفي في الفوتر',
  'Your medical-sector digital partner: owned professional websites, social media management, medical SEO, and campaigns that attract real patients.'
)
ON CONFLICT (key) DO UPDATE
SET value_en = COALESCE(public.site_config.value_en, EXCLUDED.value_en);

ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS role_ar text,
  ADD COLUMN IF NOT EXISTS role_en text,
  ADD COLUMN IF NOT EXISTS bio_ar text,
  ADD COLUMN IF NOT EXISTS bio_en text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;

UPDATE public.team_members
SET
  name_ar = COALESCE(name_ar, full_name),
  name_en = COALESCE(name_en, full_name),
  role_ar = COALESCE(role_ar, role_title),
  role_en = COALESCE(role_en, role_title),
  bio_ar = COALESCE(bio_ar, bio),
  bio_en = COALESCE(bio_en, bio)
WHERE name_ar IS NULL OR role_ar IS NULL;

INSERT INTO public.team_members (
  full_name, role_title, email, image_url, bio, sort_order, is_visible,
  name_ar, name_en, role_ar, role_en, bio_ar, bio_en, is_featured, is_protected
) SELECT
  'Shaimaa Fahmy', 'Founder / Super Admin', 'shfahmy2010@gmail.com', '',
  'تقود MDink كرؤية رقمية متخصصة في المواقع الطبية والتسويق الرقمي للأطباء والعيادات.',
  0, true,
  'شيماء فهمي', 'Shaimaa Fahmy', 'المؤسس والمدير التنفيذي', 'Founder and Managing Director',
  'تقود شيماء رؤية MDink في بناء حضور رقمي احترافي للأطباء والعيادات.', 'Shaimaa leads MDink vision for professional medical digital growth.',
  true, true
WHERE NOT EXISTS (SELECT 1 FROM public.team_members WHERE lower(email) = 'shfahmy2010@gmail.com');

CREATE TABLE IF NOT EXISTS public.cms_pages (
  key text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  description_ar text NOT NULL DEFAULT '',
  description_en text,
  checkmarks_ar text[] NOT NULL DEFAULT ARRAY[]::text[],
  checkmarks_en text[] NOT NULL DEFAULT ARRAY[]::text[],
  icon text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  specialty text NOT NULL,
  phone text NOT NULL,
  email text,
  bio text,
  qualifications text,
  certificates_url text,
  photo_url text,
  social_links text,
  notes text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mdink_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_name text NOT NULL,
  clinic_name text,
  specialty text,
  phone text,
  email text,
  whatsapp text,
  website_url text,
  logo_url text,
  package_name text,
  services_included jsonb NOT NULL DEFAULT '{}'::jsonb,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  assigned_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  project_status text NOT NULL DEFAULT 'lead',
  payment_status text NOT NULL DEFAULT 'pending',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.mdink_clients(id) ON DELETE CASCADE,
  clinic_name text,
  address text,
  city text,
  google_maps_url text,
  phone text,
  working_hours text,
  notes text,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.mdink_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name text NOT NULL,
  client_id uuid REFERENCES public.mdink_clients(id) ON DELETE SET NULL,
  doctors jsonb NOT NULL DEFAULT '[]'::jsonb,
  website_url text,
  domain_status text,
  hosting_status text,
  design_status text,
  development_status text,
  seo_status text,
  content_status text,
  launch_status text,
  assigned_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_work_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  member_name text,
  role_title text,
  client_id uuid REFERENCES public.mdink_clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.mdink_projects(id) ON DELETE SET NULL,
  doctor_name text,
  task_type text NOT NULL,
  task_description text NOT NULL DEFAULT '',
  quantity int NOT NULL DEFAULT 1,
  work_date date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','blocked')),
  proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mdink_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.mdink_clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.mdink_projects(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  service_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric GENERATED ALWAYS AS (GREATEST(total_amount - paid_amount, 0)) STORED,
  installment_plan text,
  due_date date,
  payment_method text,
  payment_status text NOT NULL DEFAULT 'pending',
  attachment_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contact_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_ar text NOT NULL,
  label_en text,
  value text,
  url text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdink_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdink_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdink_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_channels ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.cms_pages, public.cms_services, public.contact_channels TO anon, authenticated;
GRANT INSERT ON public.doctor_applications TO anon, authenticated;
GRANT ALL ON public.cms_pages, public.cms_services, public.doctor_applications, public.mdink_clients, public.client_clinics, public.mdink_projects, public.team_work_logs, public.mdink_payments, public.contact_channels TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read cms pages" ON public.cms_pages;
CREATE POLICY "Public read cms pages" ON public.cms_pages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage cms pages" ON public.cms_pages;
CREATE POLICY "Admins manage cms pages" ON public.cms_pages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published cms services" ON public.cms_services;
CREATE POLICY "Public read published cms services" ON public.cms_services FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage cms services" ON public.cms_services;
CREATE POLICY "Admins manage cms services" ON public.cms_services FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public create doctor applications" ON public.doctor_applications;
CREATE POLICY "Public create doctor applications" ON public.doctor_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage doctor applications" ON public.doctor_applications;
CREATE POLICY "Admins manage doctor applications" ON public.doctor_applications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage mdink clients" ON public.mdink_clients;
CREATE POLICY "Admins manage mdink clients" ON public.mdink_clients FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage client clinics" ON public.client_clinics;
CREATE POLICY "Admins manage client clinics" ON public.client_clinics FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage mdink projects" ON public.mdink_projects;
CREATE POLICY "Admins manage mdink projects" ON public.mdink_projects FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Team sees own or admins all work logs" ON public.team_work_logs;
CREATE POLICY "Team sees own or admins all work logs" ON public.team_work_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Team inserts own work logs" ON public.team_work_logs;
CREATE POLICY "Team inserts own work logs" ON public.team_work_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins update work logs" ON public.team_work_logs;
CREATE POLICY "Admins update work logs" ON public.team_work_logs FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins manage payments" ON public.mdink_payments;
CREATE POLICY "Super admins manage payments" ON public.mdink_payments FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Public read active contact channels" ON public.contact_channels;
CREATE POLICY "Public read active contact channels" ON public.contact_channels FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage contact channels" ON public.contact_channels;
CREATE POLICY "Admins manage contact channels" ON public.contact_channels FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.cms_pages (key, content) VALUES
  ('home', '{
    "hero_title_ar":"السوشيال ميديا مكان مستأجر.. لكن موقعك هو عيادتك الافتراضية المملوكة لك بالكامل",
    "hero_title_en":"Social media is rented space. Your website is the virtual clinic you fully own.",
    "hero_subtitle_ar":"MDink Solutions تبني مواقع طبية مملوكة، تدير السوشيال ميديا، تطلق الحملات، وتدرّب الأطباء على محتوى طبي ينافس في جوجل.",
    "hero_subtitle_en":"MDink Solutions builds owned medical websites, manages social media, launches campaigns, and trains doctors on medical content that can compete on Google.",
    "primary_cta_ar":"ابدأ موقعك الآن",
    "primary_cta_en":"Start your website",
    "secondary_cta_ar":"شاهد خدماتنا",
    "secondary_cta_en":"View services",
    "preview_doctor_ar":"د. أحمد محمد",
    "preview_doctor_en":"Dr. Ahmed Mohamed",
    "preview_specialty_ar":"استشاري جراحة التجميل",
    "preview_specialty_en":"Plastic Surgery Consultant"
  }'::jsonb),
  ('about', '{
    "intro_ar":"MDink for Digital Solutions شركة حلول رقمية متخصصة بالكامل في خدمة القطاع الطبي.",
    "intro_en":"MDink for Digital Solutions is a digital solutions company fully specialized in the medical sector.",
    "vision_ar":"أن نكون المنصة الرقمية الأولى لأطباء مصر والشرق الأوسط.",
    "vision_en":"To become the leading digital platform for doctors in Egypt and the Middle East.",
    "mission_ar":"تحويل الخبرة الطبية إلى حضور رقمي مملوك وقابل للنمو.",
    "mission_en":"Turning medical expertise into an owned, scalable digital presence.",
    "values_ar":"الجودة، الشفافية، الالتزام، والابتكار.",
    "values_en":"Quality, transparency, commitment, and innovation."
  }'::jsonb),
  ('seo', '{"title_suffix":"MDink for Digital Solutions","default_og_image":"/icons/icon-512.png"}'::jsonb)
ON CONFLICT (key) DO UPDATE SET content = public.cms_pages.content || EXCLUDED.content, updated_at = now();

INSERT INTO public.cms_services (title_ar, title_en, description_ar, description_en, checkmarks_ar, checkmarks_en, icon, sort_order) VALUES
  ('تصميم وتطوير مواقع طبية','Medical Website Design','مواقع احترافية مملوكة للطبيب ومهيأة للسيو والموبايل.','Professional doctor-owned websites built for SEO and mobile.', ARRAY['تصميم مخصص','متجاوب مع الموبايل','تهيئة SEO'], ARRAY['Custom design','Mobile responsive','SEO ready'], 'Globe', 10),
  ('إدارة السوشيال ميديا','Social Media Management','تقويم محتوى وتصميم ومتابعة رسائل ونتائج.','Content calendars, design, message follow-up, and reporting.', ARRAY['تقويم شهري','تصميمات احترافية','متابعة الرسائل'], ARRAY['Monthly calendar','Professional designs','Message follow-up'], 'Sparkles', 20),
  ('SEO طبي','Medical SEO','تحسين ظهور الأطباء والعيادات في جوجل.','Improving doctors and clinics visibility on Google.', ARRAY['كلمات مفتاحية','Schema.org','محتوى متخصص'], ARRAY['Keywords','Schema.org','Specialized content'], 'TrendingUp', 30),
  ('حملات إعلانية','Paid Campaigns','حملات Meta و Google بأهداف واضحة وقياس مستمر.','Meta and Google campaigns with clear goals and continuous measurement.', ARRAY['Meta Ads','Google Ads','تقارير أداء'], ARRAY['Meta Ads','Google Ads','Performance reports'], 'Megaphone', 40),
  ('تصوير طبي و Reels','Medical Photography and Reels','جلسات تصوير وفيديوهات قصيرة جاهزة للنشر.','Photo sessions and short-form videos ready to publish.', ARRAY['تصوير احترافي','مونتاج Reels','صور للفريق والعيادة'], ARRAY['Professional shoots','Reels editing','Team and clinic visuals'], 'Camera', 50)
ON CONFLICT DO NOTHING;

INSERT INTO public.contact_channels (label_ar, label_en, value, url, icon, sort_order) VALUES
  ('واتساب','WhatsApp','010 15587495','https://wa.me/201015587495','MessageCircle',10),
  ('فيسبوك','Facebook','MDink Solutions','https://www.facebook.com/MDinksolutions','Facebook',20),
  ('لينكدإن','LinkedIn','MDink','https://www.linkedin.com/company/mdink/','Linkedin',30),
  ('إنستجرام','Instagram','يضاف لاحقًا','https://www.instagram.com','Instagram',40)
ON CONFLICT DO NOTHING;
