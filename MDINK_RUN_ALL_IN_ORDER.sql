-- ============================================================
-- MDink Solutions — كل التعديلات في ملف واحد بالترتيب الصحيح
-- شغّلي الملف ده مرة واحدة بالكامل في Supabase SQL Editor.
-- آمن: يعيد التشغيل بدون ضرر (idempotent قدر الإمكان).
-- ============================================================


-- ===================== 20260621143053_983218db-021b-455f-9401-c4d13fe9bb0a.sql =====================


-- Roles enum and table
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'doctor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
-- [uniq-guard] public.user_roles (user_id, role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='user_roles' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['user_id','role']) x)
  ) THEN
    BEGIN ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_uq UNIQUE (user_id, role);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin','moderator'))
$$;

DROP POLICY IF EXISTS "Users read own roles" ON public.user_roles;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  specialty TEXT,
  bio TEXT,
  qualifications TEXT,
  experience_years INT,
  whatsapp TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- [uniq-guard] public.profiles (id)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='profiles' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['id']) x)
  ) THEN
    BEGIN ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_uq UNIQUE (id);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read published profiles" ON public.profiles;
CREATE POLICY "Public read published profiles" ON public.profiles FOR SELECT TO anon, authenticated
  USING (is_published = true OR auth.uid() = id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Doctor manages own profile" ON public.profiles;
CREATE POLICY "Doctor manages own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_profiles_updated ON public.profiles;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clinics
CREATE TABLE IF NOT EXISTS public.clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  google_maps_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  working_hours JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT SELECT ON public.clinics TO anon;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read clinics" ON public.clinics;
CREATE POLICY "Public read clinics" ON public.clinics FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Doctor manages own clinics" ON public.clinics;
CREATE POLICY "Doctor manages own clinics" ON public.clinics FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_clinics_updated ON public.clinics;
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT SELECT ON public.services TO anon;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read services" ON public.services;
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Doctor manages own services" ON public.services;
CREATE POLICY "Doctor manages own services" ON public.services FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_services_updated ON public.services;
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Testimonials
CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  rating INT CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT SELECT ON public.testimonials TO anon;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read approved testimonials" ON public.testimonials;
CREATE POLICY "Public read approved testimonials" ON public.testimonials FOR SELECT TO anon, authenticated
  USING (is_approved = true OR auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Doctor manages own testimonials" ON public.testimonials;
CREATE POLICY "Doctor manages own testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));

-- Content calendar
CREATE TABLE IF NOT EXISTS public.content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  platform TEXT NOT NULL,
  post_title TEXT NOT NULL,
  post_body TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar TO authenticated;
GRANT ALL ON public.content_calendar TO service_role;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Doctor reads own calendar" ON public.content_calendar;
CREATE POLICY "Doctor reads own calendar" ON public.content_calendar FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Doctor updates own calendar status" ON public.content_calendar;
CREATE POLICY "Doctor updates own calendar status" ON public.content_calendar FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins create calendar entries" ON public.content_calendar;
CREATE POLICY "Admins create calendar entries" ON public.content_calendar FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete calendar entries" ON public.content_calendar;
CREATE POLICY "Admins delete calendar entries" ON public.content_calendar FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_calendar_updated ON public.content_calendar;
CREATE TRIGGER trg_calendar_updated BEFORE UPDATE ON public.content_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins read leads" ON public.leads;
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update leads" ON public.leads;
CREATE POLICY "Admins update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete leads" ON public.leads;
CREATE POLICY "Admins delete leads" ON public.leads FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_username TEXT;
  v_fullname TEXT;
BEGIN
  v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', regexp_replace(split_part(NEW.email,'@',1), '[^a-zA-Z0-9_]', '', 'g'));
  -- ensure unique
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || floor(random()*1000)::text;
  END LOOP;
  -- [auto-guard]
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, v_username, v_fullname, NEW.email);
  -- [auto-guard]
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role public.app_role;
INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ===================== 20260621143111_3ebd0d6f-f792-4e81-ad4e-0a6859d77166.sql =====================


REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;


-- ===================== 20260621163342_019226af-6960-4f9a-972e-b53345fcc8f5.sql =====================


CREATE TABLE IF NOT EXISTS public.site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- [uniq-guard] public.site_config (key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='site_config' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['key']) x)
  ) THEN
    BEGIN ALTER TABLE public.site_config ADD CONSTRAINT site_config_key_uq UNIQUE (key);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT ALL ON public.site_config TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_config TO authenticated;

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read site_config" ON public.site_config;
CREATE POLICY "Public can read site_config"
  ON public.site_config FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can insert site_config" ON public.site_config;
CREATE POLICY "Admins can insert site_config"
  ON public.site_config FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update site_config" ON public.site_config;
CREATE POLICY "Admins can update site_config"
  ON public.site_config FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete site_config" ON public.site_config;
CREATE POLICY "Admins can delete site_config"
  ON public.site_config FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS update_site_config_updated_at ON public.site_config;
CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure legacy site_config tables have the expected columns
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- [auto-guard]
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS description TEXT;

INSERT INTO public.site_config (key, value, description) VALUES
  ('contact_phone',        '+20 102 065 8409',                                                                                                  'رقم الهاتف الرئيسي الظاهر في الموقع'),
  ('contact_email',        'info@mdink.com',                                                                                                    'البريد الإلكتروني الرسمي'),
  ('whatsapp_number',      '201020658409',                                                                                                      'رقم واتساب بصيغة دولية بدون +'),
  ('facebook_url',         'https://www.facebook.com/share/1DufbAtv6R/',                                                                        'رابط صفحة فيسبوك'),
  ('instagram_url',        'https://www.instagram.com',                                                                                         'رابط إنستجرام'),
  ('linkedin_url',         'https://www.linkedin.com/posts/mdink-for-digital-solutions_mdink-digitalabrsolutions-activity-7451243778880860161-KuYH', 'رابط لينكدإن'),
  ('twitter_url',          'https://x.com',                                                                                                     'رابط تويتر / X'),
  ('tiktok_url',           'https://www.tiktok.com',                                                                                            'رابط تيك توك'),
  ('footer_about_text',    'شريكك الرقمي المتخصص في القطاع الطبي: مواقع احترافية مملوكة للطبيب، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية تجذب المرضى الحقيقيين.', 'النص التعريفي في الفوتر'),
  ('meta_title_suffix',    'MDink Solutions',                                                                                                   'لاحقة عنوان الصفحة في تبويب المتصفح')
ON CONFLICT (key) DO NOTHING;


-- ===================== 20260621192411_c6f203ff-ac6a-40d1-beda-3e9111c34dcb.sql =====================


-- Blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  category text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- [uniq-guard] public.blogs (slug)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='blogs' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['slug']) x)
  ) THEN
    BEGIN ALTER TABLE public.blogs ADD CONSTRAINT blogs_slug_uq UNIQUE (slug);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read published blogs" ON public.blogs;
CREATE POLICY "Public can read published blogs" ON public.blogs FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage blogs" ON public.blogs;
CREATE POLICY "Admins manage blogs" ON public.blogs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_blogs_updated ON public.blogs;
CREATE TRIGGER trg_blogs_updated BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dynamic Links table
CREATE TABLE IF NOT EXISTS public.dynamic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  url text NOT NULL,
  platform_type text NOT NULL DEFAULT 'web',
  icon text,
  accent_color text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.dynamic_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dynamic_links TO authenticated;
GRANT ALL ON public.dynamic_links TO service_role;
ALTER TABLE public.dynamic_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active links" ON public.dynamic_links;
CREATE POLICY "Public can read active links" ON public.dynamic_links FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage links" ON public.dynamic_links;
CREATE POLICY "Admins manage links" ON public.dynamic_links FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_links_updated ON public.dynamic_links;
CREATE TRIGGER trg_links_updated BEFORE UPDATE ON public.dynamic_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed site_config (idempotent)
-- [auto-guard]
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS description TEXT;
INSERT INTO public.site_config (key, value, description) VALUES
  ('contact_phone',     '+20 102 065 8409',                                                                            'رقم الهاتف الرئيسي'),
  ('contact_email',     'info@mdink.io',                                                                                'البريد الإلكتروني'),
  ('whatsapp_number',   '201020658409',                                                                                 'رقم واتساب دولي بدون +'),
  ('whatsapp_url',      'https://api.whatsapp.com/send/?phone=201020658409&text&type=phone_number&app_absent=0',         'رابط واتساب الكامل'),
  ('facebook_url',      'https://www.facebook.com/share/1DufbAtv6R/',                                                    'صفحة فيسبوك'),
  ('instagram_url',     'https://www.instagram.com/mdink.solutions',                                                     'إنستجرام'),
  ('linkedin_url',      'https://www.linkedin.com/posts/mdink-for-digital-solutions_mdink-digitalabrsolutions-activity-7451243778880860161-KuYH', 'لينكدإن'),
  ('twitter_url',       '',                                                                                              'X / تويتر'),
  ('tiktok_url',        '',                                                                                              'تيك توك'),
  ('meta_title_suffix', 'MDink for Digital Solutions',                                                                   'لاحقة عنوان الصفحة'),
  ('footer_about_text', 'شريكك الرقمي المتخصص في القطاع الطبي: مواقع احترافية مملوكة للطبيب، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية تجذب المرضى الحقيقيين.', 'نص الفوتر'),
  ('hero_tagline',      'السوشيال ميديا مكان مستأجر.. لكن الموقع الإلكتروني هو عيادتك الافتراضية المملوكة لك بالكامل',  'الهوك الرئيسي'),
  ('uvp_text',          'فريق كله دكاترة بخبرة في الديجيتال ماركتنج، ونقدّم تدريب مجاني على كتابة المحتوى الطبي وتصدّر محركات البحث SEO.', 'القيمة المضافة')
ON CONFLICT (key) DO NOTHING;

-- Seed initial dynamic links (live portfolio + reels)
-- Ensure legacy dynamic_links tables have the expected columns
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'web';
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- [auto-guard]
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS platform_type text NOT NULL DEFAULT 'web';
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS accent_color text;
ALTER TABLE public.dynamic_links ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
INSERT INTO public.dynamic_links (title, subtitle, url, platform_type, accent_color, sort_order) VALUES
  ('Allam Heart Care Center', 'منصة متقدمة لطب القلب', 'https://allamheartcare.com', 'web', '#E63946', 10),
  ('Howa Clinics',            'الصدارة على Google – طب ذكوري', 'https://howaclinic.com', 'web', '#0077B6', 20),
  ('Seniors Clinic',          'منصة رعاية كبار السن الفاخرة', 'https://seniors-clinic.com/en/home/', 'web', '#06B6A4', 30),
  ('Viral Reel — Campaign 01', 'حملة محتوى طبي فيروسي', 'https://www.instagram.com/reel/DNyFBP1WNB9/', 'instagram', '#1A44B3', 40),
  ('Viral Reel — Campaign 02', 'محتوى توعوي عالي التفاعل', 'https://www.instagram.com/reel/DNqZxjqMybo/', 'instagram', '#1A44B3', 50)
ON CONFLICT DO NOTHING;

-- Seed a starter blog post so the page isn't empty
-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;

INSERT INTO public.blogs (title, slug, excerpt, content, category, status, published_at) VALUES
  ('لماذا الموقع الإلكتروني هو عيادتك الحقيقية على الإنترنت؟',
   'why-website-is-your-real-clinic',
   'السوشيال ميديا مكان مستأجر — أي حظر أو تغيير خوارزمية يمحو سنوات من العمل. الموقع وحده ما تملكه فعلاً.',
   '## ملكية كاملة لبياناتك ومرضاك

السوشيال ميديا أداة جذب ممتازة، لكنها ليست بديلاً عن المنصة المملوكة لك بالكامل...

في MDink نبني للطبيب موقعاً يتصدّر جوجل، يحوّل الزائر إلى حالة فعلية، ويحمي بياناته من أي تغيير مفاجئ في سياسات المنصات.',
   'استراتيجية',
   'published',
   now())
ON CONFLICT (slug) DO NOTHING;


-- ===================== 20260627090000_mdink_final_delivery.sql =====================

-- Final delivery hardening and feature tables for MDink.

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  full_name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'super_admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
-- [uniq-guard] public.admin_allowlist (email)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='admin_allowlist' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['email']) x)
  ) THEN
    BEGIN ALTER TABLE public.admin_allowlist ADD CONSTRAINT admin_allowlist_email_uq UNIQUE (email);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;

DROP POLICY IF EXISTS "Admins read admin_allowlist" ON public.admin_allowlist;
DROP POLICY IF EXISTS "Admins read admin_allowlist" ON public.admin_allowlist;
CREATE POLICY "Admins read admin_allowlist"
  ON public.admin_allowlist FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- [auto-guard]
ALTER TABLE public.admin_allowlist ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.admin_allowlist ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.admin_allowlist ADD COLUMN IF NOT EXISTS role public.app_role NOT NULL DEFAULT 'super_admin';

INSERT INTO public.admin_allowlist (email, full_name, role) VALUES
  ('shfahmy2010@gmail.com', 'Shaimaa Fahmy', 'super_admin'),
  ('tasneemfahmy21@gmail.com', 'MDink Admin', 'super_admin')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','admin','moderator')
  )
  OR EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.admin_allowlist a ON lower(a.email) = lower(u.email)
    WHERE u.id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username text;
  v_fullname text;
  v_role public.app_role;
BEGIN
  v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1));
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', regexp_replace(split_part(NEW.email,'@',1), '[^a-zA-Z0-9_]', '', 'g'));

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_username := v_username || floor(random()*1000)::text;
  END LOOP;

  -- [auto-guard]
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id UUID;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, v_username, v_fullname, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT role INTO v_role
  FROM public.admin_allowlist
  WHERE lower(email) = lower(NEW.email);

  -- [auto-guard]
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role public.app_role;

INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(v_role, 'doctor'))
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_protected_super_admin_role_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  IF OLD.role <> 'super_admin' THEN
    RETURN OLD;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = OLD.user_id;
  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = lower(v_email)) THEN
    RAISE EXCEPTION 'Protected super admin role cannot be deleted';
  END IF;

  IF (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last super admin role';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_role_delete ON public.user_roles;
CREATE TRIGGER protect_super_admin_role_delete
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_super_admin_role_delete();

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  client_name text,
  specialty text,
  description text NOT NULL DEFAULT '',
  website_url text,
  image_url text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- [uniq-guard] public.portfolio_items (slug)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='portfolio_items' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['slug']) x)
  ) THEN
    BEGIN ALTER TABLE public.portfolio_items ADD CONSTRAINT portfolio_items_slug_uq UNIQUE (slug);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.reel_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  reel_url text NOT NULL,
  views int NOT NULL DEFAULT 0,
  likes int NOT NULL DEFAULT 0,
  comments int NOT NULL DEFAULT 0,
  notes text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text NOT NULL,
  specialty text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','lost')),
  source text NOT NULL DEFAULT 'website',
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.client_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  client_name text NOT NULL,
  phone text,
  service_name text NOT NULL DEFAULT 'Website and marketing package',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','installment','paid','overdue','cancelled')),
  installment_due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  image_url text NOT NULL,
  category text NOT NULL DEFAULT 'clinic',
  sort_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_gallery ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.portfolio_items, public.reel_campaigns TO anon, authenticated;
GRANT INSERT ON public.consultations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items, public.reel_campaigns, public.consultations, public.client_payments, public.doctor_gallery TO authenticated;
GRANT ALL ON public.portfolio_items, public.reel_campaigns, public.consultations, public.client_payments, public.doctor_gallery TO service_role;

DROP POLICY IF EXISTS "Public read published portfolio_items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Public read published portfolio_items" ON public.portfolio_items;
CREATE POLICY "Public read published portfolio_items" ON public.portfolio_items
  FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage portfolio_items" ON public.portfolio_items;
DROP POLICY IF EXISTS "Admins manage portfolio_items" ON public.portfolio_items;
CREATE POLICY "Admins manage portfolio_items" ON public.portfolio_items
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published reel_campaigns" ON public.reel_campaigns;
DROP POLICY IF EXISTS "Public read published reel_campaigns" ON public.reel_campaigns;
CREATE POLICY "Public read published reel_campaigns" ON public.reel_campaigns
  FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage reel_campaigns" ON public.reel_campaigns;
DROP POLICY IF EXISTS "Admins manage reel_campaigns" ON public.reel_campaigns;
CREATE POLICY "Admins manage reel_campaigns" ON public.reel_campaigns
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can submit consultations" ON public.consultations;
DROP POLICY IF EXISTS "Anyone can submit consultations" ON public.consultations;
CREATE POLICY "Anyone can submit consultations" ON public.consultations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
CREATE POLICY "Admins manage consultations" ON public.consultations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage client_payments" ON public.client_payments;
DROP POLICY IF EXISTS "Admins manage client_payments" ON public.client_payments;
CREATE POLICY "Admins manage client_payments" ON public.client_payments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published doctor_gallery" ON public.doctor_gallery;
DROP POLICY IF EXISTS "Public read published doctor_gallery" ON public.doctor_gallery;
CREATE POLICY "Public read published doctor_gallery" ON public.doctor_gallery
  FOR SELECT TO anon, authenticated USING (is_published OR auth.uid() = doctor_id OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Doctors manage own doctor_gallery" ON public.doctor_gallery;
DROP POLICY IF EXISTS "Doctors manage own doctor_gallery" ON public.doctor_gallery;
CREATE POLICY "Doctors manage own doctor_gallery" ON public.doctor_gallery
  FOR ALL TO authenticated USING (auth.uid() = doctor_id OR public.is_admin(auth.uid())) WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_portfolio_items_updated ON public.portfolio_items;
CREATE TRIGGER trg_portfolio_items_updated BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_reel_campaigns_updated ON public.reel_campaigns;
CREATE TRIGGER trg_reel_campaigns_updated BEFORE UPDATE ON public.reel_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_consultations_updated ON public.consultations;
CREATE TRIGGER trg_consultations_updated BEFORE UPDATE ON public.consultations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_client_payments_updated ON public.client_payments;
CREATE TRIGGER trg_client_payments_updated BEFORE UPDATE ON public.client_payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_doctor_gallery_updated ON public.doctor_gallery;
CREATE TRIGGER trg_doctor_gallery_updated BEFORE UPDATE ON public.doctor_gallery FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- [auto-guard]
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS description TEXT;
INSERT INTO public.site_config (key, value, description) VALUES
  ('contact_phone', '010 15587495', 'رقم الهاتف الرئيسي الظاهر في الموقع'),
  ('contact_email', 'info@mdinksolutions.com', 'البريد الإلكتروني الرسمي'),
  ('whatsapp_number', '201015587495', 'رقم واتساب بصيغة دولية بدون +'),
  ('whatsapp_url', 'https://wa.me/201015587495', 'رابط واتساب الكامل'),
  ('facebook_url', 'https://www.facebook.com/MDinksolutions', 'رابط صفحة فيسبوك'),
  ('instagram_url', 'https://www.instagram.com', 'إنستجرام - يحدّث من لوحة الأدمن عند إنشاء الحساب'),
  ('linkedin_url', 'https://www.linkedin.com/company/mdink/', 'رابط لينكدإن'),
  ('twitter_url', '', 'X / تويتر'),
  ('tiktok_url', '', 'تيك توك'),
  ('hero_tagline', 'السوشيال ميديا مكان مستأجر.. لكن موقعك هو عيادتك الافتراضية المملوكة لك بالكامل', 'الهوك الرئيسي'),
  ('uvp_text', 'MDink تجمع بين تطوير المواقع الطبية، التسويق الرقمي، السيو الطبي، ولوحات التحكم في منتج واحد قابل للنمو.', 'القيمة المضافة')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;

-- [auto-guard]
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

INSERT INTO public.portfolio_items (title, slug, client_name, specialty, description, website_url, image_url, metrics, is_featured, sort_order) VALUES
  ('Allam Heart Care Center', 'allam-heart-care-center', 'Allam Heart Care Center', 'Cardiology', 'منصة طبية احترافية لعيادة قلب مع تجربة واضحة للحجز والتواصل.', 'https://allamheartcare.com', '', '{"result":"موقع طبي سريع ومهيأ للسيو"}', true, 10),
  ('Howa Clinics', 'howa-clinics', 'Howa Clinics', 'Andrology', 'حضور رقمي طبي موجه لمحركات البحث والتحويل المباشر عبر واتساب.', 'https://howaclinic.com', '', '{"result":"تحسين الظهور في Google"}', true, 20),
  ('Seniors Clinic', 'seniors-clinic', 'Seniors Clinic', 'Geriatrics', 'واجهة طبية راقية لخدمات رعاية كبار السن مع محتوى منظم وسهل التصفح.', 'https://seniors-clinic.com/en/home/', '', '{"result":"تجربة مستخدم موثوقة"}', true, 30)
ON CONFLICT (slug) DO NOTHING;

-- [auto-guard]
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'instagram';
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS reel_url text;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS views int NOT NULL DEFAULT 0;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS likes int NOT NULL DEFAULT 0;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS comments int NOT NULL DEFAULT 0;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.reel_campaigns ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
INSERT INTO public.reel_campaigns (title, platform, reel_url, views, likes, comments, notes, sort_order) VALUES
  ('Viral Reel - Campaign 01', 'instagram', 'https://www.instagram.com/reel/DNyFBP1WNB9/', 0, 0, 0, 'الأرقام تحدث يدويًا من لوحة الأدمن', 10),
  ('Viral Reel - Campaign 02', 'instagram', 'https://www.instagram.com/reel/DNqZxjqMybo/', 0, 0, 0, 'الأرقام تحدث يدويًا من لوحة الأدمن', 20)
ON CONFLICT DO NOTHING;


-- ===================== 20260627100000_mdink_team_and_contact_update.sql =====================

-- Team management and contact form refinement.

ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  role_title text NOT NULL,
  email text,
  image_url text,
  bio text,
  sort_order int NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

DROP POLICY IF EXISTS "Public read visible team_members" ON public.team_members;
DROP POLICY IF EXISTS "Public read visible team_members" ON public.team_members;
CREATE POLICY "Public read visible team_members"
  ON public.team_members FOR SELECT TO anon, authenticated
  USING (is_visible OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage team_members" ON public.team_members;
DROP POLICY IF EXISTS "Admins manage team_members" ON public.team_members;
CREATE POLICY "Admins manage team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_team_members_updated ON public.team_members;
CREATE TRIGGER trg_team_members_updated
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- [auto-guard]
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
INSERT INTO public.team_members (full_name, role_title, email, image_url, bio, sort_order, is_visible) VALUES
  ('Shaimaa Fahmy', 'Founder / Super Admin', 'shfahmy2010@gmail.com', '', 'تقود MDink كرؤية رقمية متخصصة في المواقع الطبية والتسويق الرقمي للأطباء والعيادات.', 10, true)
ON CONFLICT DO NOTHING;


-- ===================== 20260627110000_protect_core_admin_updates.sql =====================

-- Protect core MDink admins from role deletion or downgrade at database level.

CREATE OR REPLACE FUNCTION public.prevent_protected_super_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = COALESCE(OLD.user_id, NEW.user_id);

  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = lower(v_email)) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Protected core admin role cannot be deleted';
    END IF;

    IF TG_OP = 'UPDATE' AND (NEW.role <> 'super_admin' OR NEW.user_id <> OLD.user_id) THEN
      RAISE EXCEPTION 'Protected core admin role cannot be changed';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last super admin role';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_role_delete ON public.user_roles;
DROP TRIGGER IF EXISTS protect_core_admin_role_change ON public.user_roles;
CREATE TRIGGER protect_core_admin_role_change
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_super_admin_role_change();


-- ===================== 20260627130000_mdink_cms_operations.sql =====================

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

-- [auto-guard]
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS description TEXT;
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

-- [auto-guard]
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS full_name text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS role_title text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
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
-- [uniq-guard] public.cms_pages (key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='cms_pages' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['key']) x)
  ) THEN
    BEGIN ALTER TABLE public.cms_pages ADD CONSTRAINT cms_pages_key_uq UNIQUE (key);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;

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
DROP POLICY IF EXISTS "Public read cms pages" ON public.cms_pages;
CREATE POLICY "Public read cms pages" ON public.cms_pages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage cms pages" ON public.cms_pages;
DROP POLICY IF EXISTS "Admins manage cms pages" ON public.cms_pages;
CREATE POLICY "Admins manage cms pages" ON public.cms_pages FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published cms services" ON public.cms_services;
DROP POLICY IF EXISTS "Public read published cms services" ON public.cms_services;
CREATE POLICY "Public read published cms services" ON public.cms_services FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage cms services" ON public.cms_services;
DROP POLICY IF EXISTS "Admins manage cms services" ON public.cms_services;
CREATE POLICY "Admins manage cms services" ON public.cms_services FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public create doctor applications" ON public.doctor_applications;
DROP POLICY IF EXISTS "Public create doctor applications" ON public.doctor_applications;
CREATE POLICY "Public create doctor applications" ON public.doctor_applications FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage doctor applications" ON public.doctor_applications;
DROP POLICY IF EXISTS "Admins manage doctor applications" ON public.doctor_applications;
CREATE POLICY "Admins manage doctor applications" ON public.doctor_applications FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage mdink clients" ON public.mdink_clients;
DROP POLICY IF EXISTS "Admins manage mdink clients" ON public.mdink_clients;
CREATE POLICY "Admins manage mdink clients" ON public.mdink_clients FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage client clinics" ON public.client_clinics;
DROP POLICY IF EXISTS "Admins manage client clinics" ON public.client_clinics;
CREATE POLICY "Admins manage client clinics" ON public.client_clinics FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage mdink projects" ON public.mdink_projects;
DROP POLICY IF EXISTS "Admins manage mdink projects" ON public.mdink_projects;
CREATE POLICY "Admins manage mdink projects" ON public.mdink_projects FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Team sees own or admins all work logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Team sees own or admins all work logs" ON public.team_work_logs;
CREATE POLICY "Team sees own or admins all work logs" ON public.team_work_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Team inserts own work logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Team inserts own work logs" ON public.team_work_logs;
CREATE POLICY "Team inserts own work logs" ON public.team_work_logs FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) OR auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins update work logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Admins update work logs" ON public.team_work_logs;
CREATE POLICY "Admins update work logs" ON public.team_work_logs FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Super admins manage payments" ON public.mdink_payments;
DROP POLICY IF EXISTS "Super admins manage payments" ON public.mdink_payments;
CREATE POLICY "Super admins manage payments" ON public.mdink_payments FOR ALL TO authenticated USING (public.is_super_admin(auth.uid())) WITH CHECK (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Public read active contact channels" ON public.contact_channels;
DROP POLICY IF EXISTS "Public read active contact channels" ON public.contact_channels;
CREATE POLICY "Public read active contact channels" ON public.contact_channels FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage contact channels" ON public.contact_channels;
DROP POLICY IF EXISTS "Admins manage contact channels" ON public.contact_channels;
CREATE POLICY "Admins manage contact channels" ON public.contact_channels FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;

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

-- [auto-guard]
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '';
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS checkmarks_ar text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS checkmarks_en text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
INSERT INTO public.cms_services (title_ar, title_en, description_ar, description_en, checkmarks_ar, checkmarks_en, icon, sort_order) VALUES
  ('تصميم وتطوير مواقع طبية','Medical Website Design','مواقع احترافية مملوكة للطبيب ومهيأة للسيو والموبايل.','Professional doctor-owned websites built for SEO and mobile.', ARRAY['تصميم مخصص','متجاوب مع الموبايل','تهيئة SEO'], ARRAY['Custom design','Mobile responsive','SEO ready'], 'Globe', 10),
  ('إدارة السوشيال ميديا','Social Media Management','تقويم محتوى وتصميم ومتابعة رسائل ونتائج.','Content calendars, design, message follow-up, and reporting.', ARRAY['تقويم شهري','تصميمات احترافية','متابعة الرسائل'], ARRAY['Monthly calendar','Professional designs','Message follow-up'], 'Sparkles', 20),
  ('SEO طبي','Medical SEO','تحسين ظهور الأطباء والعيادات في جوجل.','Improving doctors and clinics visibility on Google.', ARRAY['كلمات مفتاحية','Schema.org','محتوى متخصص'], ARRAY['Keywords','Schema.org','Specialized content'], 'TrendingUp', 30),
  ('حملات إعلانية','Paid Campaigns','حملات Meta و Google بأهداف واضحة وقياس مستمر.','Meta and Google campaigns with clear goals and continuous measurement.', ARRAY['Meta Ads','Google Ads','تقارير أداء'], ARRAY['Meta Ads','Google Ads','Performance reports'], 'Megaphone', 40),
  ('تصوير طبي و Reels','Medical Photography and Reels','جلسات تصوير وفيديوهات قصيرة جاهزة للنشر.','Photo sessions and short-form videos ready to publish.', ARRAY['تصوير احترافي','مونتاج Reels','صور للفريق والعيادة'], ARRAY['Professional shoots','Reels editing','Team and clinic visuals'], 'Camera', 50)
ON CONFLICT DO NOTHING;

-- [auto-guard]
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS label_ar text;
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS label_en text;
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS value text;
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS url text;
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.contact_channels ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
INSERT INTO public.contact_channels (label_ar, label_en, value, url, icon, sort_order) VALUES
  ('واتساب','WhatsApp','010 15587495','https://wa.me/201015587495','MessageCircle',10),
  ('فيسبوك','Facebook','MDink Solutions','https://www.facebook.com/MDinksolutions','Facebook',20),
  ('لينكدإن','LinkedIn','MDink','https://www.linkedin.com/company/mdink/','Linkedin',30),
  ('إنستجرام','Instagram','يضاف لاحقًا','https://www.instagram.com','Instagram',40)
ON CONFLICT DO NOTHING;


-- ===================== 20260628000000_phase1_full_dynamic.sql =====================

-- ============================================================
-- MDink — Phase 1: Full Dynamic Control
-- يكمل كل الحقول الناقصة عشان لوحة التحكم تتحكم في كل نقطة
-- ============================================================

-- 1) توسيع cms_pages/home بكل الأقسام الديناميكية
-- (services_json, advantages_json, stats_json, dashboard_card_json, sections order/visibility)
-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content) VALUES
  ('home', '{
    "badge_ar":"فريق كله دكاترة بخبرة في الديجيتال ماركتنج",
    "badge_en":"A medical team with digital marketing expertise",
    "trust_ar":["تسليم في 25 يوم","دعم متواصل","ضمان الجودة"],
    "trust_en":["25-day delivery","Continuous support","Quality assurance"],
    "preview_label_ar":"معاينة موقع الطبيب",
    "preview_label_en":"Doctor site preview",
    "preview_url":"mdink.com/dr/ahmed-mohamed",
    "published_label_ar":"منشور",
    "published_label_en":"Published",
    "dashboard_card_json":[
      {"label_ar":"زوار الموقع","label_en":"Website visitors","value":"12,438","icon":"Users"},
      {"label_ar":"حجوزات الشهر","label_en":"Monthly bookings","value":"287","icon":"CalendarCheck"},
      {"label_ar":"نمو التفاعل","label_en":"Engagement growth","value":"+42%","icon":"TrendingUp"},
      {"label_ar":"حملات نشطة","label_en":"Active campaigns","value":"3","icon":"Megaphone"}
    ],
    "stats_json":[
      {"value":"+50","label_ar":"طبيب وعيادة","label_en":"Doctors and clinics"},
      {"value":"+120","label_ar":"حملة إعلانية","label_en":"Ad campaigns"},
      {"value":"+10","label_ar":"تخصصات طبية","label_en":"Medical specialties"},
      {"value":"98%","label_ar":"رضا العملاء","label_en":"Client satisfaction"}
    ],
    "services_title_ar":"خدمات MDink الكاملة",
    "services_title_en":"Complete MDink Services",
    "services_intro_ar":"كل ما يحتاجه طبيبك للوصول للريادة الرقمية في مكان واحد.",
    "services_intro_en":"Everything a medical brand needs to grow digitally in one place.",
    "services_json":[
      {"title_ar":"تصميم مواقع طبية","title_en":"Medical Websites","desc_ar":"موقع احترافي خاص بكل طبيب مهيأ للسيو والموبايل.","desc_en":"Professional doctor-owned websites built for SEO and mobile.","icon":"Globe"},
      {"title_ar":"سيو طبي متقدم","title_en":"Medical SEO","desc_ar":"Schema.org + صفحات تخصصات تجذب بحث المرضى من جوجل.","desc_en":"Schema.org and specialty pages that attract patients from Google.","icon":"TrendingUp"},
      {"title_ar":"إعلانات PPC","title_en":"PPC Ads","desc_ar":"حملات Meta و Google Ads بأعلى عائد استثمار.","desc_en":"Meta and Google campaigns focused on return on investment.","icon":"Megaphone"},
      {"title_ar":"إدارة سوشيال ميديا","title_en":"Social Media","desc_ar":"تقويم محتوى شهري كامل + تصميم + جدولة + متابعة.","desc_en":"Monthly content calendar, design, scheduling, and follow-up.","icon":"Sparkles"},
      {"title_ar":"هوية بصرية","title_en":"Brand Identity","desc_ar":"لوجو + هوية كاملة تناسب تخصص الطبيب.","desc_en":"Logo and complete identity aligned with the medical specialty.","icon":"ShieldCheck"},
      {"title_ar":"لوحة تحكم خاصة بك","title_en":"Private Dashboard","desc_ar":"تحكم كامل بالموقع، الخدمات، الصور، والمحتوى.","desc_en":"Manage website content, services, images, and updates.","icon":"LayoutDashboard"}
    ],
    "why_title_ar":"لماذا MDink بالتحديد؟",
    "why_title_en":"Why MDink?",
    "why_intro_ar":"في سوق مزدحم بالوكالات، نقدّم تركيبة فريدة لا يقدّمها أي منافس: منتج مملوك للطبيب + خدمة تسويقية متكاملة.",
    "why_intro_en":"We combine an owned medical website with integrated marketing services, not a temporary campaign only.",
    "advantages_json":[
      {"ar":"موقع مملوك للطبيب — ليس مجرد خدمة تسويقية مؤقتة","en":"A doctor-owned website, not a temporary agency service"},
      {"ar":"لوحة تحكم سهلة تحرر محتواك بنفسك بدون مبرمج","en":"A simple dashboard to edit content without a developer"},
      {"ar":"تقارير أداء مباشرة من اللوحة بدل انتظار الوكالة","en":"Direct performance reports from the dashboard"},
      {"ar":"تصميم بصري مخصص لكل تخصص — لا قوالب عامة","en":"Specialty-based visual design, not generic templates"},
      {"ar":"ربط مباشر بواتساب وحجز فوري لتحويل الزائر لعميل","en":"WhatsApp and fast contact flows that convert visitors"}
    ],
    "talk_ar":"تحدّث معنا الآن",
    "talk_en":"Talk to us now",
    "system_label_ar":"منظومة متكاملة",
    "system_label_en":"Integrated system",
    "system_title_ar":"منصة طبية مملوكة لك بالكامل",
    "system_title_en":"A medical platform you fully own",
    "system_intro_ar":"موقع، لوحات تحكم، وتقويم محتوى — جاهزة للإطلاق.",
    "system_intro_en":"Website, dashboards, and content calendar ready to launch.",
    "system_items_json":[
      {"ar":"موقع شركة MDink الرئيسي","en":"MDink company website"},
      {"ar":"مواقع العملاء الطبية","en":"Public site for every doctor"},
      {"ar":"لوحة تحكم المحتوى","en":"Content dashboard"},
      {"ar":"لوحة إدارة العمليات","en":"Operations dashboard"},
      {"ar":"تقويم محتوى السوشيال ميديا","en":"Social content calendar"}
    ],
    "cta_title_ar":"جاهز تبني موقعك الطبي الاحترافي؟",
    "cta_title_en":"Ready to build your professional medical website?",
    "cta_text_ar":"احجز استشارة مجانية الآن وابدأ رحلتك للريادة الرقمية في تخصصك.",
    "cta_text_en":"Book a free consultation and start building your digital leadership.",
    "cta_primary_ar":"احجز استشارة مجانية",
    "cta_primary_en":"Book a free consultation",
    "cta_secondary_ar":"اعرف أكثر",
    "cta_secondary_en":"Learn more",
    "hero_bg_image":"",
    "preview_card_image":"",
    "sections_order":["hero","stats","services","why","cta"],
    "sections_hidden":[]
  }'::jsonb)
ON CONFLICT (key) DO UPDATE
SET content = EXCLUDED.content || public.cms_pages.content, updated_at = now();

-- 2) صفحة services + about + contact CMS content
-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content) VALUES
  ('services_page', '{
    "title_ar":"خدماتنا","title_en":"Our Services",
    "intro_ar":"خدمات متكاملة تغطي كل ما يحتاجه الطبيب أو العيادة لبناء حضور رقمي قوي يولّد عملاء حقيقيين.",
    "intro_en":"Integrated services covering everything a doctor or clinic needs to build a strong digital presence that generates real clients.",
    "cta_title_ar":"جاهز تبني موقعك الطبي الاحترافي؟","cta_title_en":"Ready to build your professional medical website?",
    "cta_text_ar":"احجز استشارة مجانية الآن وابدأ رحلتك للريادة الرقمية في تخصصك.","cta_text_en":"Book a free consultation and start building your digital leadership."
  }'::jsonb),
  ('contact_page', '{
    "title_ar":"تواصل معنا","title_en":"Contact Us",
    "intro_ar":"جاهزون نسمع منك ونساعدك تختار الحل المناسب لعيادتك أو مركزك الطبي.","intro_en":"We are ready to hear from you and help you choose the right solution for your clinic or medical center.",
    "form_title_ar":"احجز استشارة مجانية","form_title_en":"Book a free consultation",
    "form_subtitle_ar":"أخبرنا قليلًا عن عيادتك وسنرد عليك خلال 24 ساعة.","form_subtitle_en":"Tell us a bit about your clinic and we will reply within 24 hours."
  }'::jsonb),
  ('portfolio_page', '{
    "title_ar":"أعمالنا","title_en":"Our Work",
    "intro_ar":"دراسات حالة حقيقية لعملاء وصلنا بهم لنتائج ملموسة — من الصفحة الأولى في جوجل إلى مضاعفة الحجوزات.","intro_en":"Real case studies for clients we brought tangible results — from Google first page to doubling bookings.",
    "more_title_ar":"المزيد من أعمالنا","more_title_en":"More of our work",
    "reels_title_ar":"حملات Reels الحية","reels_title_en":"Live Reels Campaigns",
    "viral_title_ar":"حملات Viral Medical Video","viral_title_en":"Viral Medical Video Campaigns"
  }'::jsonb),
  ('blog_page', '{
    "title_ar":"المدونة الطبية","title_en":"Medical Blog",
    "intro_ar":"رؤى وأدلة عملية في التسويق الطبي، السيو، والمحتوى — مكتوبة من فريق MDink.","intro_en":"Practical insights and guides on medical marketing, SEO, and content — written by the MDink team."
  }'::jsonb)
ON CONFLICT (key) DO UPDATE
SET content = EXCLUDED.content || public.cms_pages.content, updated_at = now();

-- 3) توسيع mdink_payments بنظام التقسيط الكامل
ALTER TABLE public.mdink_payments
  ADD COLUMN IF NOT EXISTS installment_schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS installment_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'direct';

-- payment_status: تأكيد القيم المسموحة (paid, partial/installment, unpaid/pending, overdue, cancelled)
-- نسيبها text عشان المرونة، بس نضمن fallback

-- 4) توسيع mdink_clients (النوع، الحالة، الفروع كـ jsonb)
ALTER TABLE public.mdink_clients
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'doctor',
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS branches jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 5) توسيع doctor_applications (العيادة، الفروع، الخدمات المطلوبة، لوجو)
ALTER TABLE public.doctor_applications
  ADD COLUMN IF NOT EXISTS clinic_name text,
  ADD COLUMN IF NOT EXISTS clinic_address text,
  ADD COLUMN IF NOT EXISTS branches jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requested_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS clinic_logo_url text,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- 6) توسيع cms_services بحقول alt + image_url موجود
ALTER TABLE public.cms_services
  ADD COLUMN IF NOT EXISTS alt_ar text,
  ADD COLUMN IF NOT EXISTS alt_en text;

-- 7) توسيع portfolio_items: metrics كـ jsonb منظم + alt + is_featured + image_url
ALTER TABLE public.portfolio_items
  ADD COLUMN IF NOT EXISTS metrics_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS alt_ar text,
  ADD COLUMN IF NOT EXISTS alt_en text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- نقل visit_growth والـ metrics القديمة للـ JSON الجديد لو موجودة
UPDATE public.portfolio_items
SET metrics_json = CASE
  WHEN visit_growth IS NOT NULL AND visit_growth <> '' THEN
    jsonb_build_array(jsonb_build_object('label_ar','نمو الزيارات','label_en','Visit growth','value',visit_growth,'icon','TrendingUp'))
  ELSE '[]'::jsonb
END
WHERE (metrics_json = '[]'::jsonb OR metrics_json IS NULL);

-- نقل url القديم لـ website_url
UPDATE public.portfolio_items SET website_url = url WHERE website_url IS NULL AND url IS NOT NULL;

-- 8) توسيع reel_campaigns: alt + likes/comments/views موجودين؟ نتأكد
ALTER TABLE public.reel_campaigns
  ADD COLUMN IF NOT EXISTS views int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comments int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'Instagram',
  ADD COLUMN IF NOT EXISTS alt_ar text,
  ADD COLUMN IF NOT EXISTS alt_en text;

-- 9) توسيع blogs بحقول SEO + featured + sort
ALTER TABLE public.blogs
  ADD COLUMN IF NOT EXISTS meta_title_ar text,
  ADD COLUMN IF NOT EXISTS meta_title_en text,
  ADD COLUMN IF NOT EXISTS meta_description_ar text,
  ADD COLUMN IF NOT EXISTS meta_description_en text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alt_ar text,
  ADD COLUMN IF NOT EXISTS alt_en text;

-- 10) توسيع team_members بـ alt
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS alt_ar text,
  ADD COLUMN IF NOT EXISTS alt_en text;

-- 11) جدول seo_settings منفصل (per-page SEO)
CREATE TABLE IF NOT EXISTS public.seo_settings (
  page_key text PRIMARY KEY,
  meta_title_ar text,
  meta_title_en text,
  meta_description_ar text,
  meta_description_en text,
  og_image_url text,
  canonical_url text,
  robots text NOT NULL DEFAULT 'index,follow',
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- [uniq-guard] public.seo_settings (page_key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='seo_settings' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['page_key']) x)
  ) THEN
    BEGIN ALTER TABLE public.seo_settings ADD CONSTRAINT seo_settings_page_key_uq UNIQUE (page_key);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.seo_settings TO anon, authenticated;
GRANT ALL ON public.seo_settings TO authenticated, service_role;
DROP POLICY IF EXISTS "Public read seo settings" ON public.seo_settings;
DROP POLICY IF EXISTS "Public read seo settings" ON public.seo_settings;
CREATE POLICY "Public read seo settings" ON public.seo_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage seo settings" ON public.seo_settings;
DROP POLICY IF EXISTS "Admins manage seo settings" ON public.seo_settings;
CREATE POLICY "Admins manage seo settings" ON public.seo_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- [auto-guard]
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS page_key text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_title_ar text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_title_en text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_description_ar text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_description_en text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS robots text NOT NULL DEFAULT 'index,follow';

INSERT INTO public.seo_settings (page_key, meta_title_ar, meta_title_en, meta_description_ar, meta_description_en, robots) VALUES
  ('home','MDink — موقعك الطبي الاحترافي + تسويق متكامل','MDink — Your Professional Medical Website + Marketing','MDink تمنح كل طبيب موقعًا احترافيًا مملوكًا له بالكامل مع إدارة شاملة للسوشيال ميديا والسيو والإعلانات.','MDink gives every doctor a fully owned professional website with complete social media, SEO, and ads management.','index,follow'),
  ('services','خدماتنا — MDink','Services — MDink','خدمات التسويق الطبي المتكاملة من MDink.','Integrated medical marketing services by MDink.','index,follow'),
  ('portfolio','أعمالنا — MDink','Portfolio — MDink','دراسات حالة حقيقية لعملاء MDink.','Real MDink client case studies.','index,follow'),
  ('blog','المدونة — MDink','Blog — MDink','مقالات التسويق الطبي من فريق MDink.','Medical marketing articles by the MDink team.','index,follow'),
  ('about','من نحن — MDink','About — MDink','تعرف على شركة MDink للتسويق الطبي.','Learn about MDink medical marketing company.','index,follow'),
  ('contact','تواصل معنا — MDink','Contact — MDink','تواصل مع فريق MDink واحجز استشارتك المجانية.','Contact the MDink team and book your free consultation.','index,follow')
ON CONFLICT (page_key) DO NOTHING;

-- 12) جدول audit_logs (تتبع التعديلات الحساسة)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR public.is_admin(auth.uid()));

-- 13) Storage bucket للملفات والصور (لو مش موجود)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mdink-media', 'mdink-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: قراءة عامة، رفع للأدمن فقط
DROP POLICY IF EXISTS "Public read mdink media" ON storage.objects;
DROP POLICY IF EXISTS "Public read mdink media" ON storage.objects;
CREATE POLICY "Public read mdink media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'mdink-media');
DROP POLICY IF EXISTS "Admins upload mdink media" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload mdink media" ON storage.objects;
CREATE POLICY "Admins upload mdink media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mdink-media' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update mdink media" ON storage.objects;
DROP POLICY IF EXISTS "Admins update mdink media" ON storage.objects;
CREATE POLICY "Admins update mdink media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mdink-media' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete mdink media" ON storage.objects;
DROP POLICY IF EXISTS "Admins delete mdink media" ON storage.objects;
CREATE POLICY "Admins delete mdink media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'mdink-media' AND public.is_admin(auth.uid()));

-- 14) Free consultations sheet (منفصل عن العملاء — لحساب conversion rate)
CREATE TABLE IF NOT EXISTS public.free_consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text,
  phone text,
  specialty text,
  preferred_service text,
  message text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','converted','lost')),
  contact_method text,
  assigned_to uuid,
  converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.free_consultations ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.free_consultations TO anon, authenticated;
GRANT ALL ON public.free_consultations TO authenticated, service_role;
DROP POLICY IF EXISTS "Public create consultations" ON public.free_consultations;
DROP POLICY IF EXISTS "Public create consultations" ON public.free_consultations;
CREATE POLICY "Public create consultations" ON public.free_consultations FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage consultations" ON public.free_consultations;
DROP POLICY IF EXISTS "Admins manage consultations" ON public.free_consultations;
CREATE POLICY "Admins manage consultations" ON public.free_consultations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 15) updated_at triggers للجداول الجديدة
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_seo_touch ON public.seo_settings;
CREATE TRIGGER trg_seo_touch BEFORE UPDATE ON public.seo_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_consult_touch ON public.free_consultations;
CREATE TRIGGER trg_consult_touch BEFORE UPDATE ON public.free_consultations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- ===================== 20260628100000_phase10_role_dashboards.sql =====================

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
DROP POLICY IF EXISTS "Members read own profile" ON public.team_profiles;
CREATE POLICY "Members read own profile" ON public.team_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Members upsert own profile" ON public.team_profiles;
DROP POLICY IF EXISTS "Members upsert own profile" ON public.team_profiles;
CREATE POLICY "Members upsert own profile" ON public.team_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Members update own profile" ON public.team_profiles;
DROP POLICY IF EXISTS "Members update own profile" ON public.team_profiles;
CREATE POLICY "Members update own profile" ON public.team_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete profiles" ON public.team_profiles;
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
DO $$ BEGIN
  ALTER TABLE public.team_work_logs ADD CONSTRAINT team_work_logs_status_check
  CHECK (status IN ('not_started','pending','in_progress','waiting_review','revision_required','approved','delivered','completed','cancelled','done','blocked'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

-- 3) RLS على team_work_logs: العضو يشوف شغله بس، الأدمن يشوف الكل
ALTER TABLE public.team_work_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.team_work_logs TO authenticated, service_role;

DROP POLICY IF EXISTS "Members read own logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Members read own logs" ON public.team_work_logs;
CREATE POLICY "Members read own logs" ON public.team_work_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Members insert own logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Members insert own logs" ON public.team_work_logs;
CREATE POLICY "Members insert own logs" ON public.team_work_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Members update own logs" ON public.team_work_logs;
DROP POLICY IF EXISTS "Members update own logs" ON public.team_work_logs;
CREATE POLICY "Members update own logs" ON public.team_work_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins delete logs" ON public.team_work_logs;
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
DROP POLICY IF EXISTS "Read task revisions" ON public.task_revisions;
CREATE POLICY "Read task revisions" ON public.task_revisions FOR SELECT TO authenticated
  USING (author_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_operations_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.team_work_logs t WHERE t.id = task_id AND t.user_id = auth.uid()));
DROP POLICY IF EXISTS "Insert task revisions" ON public.task_revisions;
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


-- ===================== 20260629090000_homepage_refresh.sql =====================

-- ============================================================
-- MDink — Homepage refresh (brand colors already in code,
-- copy/social/stat updates pushed to the DB so they take effect
-- even on databases seeded by earlier migrations)
-- ============================================================

-- 1) Social links: remove Twitter/X, fix Instagram
UPDATE public.site_config SET value = '' WHERE key = 'twitter_url';
UPDATE public.site_config SET value = 'https://www.instagram.com/shaima2_fahmy' WHERE key = 'instagram_url';

-- 2) Homepage content (cms_pages.key = 'home') — overwrite only the
-- keys that changed; jsonb || keeps any other admin-edited keys intact,
-- and the LEFT-hand side (new values) wins for overlapping keys here.
UPDATE public.cms_pages
SET content = content || '{
  "hero_title_ar":"لأن الطبيب اليوم لا يحتاج ظهورًا رقميًا فقط؛ بل منصة منظمة تعرض خبرته، خدماته، ومواعيده، وتُقدّمه للمرضى بالصورة التي يستحقها.",
  "hero_title_en":"Because today''s doctor needs more than a digital presence; a structured platform that showcases their expertise, services, and schedule — presenting them to patients the way they deserve.",
  "hero_subtitle_ar":"MDink Solutions تبني مواقع طبية مملوكة للأطباء والعيادات والمراكز الطبية، تدير السوشيال ميديا، تطلق الحملات، وتؤهّلكم بمحتوى طبي ينافس في جوجل.",
  "hero_subtitle_en":"MDink Solutions builds owned medical websites for doctors, clinics, and medical centers, manages social media, launches campaigns, and equips you with medical content that can compete on Google.",
  "preview_doctor_ar":"عيادتي",
  "preview_doctor_en":"Eyadaty",
  "preview_specialty_ar":"All Women Health Services In One Place — Eyadaty",
  "preview_specialty_en":"All Women Health Services In One Place — Eyadaty",
  "preview_url":"3eyadaty-eg.com",
  "preview_link":"https://3eyadaty-eg.com/",
  "dashboard_card_json":[
    {"label_ar":"زائر شهريًا","label_en":"Monthly visitors","value":"18,500","icon":"Users"},
    {"label_ar":"حجز شهريًا","label_en":"Monthly bookings","value":"420","icon":"CalendarCheck"},
    {"label_ar":"نمو التفاعل","label_en":"Engagement growth","value":"+38%","icon":"TrendingUp"},
    {"label_ar":"حملات نشطة","label_en":"Active campaigns","value":"6","icon":"Megaphone"}
  ],
  "why_intro_ar":"في سوق مزدحم بالوكالات، نقدّم تركيبة فريدة لا يقدّمها أي منافس: منصة مملوكة لك بالكامل + خدمة تسويقية متكاملة — لكل طبيب، عيادة، أو مركز طبي.",
  "why_intro_en":"We combine a fully-owned digital platform with integrated marketing services for doctors, clinics, and medical centers — not a temporary campaign only.",
  "advantages_json":[
    {"ar":"منصة مملوكة لك بالكامل — طبيبًا كنت أو عيادة أو مركزًا طبيًا — لا مجرد خدمة تسويقية مؤقتة","en":"A platform fully owned by you — doctor, clinic, or medical center — not a temporary agency service"},
    {"ar":"لوحة تحكم سهلة تحرر محتواك بنفسك بدون مبرمج","en":"A simple dashboard to edit content without a developer"},
    {"ar":"تقارير أداء مباشرة من اللوحة بدل انتظار الوكالة","en":"Direct performance reports from the dashboard"},
    {"ar":"تصميم بصري مخصص لكل تخصص — لا قوالب عامة","en":"Specialty-based visual design, not generic templates"},
    {"ar":"ربط مباشر بواتساب وحجز فوري لتحويل الزائر لعميل","en":"WhatsApp and fast contact flows that convert visitors"}
  ],
  "system_title_ar":"منظومة رقمية متكاملة للقطاع الطبي",
  "system_title_en":"An Integrated Digital Ecosystem for Healthcare",
  "system_intro_ar":"موقع احترافي، لوحات تحكم، إدارة محتوى، وتقويم تسويقي — جاهزة للإطلاق والنمو.",
  "system_intro_en":"A professional website, dashboards, content management, and a marketing calendar — ready to launch and grow.",
  "system_items_json":[
    {"ar":"موقع MDink الرئيسي لإدارة حضورك الرقمي","en":"MDink''s main website to manage your digital presence"},
    {"ar":"مواقع مخصصة للأطباء والعيادات والمراكز الطبية","en":"Dedicated websites for doctors, clinics, and medical centers"},
    {"ar":"لوحة تحكم سهلة لتعديل الخدمات والمحتوى","en":"An easy dashboard to edit services and content"},
    {"ar":"لوحة إدارة للمتابعة والتقارير والطلبات","en":"A management dashboard for tracking, reports, and requests"},
    {"ar":"تقويم محتوى منظم للسوشيال ميديا","en":"An organized social media content calendar"}
  ]
}'::jsonb
WHERE key = 'home';

-- In case no 'home' row exists yet on a fresh database, make sure one is present
-- (the earlier seed migrations already insert a full default row, so this is a safety net only).
-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content)
SELECT 'home', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'home');


-- ===================== 20260629100000_services_page_refresh.sql =====================

-- ============================================================
-- MDink — Services page refresh
-- Full 12-service catalog + expanded page copy/CTA
-- ============================================================

-- 1) Update the services_page CMS content (heading, intro, CTA)
UPDATE public.cms_pages
SET content = content || '{
  "title_ar":"خدمات رقمية متكاملة للقطاع الطبي",
  "title_en":"Integrated Digital Services for Healthcare",
  "intro_ar":"من بناء الموقع والهوية إلى التصوير داخل العيادة وإدارة الحملات — MDink تساعد الأطباء والعيادات والمراكز الطبية والمستشفيات على الظهور بثقة وجذب مرضى حقيقيين.",
  "intro_en":"From building the website and identity to in-clinic photography and campaign management — MDink helps doctors, clinics, medical centers, and hospitals appear with confidence and attract real patients.",
  "cta_title_ar":"جاهز تبني حضور طبي يليق بثقة مرضاك؟",
  "cta_title_en":"Ready to build a medical presence worthy of your patients'' trust?",
  "cta_text_ar":"سواء كنت طبيبًا مستقلًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — نساعدك في بناء منظومة رقمية واضحة، موثوقة، وقابلة للنمو.",
  "cta_text_en":"Whether you are an independent doctor, a clinic, a medical center, a polyclinic, or a hospital — we help you build a clear, trustworthy, and scalable digital system.",
  "cta_primary_ar":"احجز استشارة مجانية",
  "cta_primary_en":"Book a free consultation",
  "cta_secondary_ar":"شاهد أعمالنا",
  "cta_secondary_en":"View our work"
}'::jsonb
WHERE key = 'services_page';

-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content)
SELECT 'services_page', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'services_page');

-- 2) Reseed the full 12-service catalog.
-- Replace the original 5 starter services with the complete list so the
-- public page and the admin "Services" section both show all twelve.
-- (Only deletes the known seeded starter rows; any service the admin added
--  manually with a different title is preserved.)
DELETE FROM public.cms_services
WHERE title_ar IN (
  'تصميم وتطوير مواقع طبية','إدارة السوشيال ميديا','SEO طبي','حملات إعلانية','تصوير طبي و Reels'
);

-- [auto-guard]
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS description_ar text NOT NULL DEFAULT '';
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS checkmarks_ar text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS checkmarks_en text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.cms_services ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
INSERT INTO public.cms_services
  (title_ar, title_en, description_ar, description_en, checkmarks_ar, checkmarks_en, icon, sort_order, is_published)
VALUES
  ('تصميم وتطوير مواقع طبية','Medical Website Design & Development',
   'مواقع احترافية مملوكة لك، مناسبة للأطباء والعيادات والمراكز والمستشفيات، سريعة، متجاوبة، ومهيأة للحجز والظهور في جوجل.',
   'Professional, owned websites for doctors, clinics, centers, and hospitals — fast, responsive, and built for booking and Google visibility.',
   ARRAY['تصميم مخصص','متجاوب مع الموبايل','مهيأ لمحركات البحث'],
   ARRAY['Custom design','Mobile responsive','SEO ready'],'Globe',10,true),

  ('لوحات تحكم وأنظمة إدارة','Dashboards & Management Systems',
   'لوحات سهلة لإدارة الأطباء، الخدمات، المقالات، الحجوزات، الاستفسارات، ومحتوى الموقع بدون تعقيد.',
   'Easy dashboards to manage doctors, services, articles, bookings, inquiries, and site content without complexity.',
   ARRAY['إدارة الأطباء والخدمات','متابعة الطلبات','تعديل المحتوى بسهولة'],
   ARRAY['Manage doctors & services','Track requests','Easy content editing'],'LayoutDashboard',20,true),

  ('SEO طبي ومحتوى بحث','Medical SEO & Search Content',
   'صفحات خدمات ومقالات طبية منظمة تساعد المرضى يفهموا خدمتك وتساعد موقعك يظهر في نتائج البحث.',
   'Organized service pages and medical articles that help patients understand your work and help your site rank.',
   ARRAY['كلمات مفتاحية طبية','Schema.org','صفحات خدمات متخصصة'],
   ARRAY['Medical keywords','Schema.org','Specialty service pages'],'TrendingUp',30,true),

  ('إدارة السوشيال ميديا','Social Media Management',
   'تقويم محتوى شهري، تصميمات احترافية، كتابة كابشنات، أفكار ريلز، ومتابعة الأداء بشكل مستمر.',
   'Monthly content calendar, professional designs, caption writing, reel ideas, and ongoing performance tracking.',
   ARRAY['تقويم شهري','تصميمات احترافية','متابعة الأداء'],
   ARRAY['Monthly calendar','Professional designs','Performance tracking'],'Sparkles',40,true),

  ('تصوير طبي داخل العيادة','In-Clinic Medical Photography',
   'جلسات تصوير حقيقية داخل العيادة أو المركز لإظهار المكان، الأطباء، الأجهزة، طريقة العمل، وفريق العمل بشكل مهني موثوق.',
   'Real photo sessions inside the clinic or center showing the space, doctors, equipment, workflow, and team — professionally and credibly.',
   ARRAY['تصوير الطبيب والفريق','تصوير المكان والأجهزة','محتوى حقيقي للثقة'],
   ARRAY['Doctor & team shots','Space & equipment shots','Real content for trust'],'Camera',50,true),

  ('فيديوهات وريلز طبية','Medical Videos & Reels',
   'تصوير ومونتاج فيديوهات قصيرة للأطباء، شرح الخدمات، لقطات من داخل العيادة، وتجهيز محتوى مناسب للسوشيال والإعلانات.',
   'Filming and editing short videos for doctors, service explainers, in-clinic footage, and content ready for social and ads.',
   ARRAY['ريلز طبية','فيديوهات شرح الخدمات','مونتاج احترافي'],
   ARRAY['Medical reels','Service explainer videos','Professional editing'],'Video',60,true),

  ('تصميم جرافيك طبي','Medical Graphic Design',
   'تصميم بوستات، إعلانات، كفرات، قوالب محتوى، عروض خدمات، وهوية بصرية متناسقة مع تخصصك الطبي.',
   'Posts, ads, covers, content templates, service offers, and visuals consistent with your medical specialty.',
   ARRAY['بوستات وإعلانات','قوالب محتوى','تصميمات للحملات'],
   ARRAY['Posts & ads','Content templates','Campaign designs'],'Palette',70,true),

  ('حملات إعلانية طبية','Medical Ad Campaigns',
   'إدارة حملات Meta و Google بأهداف واضحة: استفسارات، حجوزات، زيارات موقع، أو زيادة الوعي بالمركز.',
   'Managing Meta and Google campaigns with clear goals: inquiries, bookings, site visits, or awareness.',
   ARRAY['Meta Ads','Google Ads','تقارير أداء'],
   ARRAY['Meta Ads','Google Ads','Performance reports'],'Megaphone',80,true),

  ('هوية بصرية طبية','Medical Brand Identity',
   'بناء شكل بصري محترف للطبيب أو العيادة أو المركز: ألوان، خطوط، قوالب، أسلوب صور، وطريقة ظهور موحدة.',
   'Building a professional visual identity for the doctor, clinic, or center: colors, fonts, templates, photo style, and a unified look.',
   ARRAY['شعار وهوية','ألوان وخطوط','قوالب استخدام'],
   ARRAY['Logo & identity','Colors & fonts','Usage templates'],'ShieldCheck',90,true),

  ('ربط واتساب ونماذج حجز','WhatsApp & Booking Forms',
   'تحويل الزائر من مجرد مشاهدة إلى تواصل وحجز من خلال أزرار واضحة، نماذج سهلة، وربط مباشر بواتساب.',
   'Turning visitors into contacts and bookings through clear buttons, simple forms, and direct WhatsApp integration.',
   ARRAY['نماذج حجز','ربط واتساب','تتبع الاستفسارات'],
   ARRAY['Booking forms','WhatsApp integration','Inquiry tracking'],'MessageCircle',100,true),

  ('تقارير وتحليل الأداء','Reporting & Performance Analysis',
   'متابعة الزيارات، مصادر العملاء، أداء الإعلانات، أكثر الخدمات طلبًا، وتقديم توصيات تطوير شهرية.',
   'Tracking visits, client sources, ad performance, most-requested services, and providing monthly improvement recommendations.',
   ARRAY['تقارير شهرية','تحليل مصادر العملاء','توصيات تحسين'],
   ARRAY['Monthly reports','Client source analysis','Improvement recommendations'],'BarChart3',110,true),

  ('دعم وتطوير مستمر','Ongoing Support & Development',
   'متابعة الموقع، تحديث المحتوى، تحسين الأداء، إضافة خدمات جديدة، وتطوير مستمر حسب نمو العيادة أو المركز.',
   'Site monitoring, content updates, performance improvements, adding new services, and continuous development as your clinic grows.',
   ARRAY['دعم فني','تحديثات دورية','تطوير مستمر'],
   ARRAY['Technical support','Regular updates','Continuous development'],'LifeBuoy',120,true);


-- ===================== 20260629110000_portfolio_reviews.sql =====================

-- ============================================================
-- MDink — Portfolio rebuild
-- Extend portfolio_items for bilingual + categorized case studies,
-- seed the real MDink work, and add client_testimonials table.
-- ============================================================

-- 1) Extend portfolio_items with bilingual / category / tags columns
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS description_ar text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS description_en text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS tags_ar text[] DEFAULT '{}';
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS tags_en text[] DEFAULT '{}';
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS proof_label_ar text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS proof_label_en text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS thumbnail_url text;
-- category: medical_websites | social_media | medical_photography | seo_results | monthly_work
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.portfolio_items ALTER COLUMN category DROP DEFAULT;

-- make slug optional going forward (auto from title); keep existing unique
ALTER TABLE public.portfolio_items ALTER COLUMN slug DROP NOT NULL;

-- 2) Clear any starter portfolio rows and seed the real MDink portfolio
DELETE FROM public.portfolio_items WHERE client_name IN (
  'Allam Heart Care','Hawa Clinic','Eyadaty','Seniors Clinic',
  'Dr. Aziza El Gabbas','Dr. Manal El Afifi','MDink Medical Content',
  'MDink for Digital Solutions','SEO Medical Content'
);

-- [auto-guard]
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS website_url text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
INSERT INTO public.portfolio_items
  (slug, title_ar, title_en, client_name, category, description_ar, description_en,
   tags_ar, tags_en, website_url, thumbnail_url, proof_label_ar, proof_label_en,
   is_featured, is_published, sort_order, title, description)
VALUES
  ('allam-heart-care','علام هارت كير','Allam Heart Care','Allam Heart Care','medical_websites',
   'موقع طبي متخصص يعرض خدمات القلب بشكل احترافي ويساعد المرضى على الوصول للمعلومات والحجز بسهولة.',
   'A specialized medical website presenting heart care services professionally and helping patients access information and book easily.',
   ARRAY['موقع طبي','تصميم طبي','حجز واستفسارات'], ARRAY['Medical Website','Medical Design','Booking & Inquiries'],
   'https://allamheartcare.com/', NULL, 'موقع','Website', true, true, 10, 'Allam Heart Care',''),

  ('hawa-clinic','هو كلينك','Hawa Clinic','Hawa Clinic','medical_websites',
   'موقع طبي موجه لخدمات العيادة، مصمم لعرض التخصصات وبناء الثقة مع الزائرات.',
   'A clinic website designed to present services clearly and build trust with patients.',
   ARRAY['عيادة طبية','موقع متجاوب','ظهور بحثي'], ARRAY['Medical Clinic','Responsive Website','Search Visibility'],
   'https://howaclinic.com/', NULL, 'موقع','Website', true, true, 20, 'Hawa Clinic',''),

  ('eyadaty','عيادتي','Eyadaty','Eyadaty','medical_websites',
   'منصة طبية لخدمات صحة المرأة تجمع المعلومات والخدمات في تجربة رقمية واضحة ومطمئنة.',
   'A women''s health platform that brings services and information together in a clear, reassuring digital experience.',
   ARRAY['صحة المرأة','منصة طبية','تجربة مستخدم'], ARRAY['Women''s Health','Medical Platform','User Experience'],
   'https://3eyadaty-eg.com/', NULL, 'موقع','Website', true, true, 30, 'Eyadaty',''),

  ('seniors-clinic','سينيورز كلينك','Seniors Clinic','Seniors Clinic','medical_websites',
   'موقع طبي مخصص لخدمات كبار السن، يوضح الخدمات ويجعل التواصل والحجز أكثر سهولة.',
   'A medical website for senior care services, presenting services clearly and making contact and booking easier.',
   ARRAY['رعاية كبار السن','موقع طبي','سهولة التواصل'], ARRAY['Senior Care','Medical Website','Easy Contact'],
   'https://seniors-clinic.com/', NULL, 'موقع','Website', true, true, 40, 'Seniors Clinic',''),

  ('dr-aziza-elgabbas','صفحة د. عزيزة الجباس','Dr. Aziza El Gabbas Page','Dr. Aziza El Gabbas','social_media',
   'إدارة حضور اجتماعي طبي يساعد على تقديم الطبيب وخدماته بشكل واضح ومهني للجمهور.',
   'Medical social media presence management that presents the doctor and services clearly and professionally.',
   ARRAY['فيسبوك','محتوى طبي','إدارة سوشيال'], ARRAY['Facebook','Medical Content','Social Management'],
   'https://www.facebook.com/DR.AzizaElGabbas', NULL, 'سوشيال ميديا','Social Media', false, true, 50, 'Dr. Aziza El Gabbas',''),

  ('dr-manal-elafifi','صفحة د. منال العفيفي','Dr. Manal El Afifi Page','Dr. Manal El Afifi','social_media',
   'صفحة طبية تساعد على بناء الظهور الرقمي للطبيب من خلال محتوى منظم وتصميمات مناسبة.',
   'A medical page that supports the doctor''s digital presence through organized content and suitable visuals.',
   ARRAY['فيسبوك','تصميمات طبية','محتوى منظم'], ARRAY['Facebook','Medical Graphics','Organized Content'],
   'https://www.facebook.com/profile.php?id=100065293160185', NULL, 'سوشيال ميديا','Social Media', false, true, 60, 'Dr. Manal El Afifi',''),

  ('in-clinic-shoot','جلسة تصوير طبية داخل العيادة','In-Clinic Medical Shoot','MDink Medical Content','medical_photography',
   'توثيق حقيقي من داخل العيادة لإظهار الطبيب، المكان، الأجهزة، وطريقة العمل بصورة مهنية تعزز ثقة المريض.',
   'Real in-clinic content showing the doctor, place, equipment, and workflow professionally to build patient trust.',
   ARRAY['تصوير طبي','ريلز','محتوى حقيقي'], ARRAY['Medical Shoot','Reels','Real Content'],
   'https://www.facebook.com/share/r/1Pkar3PL4o/', NULL, 'تصوير طبي','Medical Shoot', false, true, 70, 'In-Clinic Medical Shoot',''),

  ('medical-video-content','محتوى فيديو طبي','Medical Video Content','MDink Medical Content','medical_photography',
   'فيديو قصير مناسب للسوشيال والإعلانات، يعرض الخدمة الطبية بشكل واقعي ومطمئن.',
   'A short-form video suitable for social media and ads, presenting the medical service in a realistic and reassuring way.',
   ARRAY['إنستجرام','فيديو طبي','محتوى إعلاني'], ARRAY['Instagram','Medical Video','Ad Content'],
   'https://www.instagram.com/reel/DNyFBP1WNB9/?igsh=OWFqeGl2aW94MTdq', NULL, 'تصوير طبي','Medical Shoot', false, true, 80, 'Medical Video Content',''),

  ('monthly-work-may-2023','جزء من أعمالنا — مايو 2023','Part of Our Work — May 2023','MDink for Digital Solutions','monthly_work',
   'نموذج من الأعمال الشهرية التي توضح تنوع خدمات MDink في التصميم، المحتوى، والسوشيال ميديا.',
   'A monthly work highlight showing MDink''s range of services across design, content, and social media.',
   ARRAY['أعمال شهرية','محتوى طبي','تصميمات'], ARRAY['Monthly Work','Medical Content','Designs'],
   'https://www.facebook.com/share/p/1ErVrDaL2p/', NULL, 'أعمال شهرية','Monthly Work', false, true, 90, 'Part of Our Work — May 2023',''),

  ('seo-first-page','ظهور مقال طبي في الصفحة الأولى','Medical Article on the First Search Page','SEO Medical Content','seo_results',
   'دليل ظهور محتوى طبي ضمن نتائج البحث الأولى في جوجل، مما يعزز الثقة ويساعد على جذب زيارات مؤهلة من المرضى.',
   'Documented proof of medical content appearing among top Google search results, helping build trust and attract qualified patient traffic.',
   ARRAY['ظهور في جوجل','SEO طبي','محتوى طبي','نتائج بحث'], ARRAY['Google Visibility','Medical SEO','Medical Content','Search Results'],
   NULL, '/portfolio/seo-proof-howaclinic.png', 'إثبات SEO','SEO Proof', false, true, 100, 'Medical Article on the First Search Page','');

-- 3) Client testimonials table (MDink's own clients — doctors/clinics)
CREATE TABLE IF NOT EXISTS public.client_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  role_ar text,
  role_en text,
  quote_ar text NOT NULL,
  quote_en text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  avatar_url text,
  is_published boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_testimonials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.client_testimonials TO anon, authenticated;
GRANT ALL ON public.client_testimonials TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read published client testimonials" ON public.client_testimonials;
DROP POLICY IF EXISTS "Public read published client testimonials" ON public.client_testimonials;
CREATE POLICY "Public read published client testimonials" ON public.client_testimonials
  FOR SELECT TO anon, authenticated
  USING (is_published OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage client testimonials" ON public.client_testimonials;
DROP POLICY IF EXISTS "Admins manage client testimonials" ON public.client_testimonials;
CREATE POLICY "Admins manage client testimonials" ON public.client_testimonials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Seed a few starter client reviews (editable from dashboard later)
-- [auto-guard]
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS role_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS role_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS quote_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS quote_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
INSERT INTO public.client_testimonials
  (name_ar, name_en, role_ar, role_en, quote_ar, quote_en, rating, sort_order, is_featured)
VALUES
  ('د. علام','Dr. Allam','استشاري قلب','Cardiology Consultant',
   'فريق MDink بنى لي موقعًا احترافيًا سهّل على مرضاي الوصول لي والحجز بسرعة. النتائج كانت واضحة من أول شهر.',
   'The MDink team built me a professional website that made it easy for my patients to reach me and book quickly. The results were clear from the first month.',
   5, 10, true),
  ('عيادة هو','Hawa Clinic','عيادة نسائية','Women''s Clinic',
   'تنظيم المحتوى والظهور في نتائج البحث فرق كتير معانا. تعامل مهني والتزام بالمواعيد.',
   'Organizing our content and appearing in search results made a real difference. Professional and committed to deadlines.',
   5, 20, true),
  ('عيادتي','Eyadaty','منصة صحة المرأة','Women''s Health Platform',
   'منصة واضحة ومطمئنة لزائراتنا، وفريق متعاون يفهم طبيعة القطاع الطبي.',
   'A clear and reassuring platform for our visitors, with a cooperative team that understands the medical sector.',
   5, 30, false);


-- ===================== 20260629120000_testimonials_full.sql =====================

-- ============================================================
-- MDink — Client Reviews / Testimonials (full build)
-- Extend client_testimonials to the rich schema, add a public
-- submission table, and seed the real video + written reviews.
-- ============================================================

-- 1) Extend client_testimonials with the full management schema
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS title_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS title_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS excerpt_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS excerpt_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS full_text_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS full_text_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'text'; -- video | image | text
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS profile_url text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS platform_type text; -- facebook | instagram | linkedin | other
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

-- map legacy "name"/"quote" usage: keep name_ar/name_en, role_ar/role_en, rating already exist

-- 2) Public submissions table ("Leave Your Review")
CREATE TABLE IF NOT EXISTS public.testimonial_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  profile_url text NOT NULL,
  review_type text NOT NULL DEFAULT 'text', -- text | image | video
  review_text text,
  media_url text,
  job_title text,
  platform_type text, -- facebook | instagram | linkedin | other
  consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonial_submissions ENABLE ROW LEVEL SECURITY;
GRANT INSERT ON public.testimonial_submissions TO anon, authenticated;
GRANT ALL ON public.testimonial_submissions TO authenticated, service_role;

-- Anyone may submit (insert) a review with consent; only admins can read/manage
DROP POLICY IF EXISTS "Anyone can submit a review" ON public.testimonial_submissions;
DROP POLICY IF EXISTS "Anyone can submit a review" ON public.testimonial_submissions;
CREATE POLICY "Anyone can submit a review" ON public.testimonial_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (consent = true);

DROP POLICY IF EXISTS "Admins read submissions" ON public.testimonial_submissions;
DROP POLICY IF EXISTS "Admins read submissions" ON public.testimonial_submissions;
CREATE POLICY "Admins read submissions" ON public.testimonial_submissions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage submissions" ON public.testimonial_submissions;
DROP POLICY IF EXISTS "Admins manage submissions" ON public.testimonial_submissions;
CREATE POLICY "Admins manage submissions" ON public.testimonial_submissions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3) Seed the real testimonials (replace the placeholder seed rows)
DELETE FROM public.client_testimonials
WHERE name_ar IN ('د. علام','عيادة هو','عيادتي','د. عزيزة','أميرة منقوش','Mero Abdallah','د. أميرة المنقوش','Dr. Ragab Allam');

-- [auto-guard]
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS name_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS role_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS role_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS quote_ar text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS quote_en text;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5);
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;
ALTER TABLE public.client_testimonials ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
INSERT INTO public.client_testimonials
  (name_ar, name_en, role_ar, role_en, title_ar, title_en, excerpt_ar, excerpt_en,
   full_text_ar, full_text_en, quote_ar, quote_en, rating, media_type, media_url, thumbnail_url,
   profile_url, platform_type, is_verified, is_featured, show_on_home, is_published, sort_order)
VALUES
  -- Video 1: Dr. Aziza
  ('د. عزيزة','Dr. Aziza','عميلة MDink','MDink Client',
   'رأي د. عزيزة','Dr. Aziza''s Review',
   'شهادة فيديو حقيقية توضح تجربة العميل مع MDink من ناحية الجودة والمتابعة والنتائج.',
   'A real video testimonial highlighting the client''s experience with MDink in terms of quality, follow-up, and results.',
   NULL, NULL, NULL, NULL, 5, 'video', '/testimonials/aziza-review.mp4', NULL,
   NULL, NULL, true, true, true, true, 10),

  -- Video 2: Amira Manqoush
  ('أميرة منقوش','Amira Manqoush','عميلة MDink','MDink Client',
   'رأي أميرة منقوش','Amira Manqoush Review',
   'شهادة فيديو حقيقية عن تجربة العمل مع MDink ودور الفريق في التطوير المهني والظهور الرقمي.',
   'A real video testimonial about working with MDink and the team''s role in professional growth and digital presence.',
   NULL, NULL, NULL, NULL, 5, 'video', '/testimonials/amira-manqoush-review.mp4', NULL,
   NULL, NULL, true, true, true, true, 20),

  -- Written 1: Dr. Amira Al Mangoush
  ('د. أميرة المنقوش','Dr. Amira Al Mangoush','عميلة من ليبيا','Client from Libya',
   'رأي د. أميرة المنقوش','Dr. Amira Al Mangoush Review',
   'تشير هذه الشهادة إلى فهم MDink الجيد للتسويق الطبي، حسن المتابعة، وجودة المحتوى والمقترحات.',
   'This testimonial highlights MDink''s strong understanding of medical marketing, attentive follow-up, and quality content and suggestions.',
   'معكم د اميرة المنقوش من ليبيا، حابه اشكر شركة MDink و د شيماء فهمي علي وقوفها معي في مشواري المهني، حيث أن السوشيال ميديا أصبحت من الركائز الاساسية لبداية اي عمل ناجح، شركة لسرعة الاستجابة، اهتمامكم بأدق التفاصيل، جودة المناشير، سلاسة المعلومات الطبية، المقترحات، حيث وصلت إلي عدد متابعين 3K في وقت قصير.... بجد شكرا',
   'A real review from Libya thanking MDink and Dr. Shaima Fahmy for their support in the professional journey — fast response, attention to detail, quality of posts, smooth medical information, and great suggestions, reaching 3K followers in a short time.',
   NULL, NULL, 5, 'image', '/testimonials/mero-abdallah-review.jpeg', '/testimonials/mero-abdallah-review.jpeg',
   NULL, 'facebook', true, false, false, true, 30),

  -- Written 2: Dr. Ragab Allam
  ('Dr. Ragab Allam','Dr. Ragab Allam','جهة طبية','Medical Professional',
   'رأي د. رجب علام','Dr. Ragab Allam Review',
   'توضح هذه الشهادة احترافية MDink، الالتزام بالمواعيد، والمتابعة المستمرة، مع فهم عميق للتسويق الطبي.',
   'This testimonial reflects MDink''s professionalism, commitment to deadlines, continuous follow-up, and deep understanding of medical marketing.',
   'شركة MDink for Digital Solutions أثبتت على مدار ما يقارب 5 سنوات مستوى عالي جدًا من الاحترافية والالتزام في العمل. الفريق يتميز بفهم عميق للتسويق الطبي، وده شيء نادر ومهم جدًا لأي جهة طبية تبحث عن التميز. التزام واضح بالمواعيد، متابعة مستمرة لكل التفاصيل، تطوير دائم في الأداء والاستراتيجيات، وتعامل راقي واحترافي من د شيماء. بصراحة، هم ليسوا مجرد شركة تسويق، بل شركاء نجاح حقيقيين. أي شخص أو مؤسسة تبحث عن نتائج حقيقية في التسويق الطبي، فـ MDink هي الاختيار الصحيح بدون تردد.',
   'MDink for Digital Solutions has proven, over nearly 5 years, a very high level of professionalism and commitment. The team has a deep understanding of medical marketing — rare and valuable for any medical organization seeking excellence. Clear commitment to deadlines, continuous attention to every detail, ongoing development in performance and strategy, and refined professional dealing from Dr. Shaima. Honestly, they are not just a marketing company but real success partners. Anyone seeking real results in medical marketing — MDink is the right choice without hesitation.',
   NULL, NULL, 5, 'image', '/testimonials/ragab-allam-review.jpeg', '/testimonials/ragab-allam-review.jpeg',
   NULL, 'facebook', true, true, false, true, 40);


-- ===================== 20260629130000_public_review_uploads.sql =====================

-- ============================================================
-- MDink — Allow public review-media uploads (Leave Your Review form)
-- Visitors are not authenticated, so they need a narrow, safe path
-- to upload only into the review-submissions/ folder of mdink-media.
-- Admins keep full control everywhere else.
-- ============================================================

-- Public (anon + authenticated) may INSERT only into the
-- review-submissions/ folder, nowhere else in the bucket.
DROP POLICY IF EXISTS "Public upload review media" ON storage.objects;
DROP POLICY IF EXISTS "Public upload review media" ON storage.objects;
CREATE POLICY "Public upload review media" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'mdink-media'
    AND (storage.foldername(name))[1] = 'review-submissions'
  );

-- (Public read is already granted by "Public read mdink media".
--  Update/delete remain admin-only via the existing policies.)


-- ===================== 20260629140000_about_page.sql =====================

-- ============================================================
-- MDink — About page (warm rebuild) structured content + gallery
-- ============================================================

-- 1) "Life at MDink" gallery table (dashboard-manageable later)
CREATE TABLE IF NOT EXISTS public.about_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption_ar text,
  caption_en text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_gallery ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.about_gallery TO anon, authenticated;
GRANT ALL ON public.about_gallery TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read active about gallery" ON public.about_gallery;
DROP POLICY IF EXISTS "Public read active about gallery" ON public.about_gallery;
CREATE POLICY "Public read active about gallery" ON public.about_gallery
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage about gallery" ON public.about_gallery;
DROP POLICY IF EXISTS "Admins manage about gallery" ON public.about_gallery;
CREATE POLICY "Admins manage about gallery" ON public.about_gallery
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2) Structured About content stored in cms_pages (key = 'about')
-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content)
SELECT 'about', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'about');

UPDATE public.cms_pages
SET content = content || '{
  "hero_badge_ar":"فريق يفهم القطاع الطبي",
  "hero_badge_en":"A Team That Understands the Medical Sector",
  "hero_title_ar":"من نحن",
  "hero_title_en":"About Us",
  "hero_subtitle_ar":"في MDink، لا نبني حضورًا رقميًا فقط، بل نبني علاقة قائمة على الفهم، الثقة، والمتابعة الحقيقية. نحب أن يشعر كل عميل أنه يعمل مع فريق قريب منه، يفهم احتياجه، ويتعامل مع مشروعه كأنه جزء من بيته.",
  "hero_subtitle_en":"At MDink, we do not only build digital presence — we build relationships rooted in understanding, trust, and genuine follow-up. We want every client to feel they are working with a team that understands their needs and treats their project with real care.",
  "story_title_ar":"حكايتنا",
  "story_title_en":"Our Story",
  "story_body_ar":"بدأت MDink برغبة واضحة: أن يكون للطبيب والعيادة والجهة الطبية شريك رقمي يفهم طبيعة القطاع الطبي، ويجمع بين الاحتراف، الراحة، والمتابعة الصادقة. نحن لا نؤمن بالخدمة السريعة فقط، بل نؤمن بالعلاقة طويلة المدى، وبأن يشعر العميل أنه بين فريق يسانده ويهتم بنجاحه بصدق.",
  "story_body_en":"MDink began with a clear purpose: to give doctors, clinics, and medical organizations a digital partner that truly understands the medical field and combines professionalism, comfort, and sincere follow-up. We do not believe in quick service alone; we believe in long-term relationships and in making clients feel supported by a team that genuinely cares about their success.",
  "vision_ar":"أن نكون الشريك الرقمي الأقرب والأكثر فهمًا للقطاع الطبي، نبني حضورًا موثوقًا يليق بالأطباء والعيادات والجهات الطبية.",
  "vision_en":"To become the most trusted and understanding digital partner for the medical sector, building a digital presence worthy of doctors, clinics, and medical institutions.",
  "mission_ar":"أن نحول الخبرة الطبية إلى حضور رقمي واضح، دافئ، موثوق، وقابل للنمو من خلال المواقع، المحتوى، التصوير، والحملات.",
  "mission_en":"To transform medical expertise into a clear, warm, trusted, and scalable digital presence through websites, content, photography, and campaigns.",
  "values_ar":"الثقة، الوضوح، الالتزام، الاهتمام بالتفاصيل، الاحترام، والإنسانية في التعامل.",
  "values_en":"Trust, clarity, commitment, attention to detail, respect, and a deeply human approach to client relationships.",
  "team_title_ar":"فريق العمل",
  "team_title_en":"Our Team",
  "team_text_ar":"الأشخاص وراء تشغيل وتسويق وتطوير حضور MDink الطبي — فريق يجمع بين الخبرة، الود، والاهتمام الحقيقي بكل مشروع.",
  "team_text_en":"The people behind MDink''s medical marketing, development, content, and strategy — a team that combines expertise, warmth, and genuine care for every project.",
  "life_title_ar":"من كواليس MDink",
  "life_title_en":"Life at MDink",
  "life_text_ar":"لحظات تعكس روح الفريق، التعاون، والجانب الإنساني وراء ما نقدمه.",
  "life_text_en":"Moments that reflect our team spirit, collaboration, and the human side behind what we do.",
  "relationship_title_ar":"نؤمن بالعلاقة قبل الخدمة",
  "relationship_title_en":"We Believe in Relationships Before Services",
  "relationship_text_ar":"نحن لا نبحث عن تنفيذ مهمة ثم الرحيل، بل نبحث عن شراكة يشعر فيها العميل بالراحة، والوضوح، والثقة في كل خطوة.",
  "relationship_text_en":"We do not aim to complete a task and leave — we aim to build a partnership where the client feels comfortable, clear, and confident at every step.",
  "cta_title_ar":"إذا كنت تبحث عن فريق يفهمك قبل أن يبيع لك، فنحن هنا.",
  "cta_title_en":"If you are looking for a team that understands you before selling to you, we are here.",
  "cta_subtitle_ar":"ابدأ مشروعك الطبي مع MDink، ودعنا نبني لك حضورًا رقميًا موثوقًا، منظمًا، ودافئًا يعكس قيمتك الحقيقية.",
  "cta_subtitle_en":"Start your medical project with MDink, and let us build you a trusted, organized, and warm digital presence that reflects your real value.",
  "cta_primary_ar":"ابدأ مشروعك الطبي",
  "cta_primary_en":"Start Your Medical Project",
  "cta_secondary_ar":"تواصل معنا",
  "cta_secondary_en":"Contact Us"
}'::jsonb
WHERE key = 'about';


-- ===================== 20260629150000_blog_articles.sql =====================

-- ============================================================
-- MDink — Blog rebuild: SEO columns + 5 seeded articles
-- ============================================================

ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS meta_title_ar text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS meta_title_en text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS meta_description_ar text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS meta_description_en text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS primary_keyword_ar text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS canonical_url text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tags_ar text[] DEFAULT '{}';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS tags_en text[] DEFAULT '{}';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author_name_ar text DEFAULT 'فريق MDink';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS author_name_en text DEFAULT 'MDink Team';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS reading_time int DEFAULT 4;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS alt_ar text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS alt_en text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS related_slugs text[] DEFAULT '{}';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS next_slug text;

DELETE FROM public.blogs WHERE slug IN ('qesset-mdink-solutions','leh-tekhtar-mdink-solutions','leh-el-tabib-mehtag-website-social-media','ezay-el-mareed-yebhas-an-tabib','nezam-edaret-el-eyadat');

-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
INSERT INTO public.blogs (slug,status,published_at,sort_order,is_featured,show_on_home,reading_time,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,category,category_ar,category_en,meta_title_ar,meta_description_ar,primary_keyword_ar,canonical_url,tags_ar,tags_en,author_name_ar,author_name_en,related_slugs,next_slug) VALUES (
  'qesset-mdink-solutions',
  'published',
  now(),
  10,
  true,
  true,
  5,
  'قصة MDink Solutions: شركة التسويق الطبي اللي بتتكلم لغة الطبيب',
  'قصة MDink Solutions: شركة التسويق الطبي اللي بتتكلم لغة الطبيب',
  'The Story of MDink Solutions',
  'إزاي بدأت MDink Solutions سنة 2022 من فكرة طبيبة لاحظت احتياج الأطباء والعيادات لشريك رقمي يفهم طبيعة القطاع الطبي.',
  'إزاي بدأت MDink Solutions سنة 2022 من فكرة طبيبة لاحظت احتياج الأطباء والعيادات لشريك رقمي يفهم طبيعة القطاع الطبي.',
  'How MDink Solutions began in 2022 from a doctor''s idea — a digital partner that truly understands the medical sector.',
  '<p>في عالم مزدحم بشركات التسويق والتصميم، فيه فرق كبير بين شركة بتشتغل "للقطاع الطبي"، وشركة طالعة أصلاً <strong>من جوه</strong> القطاع الطبي. MDink Solutions من النوع التاني. الشركة مش بدأت كفكرة تسويقية عامة اتطبقت بعدين على الأطباء، لكن بدأت من فهم حقيقي لاحتياج الطبيب والعيادة والمركز الطبي، قبل ما تبدأ تقدّم أي خدمة.</p>
<h2 id="sec-1-1">البداية: لما طبيبة شافت فجوة محتاجة حل</h2>
<p>MDink Solutions اتأسست سنة <strong>2022</strong> على يد <strong>الدكتورة شيماء فهمي</strong>، طبيبة نساء وتوليد. الفكرة بدأت من ملاحظة بسيطة لكنها مهمة: كتير من الأطباء والعيادات في مصر والوطن العربي عندهم خبرة طبية ممتازة، لكن مفيش حد بيمثلهم صح على الإنترنت. مواقع غير موجودة أو قديمة، سوشيال ميديا بلا محتوى حقيقي، ومحتوى طبي إما غايب أو مكتوب بطريقة بعيدة عن لغة المريض.</p>
<p>من هنا، اتولدت فكرة <strong>MDink Solutions</strong>: شركة تسويق طبي متخصصة، مش وكالة عامة بتتعامل مع الأطباء زي أي عميل تاني، لكن شريك فاهم الفرق بين تسويق منتج عادي وتسويق ثقة طبية.</p>
<h2 id="sec-1-2">مين MDink Solutions دلوقتي</h2>
<p>من 2022 لحد دلوقتي، MDink Solutions بقت شريك رقمي متكامل لقطاع عريض من العاملين في المجال الطبي:</p>
<ul><li>أطباء مستقلين بييجوا يبنوا حضور رقمي من الصفر</li><li>عيادات خاصة بكل تخصصاتها (نساء وتوليد، أسنان، جلدية، علاج طبيعي، وغيرها)</li><li>مراكز طبية ومجمعات عيادات</li><li>مراكز تجميل</li><li>مستشفيات محتاجة منظومة رقمية أكبر وأشمل</li></ul>
<p>والخدمة مش مقصورة على حاجة واحدة، لكنها منظومة كاملة: من الموقع الإلكتروني والهوية البصرية، لمحتوى الـ SEO الطبي، للتصوير والفيديو داخل العيادة، للسوشيال ميديا والإعلانات، لحد التقارير وتحليل الأداء. كل ده بهدف واحد: إن الطبيب أو المؤسسة الطبية تظهر للمريض بالصورة اللي تستحقها فعلاً.</p>
<h2 id="sec-1-3">ليه MDink Solutions مختلفة عن أي شركة تسويق عادية</h2>
<p>السؤال اللي بيتسأل كتير: إيه الفرق بين MDink وأي شركة تسويق تانية؟ الإجابة بسيطة: <strong>الفهم</strong>. شركة تسويق عامة ممكن تعمل لوجو حلو أو بوست شكله جميل، لكنها مش هتفهم إيه اللي ممكن يطمّن مريضة قبل أول كشف عند طبيب نساء وتوليد، ولا إيه الطريقة الصح لعرض خدمة طبية من غير مبالغة أو معلومة غلط.</p>
<p>في MDink Solutions، الفريق نفسه فاهم القطاع الطبي من جواه، وده اللي بيخلي كل قرار تسويقي مبني على وعي بطبيعة العلاقة بين الطبيب والمريض، مش بس على قواعد تسويق عامة.</p>
<h2 id="sec-1-4">رؤية ورسالة MDink Solutions</h2>
<p>رسالة MDink Solutions بسيطة وواضحة: <strong>بناء منظومة رقمية طبية متكاملة</strong>، تجمع بين الموقع، والمحتوى، والتصوير، والسوشيال ميديا، والإعلانات، والتحليل، بطريقة مريحة وموثوقة، تخلي الطبيب أو المؤسسة الطبية يظهروا بالشكل اللي يعكس فعلاً مستوى خبرتهم وجدّيتهم.</p>
<p>وعلى مستوى الهوية، MDink Solutions بتبني نفسها كبراند طبي قبل ما يكون احترافي: دافئ، قريب، عائلي في طريقة التعامل، وفي نفس الوقت موثوق ومحترف في التنفيذ. مش وكالة بتتعامل مع الأطباء كأرقام، لكن شريك بيحس بمسؤولية اسم الطبيب وسمعته.</p>
<h2 id="sec-1-5">فريق العمل: خبرة حقيقية في كل تخصص</h2>
<p>فريق MDink Solutions مكوّن من متخصصين في مجالاتهم المختلفة (كتابة محتوى، تصميم جرافيك، تصوير، إدارة حملات، تطوير مواقع)، وكل واحد فيهم بخبرة تتراوح ما بين <strong>5 إلى 10 سنوات وأكتر</strong> في تخصصه. الفرق إن كل شغل بيتعمل مش بمنطق "حملة تسويقية عادية"، لكن بمنطق فاهم طبيعة القطاع الطبي وحساسيته.</p>
<p>ومع الوقت، MDink Solutions اشتغلت مع عدد كبير من العيادات والمراكز الطبية والأطباء في تخصصات مختلفة، وده اللي صقل خبرة الفريق في فهم احتياجات كل تخصص طبي على حدة.</p>
<h2 id="sec-1-6">الخلاصة</h2>
<p>قصة MDink Solutions في الأساس هي قصة محاولة لسد فجوة حقيقية: إن الطبيب الكويس مايفضلش غير معروف بسبب إن حضوره الرقمي ضعيف. من فكرة طبيبة لاحظت المشكلة، لشركة بتقدم منظومة تسويق طبي متكاملة لعشرات الأطباء والعيادات والمراكز في الوطن العربي.</p>
<p>لو حابب تعرف بالتفصيل ليه أطباء وعيادات كتير بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها فعليًا عن أي شركة تسويق تانية، هتلاقي التفاصيل في <a href="/blog/leh-tekhtar-mdink-solutions">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ رحلتك الرقمية مع MDink Solutions؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في عالم مزدحم بشركات التسويق والتصميم، فيه فرق كبير بين شركة بتشتغل "للقطاع الطبي"، وشركة طالعة أصلاً <strong>من جوه</strong> القطاع الطبي. MDink Solutions من النوع التاني. الشركة مش بدأت كفكرة تسويقية عامة اتطبقت بعدين على الأطباء، لكن بدأت من فهم حقيقي لاحتياج الطبيب والعيادة والمركز الطبي، قبل ما تبدأ تقدّم أي خدمة.</p>
<h2 id="sec-1-1">البداية: لما طبيبة شافت فجوة محتاجة حل</h2>
<p>MDink Solutions اتأسست سنة <strong>2022</strong> على يد <strong>الدكتورة شيماء فهمي</strong>، طبيبة نساء وتوليد. الفكرة بدأت من ملاحظة بسيطة لكنها مهمة: كتير من الأطباء والعيادات في مصر والوطن العربي عندهم خبرة طبية ممتازة، لكن مفيش حد بيمثلهم صح على الإنترنت. مواقع غير موجودة أو قديمة، سوشيال ميديا بلا محتوى حقيقي، ومحتوى طبي إما غايب أو مكتوب بطريقة بعيدة عن لغة المريض.</p>
<p>من هنا، اتولدت فكرة <strong>MDink Solutions</strong>: شركة تسويق طبي متخصصة، مش وكالة عامة بتتعامل مع الأطباء زي أي عميل تاني، لكن شريك فاهم الفرق بين تسويق منتج عادي وتسويق ثقة طبية.</p>
<h2 id="sec-1-2">مين MDink Solutions دلوقتي</h2>
<p>من 2022 لحد دلوقتي، MDink Solutions بقت شريك رقمي متكامل لقطاع عريض من العاملين في المجال الطبي:</p>
<ul><li>أطباء مستقلين بييجوا يبنوا حضور رقمي من الصفر</li><li>عيادات خاصة بكل تخصصاتها (نساء وتوليد، أسنان، جلدية، علاج طبيعي، وغيرها)</li><li>مراكز طبية ومجمعات عيادات</li><li>مراكز تجميل</li><li>مستشفيات محتاجة منظومة رقمية أكبر وأشمل</li></ul>
<p>والخدمة مش مقصورة على حاجة واحدة، لكنها منظومة كاملة: من الموقع الإلكتروني والهوية البصرية، لمحتوى الـ SEO الطبي، للتصوير والفيديو داخل العيادة، للسوشيال ميديا والإعلانات، لحد التقارير وتحليل الأداء. كل ده بهدف واحد: إن الطبيب أو المؤسسة الطبية تظهر للمريض بالصورة اللي تستحقها فعلاً.</p>
<h2 id="sec-1-3">ليه MDink Solutions مختلفة عن أي شركة تسويق عادية</h2>
<p>السؤال اللي بيتسأل كتير: إيه الفرق بين MDink وأي شركة تسويق تانية؟ الإجابة بسيطة: <strong>الفهم</strong>. شركة تسويق عامة ممكن تعمل لوجو حلو أو بوست شكله جميل، لكنها مش هتفهم إيه اللي ممكن يطمّن مريضة قبل أول كشف عند طبيب نساء وتوليد، ولا إيه الطريقة الصح لعرض خدمة طبية من غير مبالغة أو معلومة غلط.</p>
<p>في MDink Solutions، الفريق نفسه فاهم القطاع الطبي من جواه، وده اللي بيخلي كل قرار تسويقي مبني على وعي بطبيعة العلاقة بين الطبيب والمريض، مش بس على قواعد تسويق عامة.</p>
<h2 id="sec-1-4">رؤية ورسالة MDink Solutions</h2>
<p>رسالة MDink Solutions بسيطة وواضحة: <strong>بناء منظومة رقمية طبية متكاملة</strong>، تجمع بين الموقع، والمحتوى، والتصوير، والسوشيال ميديا، والإعلانات، والتحليل، بطريقة مريحة وموثوقة، تخلي الطبيب أو المؤسسة الطبية يظهروا بالشكل اللي يعكس فعلاً مستوى خبرتهم وجدّيتهم.</p>
<p>وعلى مستوى الهوية، MDink Solutions بتبني نفسها كبراند طبي قبل ما يكون احترافي: دافئ، قريب، عائلي في طريقة التعامل، وفي نفس الوقت موثوق ومحترف في التنفيذ. مش وكالة بتتعامل مع الأطباء كأرقام، لكن شريك بيحس بمسؤولية اسم الطبيب وسمعته.</p>
<h2 id="sec-1-5">فريق العمل: خبرة حقيقية في كل تخصص</h2>
<p>فريق MDink Solutions مكوّن من متخصصين في مجالاتهم المختلفة (كتابة محتوى، تصميم جرافيك، تصوير، إدارة حملات، تطوير مواقع)، وكل واحد فيهم بخبرة تتراوح ما بين <strong>5 إلى 10 سنوات وأكتر</strong> في تخصصه. الفرق إن كل شغل بيتعمل مش بمنطق "حملة تسويقية عادية"، لكن بمنطق فاهم طبيعة القطاع الطبي وحساسيته.</p>
<p>ومع الوقت، MDink Solutions اشتغلت مع عدد كبير من العيادات والمراكز الطبية والأطباء في تخصصات مختلفة، وده اللي صقل خبرة الفريق في فهم احتياجات كل تخصص طبي على حدة.</p>
<h2 id="sec-1-6">الخلاصة</h2>
<p>قصة MDink Solutions في الأساس هي قصة محاولة لسد فجوة حقيقية: إن الطبيب الكويس مايفضلش غير معروف بسبب إن حضوره الرقمي ضعيف. من فكرة طبيبة لاحظت المشكلة، لشركة بتقدم منظومة تسويق طبي متكاملة لعشرات الأطباء والعيادات والمراكز في الوطن العربي.</p>
<p>لو حابب تعرف بالتفصيل ليه أطباء وعيادات كتير بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها فعليًا عن أي شركة تسويق تانية، هتلاقي التفاصيل في <a href="/blog/leh-tekhtar-mdink-solutions">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ رحلتك الرقمية مع MDink Solutions؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في عالم مزدحم بشركات التسويق والتصميم، فيه فرق كبير بين شركة بتشتغل "للقطاع الطبي"، وشركة طالعة أصلاً <strong>من جوه</strong> القطاع الطبي. MDink Solutions من النوع التاني. الشركة مش بدأت كفكرة تسويقية عامة اتطبقت بعدين على الأطباء، لكن بدأت من فهم حقيقي لاحتياج الطبيب والعيادة والمركز الطبي، قبل ما تبدأ تقدّم أي خدمة.</p>
<h2 id="sec-1-1">البداية: لما طبيبة شافت فجوة محتاجة حل</h2>
<p>MDink Solutions اتأسست سنة <strong>2022</strong> على يد <strong>الدكتورة شيماء فهمي</strong>، طبيبة نساء وتوليد. الفكرة بدأت من ملاحظة بسيطة لكنها مهمة: كتير من الأطباء والعيادات في مصر والوطن العربي عندهم خبرة طبية ممتازة، لكن مفيش حد بيمثلهم صح على الإنترنت. مواقع غير موجودة أو قديمة، سوشيال ميديا بلا محتوى حقيقي، ومحتوى طبي إما غايب أو مكتوب بطريقة بعيدة عن لغة المريض.</p>
<p>من هنا، اتولدت فكرة <strong>MDink Solutions</strong>: شركة تسويق طبي متخصصة، مش وكالة عامة بتتعامل مع الأطباء زي أي عميل تاني، لكن شريك فاهم الفرق بين تسويق منتج عادي وتسويق ثقة طبية.</p>
<h2 id="sec-1-2">مين MDink Solutions دلوقتي</h2>
<p>من 2022 لحد دلوقتي، MDink Solutions بقت شريك رقمي متكامل لقطاع عريض من العاملين في المجال الطبي:</p>
<ul><li>أطباء مستقلين بييجوا يبنوا حضور رقمي من الصفر</li><li>عيادات خاصة بكل تخصصاتها (نساء وتوليد، أسنان، جلدية، علاج طبيعي، وغيرها)</li><li>مراكز طبية ومجمعات عيادات</li><li>مراكز تجميل</li><li>مستشفيات محتاجة منظومة رقمية أكبر وأشمل</li></ul>
<p>والخدمة مش مقصورة على حاجة واحدة، لكنها منظومة كاملة: من الموقع الإلكتروني والهوية البصرية، لمحتوى الـ SEO الطبي، للتصوير والفيديو داخل العيادة، للسوشيال ميديا والإعلانات، لحد التقارير وتحليل الأداء. كل ده بهدف واحد: إن الطبيب أو المؤسسة الطبية تظهر للمريض بالصورة اللي تستحقها فعلاً.</p>
<h2 id="sec-1-3">ليه MDink Solutions مختلفة عن أي شركة تسويق عادية</h2>
<p>السؤال اللي بيتسأل كتير: إيه الفرق بين MDink وأي شركة تسويق تانية؟ الإجابة بسيطة: <strong>الفهم</strong>. شركة تسويق عامة ممكن تعمل لوجو حلو أو بوست شكله جميل، لكنها مش هتفهم إيه اللي ممكن يطمّن مريضة قبل أول كشف عند طبيب نساء وتوليد، ولا إيه الطريقة الصح لعرض خدمة طبية من غير مبالغة أو معلومة غلط.</p>
<p>في MDink Solutions، الفريق نفسه فاهم القطاع الطبي من جواه، وده اللي بيخلي كل قرار تسويقي مبني على وعي بطبيعة العلاقة بين الطبيب والمريض، مش بس على قواعد تسويق عامة.</p>
<h2 id="sec-1-4">رؤية ورسالة MDink Solutions</h2>
<p>رسالة MDink Solutions بسيطة وواضحة: <strong>بناء منظومة رقمية طبية متكاملة</strong>، تجمع بين الموقع، والمحتوى، والتصوير، والسوشيال ميديا، والإعلانات، والتحليل، بطريقة مريحة وموثوقة، تخلي الطبيب أو المؤسسة الطبية يظهروا بالشكل اللي يعكس فعلاً مستوى خبرتهم وجدّيتهم.</p>
<p>وعلى مستوى الهوية، MDink Solutions بتبني نفسها كبراند طبي قبل ما يكون احترافي: دافئ، قريب، عائلي في طريقة التعامل، وفي نفس الوقت موثوق ومحترف في التنفيذ. مش وكالة بتتعامل مع الأطباء كأرقام، لكن شريك بيحس بمسؤولية اسم الطبيب وسمعته.</p>
<h2 id="sec-1-5">فريق العمل: خبرة حقيقية في كل تخصص</h2>
<p>فريق MDink Solutions مكوّن من متخصصين في مجالاتهم المختلفة (كتابة محتوى، تصميم جرافيك، تصوير، إدارة حملات، تطوير مواقع)، وكل واحد فيهم بخبرة تتراوح ما بين <strong>5 إلى 10 سنوات وأكتر</strong> في تخصصه. الفرق إن كل شغل بيتعمل مش بمنطق "حملة تسويقية عادية"، لكن بمنطق فاهم طبيعة القطاع الطبي وحساسيته.</p>
<p>ومع الوقت، MDink Solutions اشتغلت مع عدد كبير من العيادات والمراكز الطبية والأطباء في تخصصات مختلفة، وده اللي صقل خبرة الفريق في فهم احتياجات كل تخصص طبي على حدة.</p>
<h2 id="sec-1-6">الخلاصة</h2>
<p>قصة MDink Solutions في الأساس هي قصة محاولة لسد فجوة حقيقية: إن الطبيب الكويس مايفضلش غير معروف بسبب إن حضوره الرقمي ضعيف. من فكرة طبيبة لاحظت المشكلة، لشركة بتقدم منظومة تسويق طبي متكاملة لعشرات الأطباء والعيادات والمراكز في الوطن العربي.</p>
<p>لو حابب تعرف بالتفصيل ليه أطباء وعيادات كتير بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها فعليًا عن أي شركة تسويق تانية، هتلاقي التفاصيل في <a href="/blog/leh-tekhtar-mdink-solutions">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ رحلتك الرقمية مع MDink Solutions؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  'التسويق الطبي',
  'التسويق الطبي',
  'Medical Marketing',
  'قصة MDink Solutions | شركة تسويق طبي لعيادات ومراكز الوطن العربي',
  'تعرّف على قصة MDink Solutions، شركة التسويق الطبي اللي بدأت بفكرة طبيبة وبقت شريك رقمي للأطباء والعيادات والمراكز الطبية في الوطن العربي.',
  'قصة MDink Solutions / شركة تسويق طبي',
  '/blog/qesset-mdink-solutions',
  ARRAY['MDink','قصة الشركة','تسويق طبي'],
  ARRAY['MDink','Brand Story','Medical Marketing'],
  'فريق MDink',
  'MDink Team',
  ARRAY['leh-tekhtar-mdink-solutions'],
  'leh-tekhtar-mdink-solutions'
);

-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
INSERT INTO public.blogs (slug,status,published_at,sort_order,is_featured,show_on_home,reading_time,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,category,category_ar,category_en,meta_title_ar,meta_description_ar,primary_keyword_ar,canonical_url,tags_ar,tags_en,author_name_ar,author_name_en,related_slugs,next_slug) VALUES (
  'leh-tekhtar-mdink-solutions',
  'published',
  now(),
  20,
  false,
  false,
  5,
  'ليه تختار MDink Solutions؟',
  'ليه تختار MDink Solutions؟',
  'Why Choose MDink Solutions?',
  'ليه أطباء وعيادات ومراكز طبية في الوطن العربي بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها كأفضل شركة تسويق طبي متخصصة.',
  'ليه أطباء وعيادات ومراكز طبية في الوطن العربي بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها كأفضل شركة تسويق طبي متخصصة.',
  'Why doctors, clinics, and medical centers across the Arab world specifically choose MDink Solutions.',
  '<p>في المقال السابق حكينا <a href="/blog/qesset-mdink-solutions">قصة MDink Solutions</a>، إزاي بدأت سنة 2022 من فكرة طبيبة لاحظت إن الأطباء محتاجين شريك رقمي فاهم طبيعة المهنة الطبية. لكن السؤال اللي غالبًا بيشغل بال أي طبيب أو مسؤول عيادة أو مركز طبي وهو بيدور على شركة تسويق هو: <strong>ليه تحديدًا MDink Solutions، من بين عشرات الشركات الموجودة في السوق؟</strong> الإجابة مش جملة تسويقية، لكنها مجموعة فروق فعلية بتتلمس في طريقة الشغل من أول يوم.</p>
<h2 id="sec-2-1">1. فريق فاهم الطب قبل ما يفهم التسويق</h2>
<p>أي شركة تسويق ممكن تكتب بوست أو تصمم لوجو. لكن لما اللي بيكتب المحتوى الطبي أو بيراجعه فاهم الفرق بين معلومة طبية دقيقة ومعلومة مبسطة بس غلط، أو فاهم إيه اللي ممكن يقلق مريض بدل ما يطمنه، الفرق بيبان فورًا في جودة المحتوى ونتيجته. في MDink Solutions، القيادة طبية من الأساس (الشركة بقيادة د. شيماء فهمي، طبيبة نساء وتوليد)، وده بينعكس على كل تفصيلة في الشغل.</p>
<h2 id="sec-2-2">2. مش خدمة مبعثرة… منظومة متكاملة فعلًا</h2>
<p>كتير من الأطباء بيكونوا مضطرين يتعاملوا مع 3 أو 4 جهات مختلفة: واحد للموقع، واحد للسوشيال ميديا، واحد للتصوير، وواحد للإعلانات. النتيجة غالبًا تشتت وعدم اتساق في الهوية والرسالة. MDink Solutions بتقدّم المنظومة كاملة تحت سقف واحد: الموقع، الهوية البصرية، المحتوى الطبي والـ SEO، التصوير والفيديو داخل العيادة، إدارة السوشيال ميديا، الحملات الإعلانية، وربط الواتساب ونماذج الحجز، وكل ده بييجي بتقارير أداء واضحة.</p>
<h2 id="sec-2-3">3. نتائج حقيقية، مش وعود</h2>
<p>أصدق طريقة تعرف بيها قيمة أي شركة هي رأي اللي تعامل معاها فعلاً. الدكتور <strong>رجب علام</strong> كتب عن تجربته مع الشركة على مدار قرابة 5 سنوات، ووصف الفريق بإنه يتميز بفهم عميق للتسويق الطبي، وأشار للالتزام الواضح بالمواعيد، والمتابعة المستمرة لكل التفاصيل، والتطوير الدائم في الأداء والاستراتيجيات. ومن ليبيا، نقلت <strong>ميرو عبدالله</strong> عن تجربة د. أميرة المنقوش، اللي وصلت معاها صفحتها لعدد متابعين 3 آلاف في وقت قصير. وفيه كمان شهادات فيديو موثقة (زي رأي د. عزيزة الجباس، بتقييم 5 نجوم) بتأكد نفس الخط.</p>
<p>تقدر تشوف كل ده بنفسك في صفحة <a href="/reviews">آراء عملائنا</a>.</p>
<h2 id="sec-2-4">4. متابعة لحظة بلحظة، مش تسليم شغل واختفاء</h2>
<p>من أكتر الحاجات اللي بيشتكي منها الأطباء مع شركات التسويق العادية إنهم بيدفعوا، يستلموا شغل، وبعدين محدش بيتابع النتيجة. في MDink Solutions، المتابعة المستمرة والتطوير الدوري في الاستراتيجية جزء أساسي من الخدمة، مش إضافة اختيارية.</p>
<h2 id="sec-2-5">5. تعامل قريب وإنساني، مش "تيكت دعم"</h2>
<p>طابع MDink Solutions بُني من الأساس على إنه دافئ وعائلي وقريب من العميل، مش وكالة بترد بردود جاهزة. الطبيب بيتعامل مع ناس فاهمة ظروف شغله، مش مجرد منفذين.</p>
<h2 id="sec-2-6">الخلاصة</h2>
<p>اختيار شركة تسويق طبي مش قرار شكلي، ده قرار بيأثر على صورة الطبيب وثقة المريض فيه. MDink Solutions بتجمع بين فهم طبي حقيقي، منظومة متكاملة، ونتائج موثقة بآراء عملاء فعليين. لكن يفضل سؤال أهم لسه ما اتجاوبش: <strong>ليه الطبيب أو العيادة أصلاً محتاجين كل ده من الأساس؟</strong> ده اللي هنتكلم عنه في <a href="/blog/leh-el-tabib-mehtag-website-social-media">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ مع فريق فاهم احتياجك الحقيقي؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقال السابق حكينا <a href="/blog/qesset-mdink-solutions">قصة MDink Solutions</a>، إزاي بدأت سنة 2022 من فكرة طبيبة لاحظت إن الأطباء محتاجين شريك رقمي فاهم طبيعة المهنة الطبية. لكن السؤال اللي غالبًا بيشغل بال أي طبيب أو مسؤول عيادة أو مركز طبي وهو بيدور على شركة تسويق هو: <strong>ليه تحديدًا MDink Solutions، من بين عشرات الشركات الموجودة في السوق؟</strong> الإجابة مش جملة تسويقية، لكنها مجموعة فروق فعلية بتتلمس في طريقة الشغل من أول يوم.</p>
<h2 id="sec-2-1">1. فريق فاهم الطب قبل ما يفهم التسويق</h2>
<p>أي شركة تسويق ممكن تكتب بوست أو تصمم لوجو. لكن لما اللي بيكتب المحتوى الطبي أو بيراجعه فاهم الفرق بين معلومة طبية دقيقة ومعلومة مبسطة بس غلط، أو فاهم إيه اللي ممكن يقلق مريض بدل ما يطمنه، الفرق بيبان فورًا في جودة المحتوى ونتيجته. في MDink Solutions، القيادة طبية من الأساس (الشركة بقيادة د. شيماء فهمي، طبيبة نساء وتوليد)، وده بينعكس على كل تفصيلة في الشغل.</p>
<h2 id="sec-2-2">2. مش خدمة مبعثرة… منظومة متكاملة فعلًا</h2>
<p>كتير من الأطباء بيكونوا مضطرين يتعاملوا مع 3 أو 4 جهات مختلفة: واحد للموقع، واحد للسوشيال ميديا، واحد للتصوير، وواحد للإعلانات. النتيجة غالبًا تشتت وعدم اتساق في الهوية والرسالة. MDink Solutions بتقدّم المنظومة كاملة تحت سقف واحد: الموقع، الهوية البصرية، المحتوى الطبي والـ SEO، التصوير والفيديو داخل العيادة، إدارة السوشيال ميديا، الحملات الإعلانية، وربط الواتساب ونماذج الحجز، وكل ده بييجي بتقارير أداء واضحة.</p>
<h2 id="sec-2-3">3. نتائج حقيقية، مش وعود</h2>
<p>أصدق طريقة تعرف بيها قيمة أي شركة هي رأي اللي تعامل معاها فعلاً. الدكتور <strong>رجب علام</strong> كتب عن تجربته مع الشركة على مدار قرابة 5 سنوات، ووصف الفريق بإنه يتميز بفهم عميق للتسويق الطبي، وأشار للالتزام الواضح بالمواعيد، والمتابعة المستمرة لكل التفاصيل، والتطوير الدائم في الأداء والاستراتيجيات. ومن ليبيا، نقلت <strong>ميرو عبدالله</strong> عن تجربة د. أميرة المنقوش، اللي وصلت معاها صفحتها لعدد متابعين 3 آلاف في وقت قصير. وفيه كمان شهادات فيديو موثقة (زي رأي د. عزيزة الجباس، بتقييم 5 نجوم) بتأكد نفس الخط.</p>
<p>تقدر تشوف كل ده بنفسك في صفحة <a href="/reviews">آراء عملائنا</a>.</p>
<h2 id="sec-2-4">4. متابعة لحظة بلحظة، مش تسليم شغل واختفاء</h2>
<p>من أكتر الحاجات اللي بيشتكي منها الأطباء مع شركات التسويق العادية إنهم بيدفعوا، يستلموا شغل، وبعدين محدش بيتابع النتيجة. في MDink Solutions، المتابعة المستمرة والتطوير الدوري في الاستراتيجية جزء أساسي من الخدمة، مش إضافة اختيارية.</p>
<h2 id="sec-2-5">5. تعامل قريب وإنساني، مش "تيكت دعم"</h2>
<p>طابع MDink Solutions بُني من الأساس على إنه دافئ وعائلي وقريب من العميل، مش وكالة بترد بردود جاهزة. الطبيب بيتعامل مع ناس فاهمة ظروف شغله، مش مجرد منفذين.</p>
<h2 id="sec-2-6">الخلاصة</h2>
<p>اختيار شركة تسويق طبي مش قرار شكلي، ده قرار بيأثر على صورة الطبيب وثقة المريض فيه. MDink Solutions بتجمع بين فهم طبي حقيقي، منظومة متكاملة، ونتائج موثقة بآراء عملاء فعليين. لكن يفضل سؤال أهم لسه ما اتجاوبش: <strong>ليه الطبيب أو العيادة أصلاً محتاجين كل ده من الأساس؟</strong> ده اللي هنتكلم عنه في <a href="/blog/leh-el-tabib-mehtag-website-social-media">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ مع فريق فاهم احتياجك الحقيقي؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقال السابق حكينا <a href="/blog/qesset-mdink-solutions">قصة MDink Solutions</a>، إزاي بدأت سنة 2022 من فكرة طبيبة لاحظت إن الأطباء محتاجين شريك رقمي فاهم طبيعة المهنة الطبية. لكن السؤال اللي غالبًا بيشغل بال أي طبيب أو مسؤول عيادة أو مركز طبي وهو بيدور على شركة تسويق هو: <strong>ليه تحديدًا MDink Solutions، من بين عشرات الشركات الموجودة في السوق؟</strong> الإجابة مش جملة تسويقية، لكنها مجموعة فروق فعلية بتتلمس في طريقة الشغل من أول يوم.</p>
<h2 id="sec-2-1">1. فريق فاهم الطب قبل ما يفهم التسويق</h2>
<p>أي شركة تسويق ممكن تكتب بوست أو تصمم لوجو. لكن لما اللي بيكتب المحتوى الطبي أو بيراجعه فاهم الفرق بين معلومة طبية دقيقة ومعلومة مبسطة بس غلط، أو فاهم إيه اللي ممكن يقلق مريض بدل ما يطمنه، الفرق بيبان فورًا في جودة المحتوى ونتيجته. في MDink Solutions، القيادة طبية من الأساس (الشركة بقيادة د. شيماء فهمي، طبيبة نساء وتوليد)، وده بينعكس على كل تفصيلة في الشغل.</p>
<h2 id="sec-2-2">2. مش خدمة مبعثرة… منظومة متكاملة فعلًا</h2>
<p>كتير من الأطباء بيكونوا مضطرين يتعاملوا مع 3 أو 4 جهات مختلفة: واحد للموقع، واحد للسوشيال ميديا، واحد للتصوير، وواحد للإعلانات. النتيجة غالبًا تشتت وعدم اتساق في الهوية والرسالة. MDink Solutions بتقدّم المنظومة كاملة تحت سقف واحد: الموقع، الهوية البصرية، المحتوى الطبي والـ SEO، التصوير والفيديو داخل العيادة، إدارة السوشيال ميديا، الحملات الإعلانية، وربط الواتساب ونماذج الحجز، وكل ده بييجي بتقارير أداء واضحة.</p>
<h2 id="sec-2-3">3. نتائج حقيقية، مش وعود</h2>
<p>أصدق طريقة تعرف بيها قيمة أي شركة هي رأي اللي تعامل معاها فعلاً. الدكتور <strong>رجب علام</strong> كتب عن تجربته مع الشركة على مدار قرابة 5 سنوات، ووصف الفريق بإنه يتميز بفهم عميق للتسويق الطبي، وأشار للالتزام الواضح بالمواعيد، والمتابعة المستمرة لكل التفاصيل، والتطوير الدائم في الأداء والاستراتيجيات. ومن ليبيا، نقلت <strong>ميرو عبدالله</strong> عن تجربة د. أميرة المنقوش، اللي وصلت معاها صفحتها لعدد متابعين 3 آلاف في وقت قصير. وفيه كمان شهادات فيديو موثقة (زي رأي د. عزيزة الجباس، بتقييم 5 نجوم) بتأكد نفس الخط.</p>
<p>تقدر تشوف كل ده بنفسك في صفحة <a href="/reviews">آراء عملائنا</a>.</p>
<h2 id="sec-2-4">4. متابعة لحظة بلحظة، مش تسليم شغل واختفاء</h2>
<p>من أكتر الحاجات اللي بيشتكي منها الأطباء مع شركات التسويق العادية إنهم بيدفعوا، يستلموا شغل، وبعدين محدش بيتابع النتيجة. في MDink Solutions، المتابعة المستمرة والتطوير الدوري في الاستراتيجية جزء أساسي من الخدمة، مش إضافة اختيارية.</p>
<h2 id="sec-2-5">5. تعامل قريب وإنساني، مش "تيكت دعم"</h2>
<p>طابع MDink Solutions بُني من الأساس على إنه دافئ وعائلي وقريب من العميل، مش وكالة بترد بردود جاهزة. الطبيب بيتعامل مع ناس فاهمة ظروف شغله، مش مجرد منفذين.</p>
<h2 id="sec-2-6">الخلاصة</h2>
<p>اختيار شركة تسويق طبي مش قرار شكلي، ده قرار بيأثر على صورة الطبيب وثقة المريض فيه. MDink Solutions بتجمع بين فهم طبي حقيقي، منظومة متكاملة، ونتائج موثقة بآراء عملاء فعليين. لكن يفضل سؤال أهم لسه ما اتجاوبش: <strong>ليه الطبيب أو العيادة أصلاً محتاجين كل ده من الأساس؟</strong> ده اللي هنتكلم عنه في <a href="/blog/leh-el-tabib-mehtag-website-social-media">المقال الجاي</a>.</p>
<div class="blog-cta"><p><strong>عايز تبدأ مع فريق فاهم احتياجك الحقيقي؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  'التسويق الطبي',
  'التسويق الطبي',
  'Medical Marketing',
  'ليه تختار MDink Solutions؟ أفضل شركة تسويق طبي للعيادات والمراكز الطبية',
  'تعرف ليه أطباء وعيادات ومراكز طبية في الوطن العربي بيختاروا MDink Solutions تحديدًا، وإيه اللي بيميزها كأفضل شركة تسويق طبي متخصصة.',
  'أفضل شركة تسويق طبي للعيادات والمراكز الطبية',
  '/blog/leh-tekhtar-mdink-solutions',
  ARRAY['تسويق طبي','عيادات','مراكز طبية'],
  ARRAY['Medical Marketing','Clinics','Medical Centers'],
  'فريق MDink',
  'MDink Team',
  ARRAY['leh-el-tabib-mehtag-website-social-media'],
  'leh-el-tabib-mehtag-website-social-media'
);

-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
INSERT INTO public.blogs (slug,status,published_at,sort_order,is_featured,show_on_home,reading_time,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,category,category_ar,category_en,meta_title_ar,meta_description_ar,primary_keyword_ar,canonical_url,tags_ar,tags_en,author_name_ar,author_name_en,related_slugs,next_slug) VALUES (
  'leh-el-tabib-mehtag-website-social-media',
  'published',
  now(),
  30,
  false,
  false,
  5,
  'ليه الطبيب محتاج موقع إلكتروني وسوشيال ميديا في عصرنا الحالي؟',
  'ليه الطبيب محتاج موقع إلكتروني وسوشيال ميديا في عصرنا الحالي؟',
  'Why Does a Doctor Need a Website and Social Media?',
  'ليه أصبح وجود موقع إلكتروني وسوشيال ميديا ومحتوى طبي ضرورة ملحة لأي طبيب أو عيادة أو مركز طبي، مش مجرد رفاهية اختيارية.',
  'ليه أصبح وجود موقع إلكتروني وسوشيال ميديا ومحتوى طبي ضرورة ملحة لأي طبيب أو عيادة أو مركز طبي، مش مجرد رفاهية اختيارية.',
  'Why a website, social media, and medical content became a necessity for any doctor or clinic — not a luxury.',
  '<p>في المقال السابق اتكلمنا عن <a href="/blog/leh-tekhtar-mdink-solutions">ليه تختار MDink Solutions</a> تحديدًا كشريك تسويق طبي. لكن في الحقيقة، السؤال اللي لازم يتسأل الأول هو سؤال أعمق: <strong>ليه أصلاً أي طبيب أو عيادة أو مركز طبي محتاج حضور رقمي من الأساس؟</strong> الإجابة بسيطة، بس مهمة: لأن الطب نفسه ما اتغيرش، لكن طريقة وصول المريض للطبيب اتغيرت تمامًا.</p>
<h2 id="sec-3-1">الزمن اتغير… والمريض بقى يدوّر قبل ما يحجز</h2>
<p>من سنين، كان المريض بيعرف الطبيب عن طريق توصية من حد قريب، أو عيادة جنب البيت. دلوقتي، نسبة كبيرة جدًا من المرضى بتفتح جوجل أو السوشيال ميديا الأول، قبل ما تاخد قرار الحجز. النتيجة المباشرة: الطبيب اللي مش موجود رقميًا بيبقى عمليًا "غير موجود" بالنسبة لشريحة كبيرة من المرضى المحتملين، مهما كانت خبرته الحقيقية ممتازة.</p>
<h2 id="sec-3-2">مفيش موقع إلكتروني؟ يبقى مفيش "بطاقة تعريف" حقيقية</h2>
<p>الموقع الإلكتروني مش مجرد ديكور. هو المكان الوحيد اللي الطبيب بيتحكم فيه بالكامل: المعلومات، الخدمات، طريقة العرض، وحتى الانطباع الأول. السوشيال ميديا بتعرّف، لكن الموقع هو اللي بيقنع ويثبت الجدية، خصوصًا لما يكون متجاوب مع الموبايل وفيه طريقة حجز أو تواصل واضحة.</p>
<h2 id="sec-3-3">السوشيال ميديا مش رفاهية… هي واجهة الثقة الأولى</h2>
<p>كتير من الأطباء لسه بيشوفوا السوشيال ميديا كحاجة "إضافية". الواقع إنها بقت أول مكان بيشوف فيه المريض شكل العيادة، طريقة تعامل الطبيب، وحتى آراء مرضى سابقين. صفحة فاضية أو متوقفة من فترة بتدي انطباع عكسي تمامًا.</p>
<h2 id="sec-3-4">المحتوى الطبي: اتكلم بصوتك انت</h2>
<p>لما طبيب ما بيكتبش أو يشارك محتوى طبي موثوق بصوته، المريض غالبًا بيدور على المعلومة من مصادر تانية مش بالضرورة دقيقة. المقالات والمحتوى الطبي مش بس وسيلة لظهور الموقع في جوجل، هي كمان فرصة للطبيب إنه يبني صورته كمرجع موثوق في تخصصه.</p>
<h2 id="sec-3-5">وأنظمة إدارة العيادة كمان جزء من المنظومة</h2>
<p>وجود نظام رقمي بسيط لإدارة العيادة ومتابعة رحلة المريض (من الحجز لحد المتابعة بعد الزيارة) بقى جزء طبيعي من الحضور الرقمي المتكامل، مش بس واجهة خارجية للمريض، لكن تنظيم داخلي بيخدم الطبيب نفسه.</p>
<h2 id="sec-3-6">لو الطبيب مش موجود رقميًا… مين اللي موجود بدل منه؟</h2>
<p>لو طبيب معين مش موجود بشكل واضح على جوجل أو السوشيال ميديا، ده معناه إن المريض هيوصل لحد تاني، زميل في نفس التخصص عنده حضور رقمي أقوى، حتى لو مش بالضرورة أكتر خبرة. الحضور الرقمي بقى عامل منافسة حقيقي.</p>
<h2 id="sec-3-7">الخلاصة</h2>
<p>موقع إلكتروني، سوشيال ميديا نشطة، محتوى طبي موثوق، ونظام بسيط لإدارة العيادة، كل ده بقى من أساسيات عصرنا الحالي. ولفهم الموضوع ده بشكل أعمق، في <a href="/blog/ezay-el-mareed-yebhas-an-tabib">المقال الجاي</a> هنشرح بالتفصيل إزاي المريض فعليًا بيبحث ويقارن قبل ما يحجز موعد.</p>
<div class="blog-cta"><p><strong>عايز تبني حضورك الرقمي بشكل صحيح من البداية؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقال السابق اتكلمنا عن <a href="/blog/leh-tekhtar-mdink-solutions">ليه تختار MDink Solutions</a> تحديدًا كشريك تسويق طبي. لكن في الحقيقة، السؤال اللي لازم يتسأل الأول هو سؤال أعمق: <strong>ليه أصلاً أي طبيب أو عيادة أو مركز طبي محتاج حضور رقمي من الأساس؟</strong> الإجابة بسيطة، بس مهمة: لأن الطب نفسه ما اتغيرش، لكن طريقة وصول المريض للطبيب اتغيرت تمامًا.</p>
<h2 id="sec-3-1">الزمن اتغير… والمريض بقى يدوّر قبل ما يحجز</h2>
<p>من سنين، كان المريض بيعرف الطبيب عن طريق توصية من حد قريب، أو عيادة جنب البيت. دلوقتي، نسبة كبيرة جدًا من المرضى بتفتح جوجل أو السوشيال ميديا الأول، قبل ما تاخد قرار الحجز. النتيجة المباشرة: الطبيب اللي مش موجود رقميًا بيبقى عمليًا "غير موجود" بالنسبة لشريحة كبيرة من المرضى المحتملين، مهما كانت خبرته الحقيقية ممتازة.</p>
<h2 id="sec-3-2">مفيش موقع إلكتروني؟ يبقى مفيش "بطاقة تعريف" حقيقية</h2>
<p>الموقع الإلكتروني مش مجرد ديكور. هو المكان الوحيد اللي الطبيب بيتحكم فيه بالكامل: المعلومات، الخدمات، طريقة العرض، وحتى الانطباع الأول. السوشيال ميديا بتعرّف، لكن الموقع هو اللي بيقنع ويثبت الجدية، خصوصًا لما يكون متجاوب مع الموبايل وفيه طريقة حجز أو تواصل واضحة.</p>
<h2 id="sec-3-3">السوشيال ميديا مش رفاهية… هي واجهة الثقة الأولى</h2>
<p>كتير من الأطباء لسه بيشوفوا السوشيال ميديا كحاجة "إضافية". الواقع إنها بقت أول مكان بيشوف فيه المريض شكل العيادة، طريقة تعامل الطبيب، وحتى آراء مرضى سابقين. صفحة فاضية أو متوقفة من فترة بتدي انطباع عكسي تمامًا.</p>
<h2 id="sec-3-4">المحتوى الطبي: اتكلم بصوتك انت</h2>
<p>لما طبيب ما بيكتبش أو يشارك محتوى طبي موثوق بصوته، المريض غالبًا بيدور على المعلومة من مصادر تانية مش بالضرورة دقيقة. المقالات والمحتوى الطبي مش بس وسيلة لظهور الموقع في جوجل، هي كمان فرصة للطبيب إنه يبني صورته كمرجع موثوق في تخصصه.</p>
<h2 id="sec-3-5">وأنظمة إدارة العيادة كمان جزء من المنظومة</h2>
<p>وجود نظام رقمي بسيط لإدارة العيادة ومتابعة رحلة المريض (من الحجز لحد المتابعة بعد الزيارة) بقى جزء طبيعي من الحضور الرقمي المتكامل، مش بس واجهة خارجية للمريض، لكن تنظيم داخلي بيخدم الطبيب نفسه.</p>
<h2 id="sec-3-6">لو الطبيب مش موجود رقميًا… مين اللي موجود بدل منه؟</h2>
<p>لو طبيب معين مش موجود بشكل واضح على جوجل أو السوشيال ميديا، ده معناه إن المريض هيوصل لحد تاني، زميل في نفس التخصص عنده حضور رقمي أقوى، حتى لو مش بالضرورة أكتر خبرة. الحضور الرقمي بقى عامل منافسة حقيقي.</p>
<h2 id="sec-3-7">الخلاصة</h2>
<p>موقع إلكتروني، سوشيال ميديا نشطة، محتوى طبي موثوق، ونظام بسيط لإدارة العيادة، كل ده بقى من أساسيات عصرنا الحالي. ولفهم الموضوع ده بشكل أعمق، في <a href="/blog/ezay-el-mareed-yebhas-an-tabib">المقال الجاي</a> هنشرح بالتفصيل إزاي المريض فعليًا بيبحث ويقارن قبل ما يحجز موعد.</p>
<div class="blog-cta"><p><strong>عايز تبني حضورك الرقمي بشكل صحيح من البداية؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقال السابق اتكلمنا عن <a href="/blog/leh-tekhtar-mdink-solutions">ليه تختار MDink Solutions</a> تحديدًا كشريك تسويق طبي. لكن في الحقيقة، السؤال اللي لازم يتسأل الأول هو سؤال أعمق: <strong>ليه أصلاً أي طبيب أو عيادة أو مركز طبي محتاج حضور رقمي من الأساس؟</strong> الإجابة بسيطة، بس مهمة: لأن الطب نفسه ما اتغيرش، لكن طريقة وصول المريض للطبيب اتغيرت تمامًا.</p>
<h2 id="sec-3-1">الزمن اتغير… والمريض بقى يدوّر قبل ما يحجز</h2>
<p>من سنين، كان المريض بيعرف الطبيب عن طريق توصية من حد قريب، أو عيادة جنب البيت. دلوقتي، نسبة كبيرة جدًا من المرضى بتفتح جوجل أو السوشيال ميديا الأول، قبل ما تاخد قرار الحجز. النتيجة المباشرة: الطبيب اللي مش موجود رقميًا بيبقى عمليًا "غير موجود" بالنسبة لشريحة كبيرة من المرضى المحتملين، مهما كانت خبرته الحقيقية ممتازة.</p>
<h2 id="sec-3-2">مفيش موقع إلكتروني؟ يبقى مفيش "بطاقة تعريف" حقيقية</h2>
<p>الموقع الإلكتروني مش مجرد ديكور. هو المكان الوحيد اللي الطبيب بيتحكم فيه بالكامل: المعلومات، الخدمات، طريقة العرض، وحتى الانطباع الأول. السوشيال ميديا بتعرّف، لكن الموقع هو اللي بيقنع ويثبت الجدية، خصوصًا لما يكون متجاوب مع الموبايل وفيه طريقة حجز أو تواصل واضحة.</p>
<h2 id="sec-3-3">السوشيال ميديا مش رفاهية… هي واجهة الثقة الأولى</h2>
<p>كتير من الأطباء لسه بيشوفوا السوشيال ميديا كحاجة "إضافية". الواقع إنها بقت أول مكان بيشوف فيه المريض شكل العيادة، طريقة تعامل الطبيب، وحتى آراء مرضى سابقين. صفحة فاضية أو متوقفة من فترة بتدي انطباع عكسي تمامًا.</p>
<h2 id="sec-3-4">المحتوى الطبي: اتكلم بصوتك انت</h2>
<p>لما طبيب ما بيكتبش أو يشارك محتوى طبي موثوق بصوته، المريض غالبًا بيدور على المعلومة من مصادر تانية مش بالضرورة دقيقة. المقالات والمحتوى الطبي مش بس وسيلة لظهور الموقع في جوجل، هي كمان فرصة للطبيب إنه يبني صورته كمرجع موثوق في تخصصه.</p>
<h2 id="sec-3-5">وأنظمة إدارة العيادة كمان جزء من المنظومة</h2>
<p>وجود نظام رقمي بسيط لإدارة العيادة ومتابعة رحلة المريض (من الحجز لحد المتابعة بعد الزيارة) بقى جزء طبيعي من الحضور الرقمي المتكامل، مش بس واجهة خارجية للمريض، لكن تنظيم داخلي بيخدم الطبيب نفسه.</p>
<h2 id="sec-3-6">لو الطبيب مش موجود رقميًا… مين اللي موجود بدل منه؟</h2>
<p>لو طبيب معين مش موجود بشكل واضح على جوجل أو السوشيال ميديا، ده معناه إن المريض هيوصل لحد تاني، زميل في نفس التخصص عنده حضور رقمي أقوى، حتى لو مش بالضرورة أكتر خبرة. الحضور الرقمي بقى عامل منافسة حقيقي.</p>
<h2 id="sec-3-7">الخلاصة</h2>
<p>موقع إلكتروني، سوشيال ميديا نشطة، محتوى طبي موثوق، ونظام بسيط لإدارة العيادة، كل ده بقى من أساسيات عصرنا الحالي. ولفهم الموضوع ده بشكل أعمق، في <a href="/blog/ezay-el-mareed-yebhas-an-tabib">المقال الجاي</a> هنشرح بالتفصيل إزاي المريض فعليًا بيبحث ويقارن قبل ما يحجز موعد.</p>
<div class="blog-cta"><p><strong>عايز تبني حضورك الرقمي بشكل صحيح من البداية؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  'المواقع الطبية',
  'المواقع الطبية',
  'Medical Websites',
  'ليه الطبيب محتاج موقع إلكتروني وسوشيال ميديا؟ الحضور الرقمي بقى ضرورة مش رفاهية',
  'ليه أصبح وجود موقع إلكتروني وسوشيال ميديا ومحتوى طبي ضرورة ملحة لأي طبيب أو عيادة أو مركز طبي في عصرنا الحالي، مش مجرد رفاهية اختيارية.',
  'ليه الطبيب محتاج موقع إلكتروني وسوشيال ميديا',
  '/blog/leh-el-tabib-mehtag-website-social-media',
  ARRAY['موقع طبي','سوشيال ميديا','حضور رقمي'],
  ARRAY['Medical Website','Social Media','Digital Presence'],
  'فريق MDink',
  'MDink Team',
  ARRAY['ezay-el-mareed-yebhas-an-tabib'],
  'ezay-el-mareed-yebhas-an-tabib'
);

-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
INSERT INTO public.blogs (slug,status,published_at,sort_order,is_featured,show_on_home,reading_time,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,category,category_ar,category_en,meta_title_ar,meta_description_ar,primary_keyword_ar,canonical_url,tags_ar,tags_en,author_name_ar,author_name_en,related_slugs,next_slug) VALUES (
  'ezay-el-mareed-yebhas-an-tabib',
  'published',
  now(),
  40,
  false,
  false,
  6,
  'إزاي المريض يبحث عن طبيب قبل ما يحجز موعد؟',
  'إزاي المريض يبحث عن طبيب قبل ما يحجز موعد؟',
  'How Does a Patient Search for a Doctor Before Booking?',
  'قبل ما يحجز أي مريض موعد، بيمر برحلة بحث رقمية كاملة: من جوجل، للسوشيال ميديا، للمقالات الطبية. اعرف إزاي المريض بيقارن ويختار طبيبه.',
  'قبل ما يحجز أي مريض موعد، بيمر برحلة بحث رقمية كاملة: من جوجل، للسوشيال ميديا، للمقالات الطبية. اعرف إزاي المريض بيقارن ويختار طبيبه.',
  'Before booking, every patient goes through a full digital search journey. Learn how they compare and choose.',
  '<p>في المقال السابق وضحنا <a href="/blog/leh-el-tabib-mehtag-website-social-media">ليه الطبيب محتاج حضور رقمي</a> من الأساس. ولفهم الموضوع من جذوره، لازم نشوف الصورة من زاوية الطرف التاني في المعادلة: <strong>المريض نفسه</strong>. إزاي بيفكر؟ بيدوّر فين؟ وإيه اللي فعلًا بيخليه يختار طبيب معين من غير طبيبين تانيين؟</p>
<h2 id="sec-4-1">المريض بقى بيدور قبل ما يحجز… مش بعد كده</h2>
<p>وفقًا لتقرير حديث صادر سنة 2026 عن منصة Appeario المتخصصة في تحليل سلوك المرضى الرقمي، فإن حوالي 77% من المرضى يستخدمون محركات البحث قبل حجز أي موعد طبي. وفي تقرير منفصل صادر عن منصة rater8، تبين إن نسبة تقترب من 84% من المرضى بيراجعوا التقييمات والآراء أونلاين قبل ما يختاروا مقدم رعاية صحية جديد.</p>
<h2 id="sec-4-2">أول محطة: جوجل… من "الأعراض" لـ"الطبيب"</h2>
<p>رحلة المريض غالبًا بتبدأ بمرحلتين على جوجل: أولًا بيدور عن الأعراض نفسها عشان يفهم وضعه، وثانيًا بيدور بصيغة زي "دكتور [التخصص] قريب مني". في اللحظة دي، الطبيب أو العيادة اللي ظاهرة بوضوح في نتائج البحث، بمعلومات كاملة وموقع مرتب، بتاخد الأفضلية الأولى تلقائيًا.</p>
<h2 id="sec-4-3">تاني محطة: السوشيال ميديا</h2>
<p>بعد ما المريض يلاقي اسم، بيروح غالبًا يدور على صفحة السوشيال ميديا. هنا بيدور على إحساس: العيادة شكلها إزاي؟ الطبيب بيتكلم بإيه أسلوب؟ في تفاعل حقيقي ولا الصفحة متوقفة من شهور؟</p>
<h2 id="sec-4-4">تالت محطة: المقالات الطبية</h2>
<p>لما المريض يلاقي مقال بيشرح له حالته أو الإجراء اللي هيعمله بطريقة مبسطة وصادقة، بيحس إن الطبيب فاهم احتياجه ومستعد يشرحله، حتى قبل ما يكلمه أصلًا. وده بالظبط اللي بنركز عليه في كل موقع بنبنيه.</p>
<h2 id="sec-4-5">آخر محطة: المقارنة</h2>
<p>غالبًا المريض مابيكتفيش بطبيب واحد. بيفتح اتنين أو تلاتة تبويبات ويقارن: مين عنده موقع أوضح؟ مين رد عليه أسرع على واتساب؟ مين عنده تقييمات أكتر؟ القرار النهائي بيتبني على مجموع التفاصيل دي، مش بس على الخبرة الطبية وحدها.</p>
<h2 id="sec-4-6">ولما المريض يحجز فعلًا… الرحلة لسه مكملة</h2>
<p>الحجز مش آخر الخط. وجود نظام بسيط لإدارة العيادة بيساعد في متابعة المريض بعد الحجز: تذكير بالموعد، متابعة بعد الزيارة، وتنظيم بياناته. وده موضوع نتكلم عنه بالتفصيل في <a href="/blog/nezam-edaret-el-eyadat">مقال نظام إدارة العيادات</a>.</p>
<h2 id="sec-4-7">الخلاصة</h2>
<p>رحلة المريض مبقتش تبدأ من باب العيادة، بقت بتبدأ من شاشة الموبايل. والطبيب اللي حاضر بقوة في كل محطة هو اللي بياخد الأفضلية في الاختيار النهائي. ده بالظبط اللي MDink Solutions بتبنيه مع كل عميل.</p>
<div class="blog-cta"><p><strong>جاهز تبني الحضور الرقمي اللي يقابل مريضك في كل خطوة من رحلته؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>
<h3 id="sources-4">المصادر</h3>
<ul class="blog-sources"><li>Appeario, "How Patients Find Doctors Online in 2026: Search Behavior Data You Need to Know" (2026)</li><li>rater8, "2025 Report: How Patients Choose Their Doctors" (2025)</li></ul>',
  '<p>في المقال السابق وضحنا <a href="/blog/leh-el-tabib-mehtag-website-social-media">ليه الطبيب محتاج حضور رقمي</a> من الأساس. ولفهم الموضوع من جذوره، لازم نشوف الصورة من زاوية الطرف التاني في المعادلة: <strong>المريض نفسه</strong>. إزاي بيفكر؟ بيدوّر فين؟ وإيه اللي فعلًا بيخليه يختار طبيب معين من غير طبيبين تانيين؟</p>
<h2 id="sec-4-1">المريض بقى بيدور قبل ما يحجز… مش بعد كده</h2>
<p>وفقًا لتقرير حديث صادر سنة 2026 عن منصة Appeario المتخصصة في تحليل سلوك المرضى الرقمي، فإن حوالي 77% من المرضى يستخدمون محركات البحث قبل حجز أي موعد طبي. وفي تقرير منفصل صادر عن منصة rater8، تبين إن نسبة تقترب من 84% من المرضى بيراجعوا التقييمات والآراء أونلاين قبل ما يختاروا مقدم رعاية صحية جديد.</p>
<h2 id="sec-4-2">أول محطة: جوجل… من "الأعراض" لـ"الطبيب"</h2>
<p>رحلة المريض غالبًا بتبدأ بمرحلتين على جوجل: أولًا بيدور عن الأعراض نفسها عشان يفهم وضعه، وثانيًا بيدور بصيغة زي "دكتور [التخصص] قريب مني". في اللحظة دي، الطبيب أو العيادة اللي ظاهرة بوضوح في نتائج البحث، بمعلومات كاملة وموقع مرتب، بتاخد الأفضلية الأولى تلقائيًا.</p>
<h2 id="sec-4-3">تاني محطة: السوشيال ميديا</h2>
<p>بعد ما المريض يلاقي اسم، بيروح غالبًا يدور على صفحة السوشيال ميديا. هنا بيدور على إحساس: العيادة شكلها إزاي؟ الطبيب بيتكلم بإيه أسلوب؟ في تفاعل حقيقي ولا الصفحة متوقفة من شهور؟</p>
<h2 id="sec-4-4">تالت محطة: المقالات الطبية</h2>
<p>لما المريض يلاقي مقال بيشرح له حالته أو الإجراء اللي هيعمله بطريقة مبسطة وصادقة، بيحس إن الطبيب فاهم احتياجه ومستعد يشرحله، حتى قبل ما يكلمه أصلًا. وده بالظبط اللي بنركز عليه في كل موقع بنبنيه.</p>
<h2 id="sec-4-5">آخر محطة: المقارنة</h2>
<p>غالبًا المريض مابيكتفيش بطبيب واحد. بيفتح اتنين أو تلاتة تبويبات ويقارن: مين عنده موقع أوضح؟ مين رد عليه أسرع على واتساب؟ مين عنده تقييمات أكتر؟ القرار النهائي بيتبني على مجموع التفاصيل دي، مش بس على الخبرة الطبية وحدها.</p>
<h2 id="sec-4-6">ولما المريض يحجز فعلًا… الرحلة لسه مكملة</h2>
<p>الحجز مش آخر الخط. وجود نظام بسيط لإدارة العيادة بيساعد في متابعة المريض بعد الحجز: تذكير بالموعد، متابعة بعد الزيارة، وتنظيم بياناته. وده موضوع نتكلم عنه بالتفصيل في <a href="/blog/nezam-edaret-el-eyadat">مقال نظام إدارة العيادات</a>.</p>
<h2 id="sec-4-7">الخلاصة</h2>
<p>رحلة المريض مبقتش تبدأ من باب العيادة، بقت بتبدأ من شاشة الموبايل. والطبيب اللي حاضر بقوة في كل محطة هو اللي بياخد الأفضلية في الاختيار النهائي. ده بالظبط اللي MDink Solutions بتبنيه مع كل عميل.</p>
<div class="blog-cta"><p><strong>جاهز تبني الحضور الرقمي اللي يقابل مريضك في كل خطوة من رحلته؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>
<h3 id="sources-4">المصادر</h3>
<ul class="blog-sources"><li>Appeario, "How Patients Find Doctors Online in 2026: Search Behavior Data You Need to Know" (2026)</li><li>rater8, "2025 Report: How Patients Choose Their Doctors" (2025)</li></ul>',
  '<p>في المقال السابق وضحنا <a href="/blog/leh-el-tabib-mehtag-website-social-media">ليه الطبيب محتاج حضور رقمي</a> من الأساس. ولفهم الموضوع من جذوره، لازم نشوف الصورة من زاوية الطرف التاني في المعادلة: <strong>المريض نفسه</strong>. إزاي بيفكر؟ بيدوّر فين؟ وإيه اللي فعلًا بيخليه يختار طبيب معين من غير طبيبين تانيين؟</p>
<h2 id="sec-4-1">المريض بقى بيدور قبل ما يحجز… مش بعد كده</h2>
<p>وفقًا لتقرير حديث صادر سنة 2026 عن منصة Appeario المتخصصة في تحليل سلوك المرضى الرقمي، فإن حوالي 77% من المرضى يستخدمون محركات البحث قبل حجز أي موعد طبي. وفي تقرير منفصل صادر عن منصة rater8، تبين إن نسبة تقترب من 84% من المرضى بيراجعوا التقييمات والآراء أونلاين قبل ما يختاروا مقدم رعاية صحية جديد.</p>
<h2 id="sec-4-2">أول محطة: جوجل… من "الأعراض" لـ"الطبيب"</h2>
<p>رحلة المريض غالبًا بتبدأ بمرحلتين على جوجل: أولًا بيدور عن الأعراض نفسها عشان يفهم وضعه، وثانيًا بيدور بصيغة زي "دكتور [التخصص] قريب مني". في اللحظة دي، الطبيب أو العيادة اللي ظاهرة بوضوح في نتائج البحث، بمعلومات كاملة وموقع مرتب، بتاخد الأفضلية الأولى تلقائيًا.</p>
<h2 id="sec-4-3">تاني محطة: السوشيال ميديا</h2>
<p>بعد ما المريض يلاقي اسم، بيروح غالبًا يدور على صفحة السوشيال ميديا. هنا بيدور على إحساس: العيادة شكلها إزاي؟ الطبيب بيتكلم بإيه أسلوب؟ في تفاعل حقيقي ولا الصفحة متوقفة من شهور؟</p>
<h2 id="sec-4-4">تالت محطة: المقالات الطبية</h2>
<p>لما المريض يلاقي مقال بيشرح له حالته أو الإجراء اللي هيعمله بطريقة مبسطة وصادقة، بيحس إن الطبيب فاهم احتياجه ومستعد يشرحله، حتى قبل ما يكلمه أصلًا. وده بالظبط اللي بنركز عليه في كل موقع بنبنيه.</p>
<h2 id="sec-4-5">آخر محطة: المقارنة</h2>
<p>غالبًا المريض مابيكتفيش بطبيب واحد. بيفتح اتنين أو تلاتة تبويبات ويقارن: مين عنده موقع أوضح؟ مين رد عليه أسرع على واتساب؟ مين عنده تقييمات أكتر؟ القرار النهائي بيتبني على مجموع التفاصيل دي، مش بس على الخبرة الطبية وحدها.</p>
<h2 id="sec-4-6">ولما المريض يحجز فعلًا… الرحلة لسه مكملة</h2>
<p>الحجز مش آخر الخط. وجود نظام بسيط لإدارة العيادة بيساعد في متابعة المريض بعد الحجز: تذكير بالموعد، متابعة بعد الزيارة، وتنظيم بياناته. وده موضوع نتكلم عنه بالتفصيل في <a href="/blog/nezam-edaret-el-eyadat">مقال نظام إدارة العيادات</a>.</p>
<h2 id="sec-4-7">الخلاصة</h2>
<p>رحلة المريض مبقتش تبدأ من باب العيادة، بقت بتبدأ من شاشة الموبايل. والطبيب اللي حاضر بقوة في كل محطة هو اللي بياخد الأفضلية في الاختيار النهائي. ده بالظبط اللي MDink Solutions بتبنيه مع كل عميل.</p>
<div class="blog-cta"><p><strong>جاهز تبني الحضور الرقمي اللي يقابل مريضك في كل خطوة من رحلته؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>
<h3 id="sources-4">المصادر</h3>
<ul class="blog-sources"><li>Appeario, "How Patients Find Doctors Online in 2026: Search Behavior Data You Need to Know" (2026)</li><li>rater8, "2025 Report: How Patients Choose Their Doctors" (2025)</li></ul>',
  'رحلة المريض',
  'رحلة المريض',
  'Patient Journey',
  'إزاي المريض يبحث عن طبيب قبل ما يحجز موعد؟ رحلة المريض الرقمية كاملة',
  'قبل ما يحجز أي مريض موعد، بيمر برحلة بحث رقمية كاملة: من جوجل، للسوشيال ميديا، للمقالات الطبية. اعرف إزاي المريض بيقارن ويختار طبيبه.',
  'إزاي المريض يبحث عن طبيب قبل الحجز',
  '/blog/ezay-el-mareed-yebhas-an-tabib',
  ARRAY['رحلة المريض','بحث المرضى','SEO طبي'],
  ARRAY['Patient Journey','Patient Search','Medical SEO'],
  'فريق MDink',
  'MDink Team',
  ARRAY['nezam-edaret-el-eyadat'],
  'nezam-edaret-el-eyadat'
);

-- [auto-guard]
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published'));
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS excerpt text;
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS content text NOT NULL DEFAULT '';
ALTER TABLE public.blogs ADD COLUMN IF NOT EXISTS category text;
INSERT INTO public.blogs (slug,status,published_at,sort_order,is_featured,show_on_home,reading_time,title,title_ar,title_en,excerpt,excerpt_ar,excerpt_en,content,content_ar,content_en,category,category_ar,category_en,meta_title_ar,meta_description_ar,primary_keyword_ar,canonical_url,tags_ar,tags_en,author_name_ar,author_name_en,related_slugs,next_slug) VALUES (
  'nezam-edaret-el-eyadat',
  'published',
  now(),
  50,
  false,
  false,
  5,
  'نظام إدارة العيادات: إزاي يتابع رحلة المريض ويسهّل شغل العيادة بالكامل؟',
  'نظام إدارة العيادات: إزاي يتابع رحلة المريض ويسهّل شغل العيادة بالكامل؟',
  'Clinic Management System',
  'نظام إدارة العيادات مش مجرد أجندة حجز. اعرف إزاي بيتابع رحلة المريض، يراقب حالة الأجهزة، وينظم حضور وانصراف الفريق في مكان واحد.',
  'نظام إدارة العيادات مش مجرد أجندة حجز. اعرف إزاي بيتابع رحلة المريض، يراقب حالة الأجهزة، وينظم حضور وانصراف الفريق في مكان واحد.',
  'A clinic management system is more than a booking calendar — patient journey, equipment status, and staff attendance in one place.',
  '<p>في المقالات السابقة لمحنا أكتر من مرة لموضوع نظام إدارة العيادة، باعتباره جزء من منظومة الحضور الرقمي المتكاملة. دلوقتي نتكلم عنه بالتفصيل، لأنه في الحقيقة مش مجرد "أجندة حجز إلكترونية"، لكنه أداة تنظيم تلمس كل جوانب شغل العيادة تقريبًا.</p>
<h2 id="sec-5-1">مش بس برنامج حجز… هو العمود الفقري لتنظيم العيادة</h2>
<p>نظام الإدارة الحقيقي بيغطي حاجات كتير بتأثر في شغل العيادة اليومي، من متابعة المريض نفسه، لحالة الأجهزة، لحضور وانصراف الفريق، وكل ده في مكان واحد بدل ما يكون متفرق بين دفاتر وملاحظات وذاكرة الموظفين.</p>
<h2 id="sec-5-2">أولًا: متابعة رحلة المريض من أول حجز لحد المتابعة</h2>
<p>أهم وظيفة هي تتبّع رحلة المريض: الحجز، التذكير بالموعد قبل ما يفوت، وتسجيل بيانات أساسية عن الزيارة. ده بيقلل نسبة المرضى اللي بينسوا مواعيدهم، وبيدي العيادة صورة أوضح عن تاريخ كل مريض.</p>
<h2 id="sec-5-3">ثانيًا: متابعة الأجهزة… قبل ما تتعطل في أسوأ توقيت</h2>
<p>في تخصصات زي طب الأسنان أو العيون، الأجهزة جزء أساسي من الخدمة. نظام الإدارة بيساعد العيادة تسجل حالة كل جهاز، آخر صيانة، ولو فيه جهاز عطلان، وده بيمنع موقف محرج إن مريض يحجز وييجي يلاقي الجهاز اللي محتاجه عطلان.</p>
<h2 id="sec-5-4">ثالثًا: إدارة حضور وانصراف الفريق</h2>
<p>نفس النظام بيقدر يسهّل تسجيل حضور وانصراف العاملين، وبيدي صاحب العيادة رؤية واضحة عن الالتزام، من غير متابعة يدوية مرهقة.</p>
<h2 id="sec-5-5">ليه ده مهم للطبيب نفسه، مش بس للمريض</h2>
<p>الفايدة في راحة الطبيب وصاحب العيادة. بدل ما الوقت يضيع في تنسيق يدوي بين الحجوزات والصيانة والفريق، كل حاجة بتبقى متابعة من مكان واحد، وده وقت وجهد بيترجم لتجربة أفضل للمريض واستقرار أكتر في شغل العيادة.</p>
<h2 id="sec-5-6">جزء من منظومة واحدة متكاملة</h2>
<p>نظام إدارة العيادة مش بديل عن <a href="/blog/leh-el-tabib-mehtag-website-social-media">الموقع والسوشيال ميديا والمحتوى الطبي</a> اللي اتكلمنا عنهم، لكنه مكمّل ليهم. لو الموقع والسوشيال ميديا بيجيبوا المريض، فنظام الإدارة هو اللي بيخلي تجربته منظمة وسلسة.</p>
<h2 id="sec-5-7">الخلاصة</h2>
<p>نظام إدارة العيادة بقى أداة عملية حقيقية، مش رفاهية تقنية. من متابعة رحلة المريض، لمراقبة حالة الأجهزة، لتنظيم حضور الفريق، كل ده بيتجمع في مكان واحد. تقدر تعرف أكتر عن <a href="/services">خدمات MDink</a> أو <a href="/contact">تتواصل معانا</a> مباشرة.</p>
<div class="blog-cta"><p><strong>عايز عيادتك تتنظم بنظام إدارة متكامل يناسب احتياجك؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقالات السابقة لمحنا أكتر من مرة لموضوع نظام إدارة العيادة، باعتباره جزء من منظومة الحضور الرقمي المتكاملة. دلوقتي نتكلم عنه بالتفصيل، لأنه في الحقيقة مش مجرد "أجندة حجز إلكترونية"، لكنه أداة تنظيم تلمس كل جوانب شغل العيادة تقريبًا.</p>
<h2 id="sec-5-1">مش بس برنامج حجز… هو العمود الفقري لتنظيم العيادة</h2>
<p>نظام الإدارة الحقيقي بيغطي حاجات كتير بتأثر في شغل العيادة اليومي، من متابعة المريض نفسه، لحالة الأجهزة، لحضور وانصراف الفريق، وكل ده في مكان واحد بدل ما يكون متفرق بين دفاتر وملاحظات وذاكرة الموظفين.</p>
<h2 id="sec-5-2">أولًا: متابعة رحلة المريض من أول حجز لحد المتابعة</h2>
<p>أهم وظيفة هي تتبّع رحلة المريض: الحجز، التذكير بالموعد قبل ما يفوت، وتسجيل بيانات أساسية عن الزيارة. ده بيقلل نسبة المرضى اللي بينسوا مواعيدهم، وبيدي العيادة صورة أوضح عن تاريخ كل مريض.</p>
<h2 id="sec-5-3">ثانيًا: متابعة الأجهزة… قبل ما تتعطل في أسوأ توقيت</h2>
<p>في تخصصات زي طب الأسنان أو العيون، الأجهزة جزء أساسي من الخدمة. نظام الإدارة بيساعد العيادة تسجل حالة كل جهاز، آخر صيانة، ولو فيه جهاز عطلان، وده بيمنع موقف محرج إن مريض يحجز وييجي يلاقي الجهاز اللي محتاجه عطلان.</p>
<h2 id="sec-5-4">ثالثًا: إدارة حضور وانصراف الفريق</h2>
<p>نفس النظام بيقدر يسهّل تسجيل حضور وانصراف العاملين، وبيدي صاحب العيادة رؤية واضحة عن الالتزام، من غير متابعة يدوية مرهقة.</p>
<h2 id="sec-5-5">ليه ده مهم للطبيب نفسه، مش بس للمريض</h2>
<p>الفايدة في راحة الطبيب وصاحب العيادة. بدل ما الوقت يضيع في تنسيق يدوي بين الحجوزات والصيانة والفريق، كل حاجة بتبقى متابعة من مكان واحد، وده وقت وجهد بيترجم لتجربة أفضل للمريض واستقرار أكتر في شغل العيادة.</p>
<h2 id="sec-5-6">جزء من منظومة واحدة متكاملة</h2>
<p>نظام إدارة العيادة مش بديل عن <a href="/blog/leh-el-tabib-mehtag-website-social-media">الموقع والسوشيال ميديا والمحتوى الطبي</a> اللي اتكلمنا عنهم، لكنه مكمّل ليهم. لو الموقع والسوشيال ميديا بيجيبوا المريض، فنظام الإدارة هو اللي بيخلي تجربته منظمة وسلسة.</p>
<h2 id="sec-5-7">الخلاصة</h2>
<p>نظام إدارة العيادة بقى أداة عملية حقيقية، مش رفاهية تقنية. من متابعة رحلة المريض، لمراقبة حالة الأجهزة، لتنظيم حضور الفريق، كل ده بيتجمع في مكان واحد. تقدر تعرف أكتر عن <a href="/services">خدمات MDink</a> أو <a href="/contact">تتواصل معانا</a> مباشرة.</p>
<div class="blog-cta"><p><strong>عايز عيادتك تتنظم بنظام إدارة متكامل يناسب احتياجك؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  '<p>في المقالات السابقة لمحنا أكتر من مرة لموضوع نظام إدارة العيادة، باعتباره جزء من منظومة الحضور الرقمي المتكاملة. دلوقتي نتكلم عنه بالتفصيل، لأنه في الحقيقة مش مجرد "أجندة حجز إلكترونية"، لكنه أداة تنظيم تلمس كل جوانب شغل العيادة تقريبًا.</p>
<h2 id="sec-5-1">مش بس برنامج حجز… هو العمود الفقري لتنظيم العيادة</h2>
<p>نظام الإدارة الحقيقي بيغطي حاجات كتير بتأثر في شغل العيادة اليومي، من متابعة المريض نفسه، لحالة الأجهزة، لحضور وانصراف الفريق، وكل ده في مكان واحد بدل ما يكون متفرق بين دفاتر وملاحظات وذاكرة الموظفين.</p>
<h2 id="sec-5-2">أولًا: متابعة رحلة المريض من أول حجز لحد المتابعة</h2>
<p>أهم وظيفة هي تتبّع رحلة المريض: الحجز، التذكير بالموعد قبل ما يفوت، وتسجيل بيانات أساسية عن الزيارة. ده بيقلل نسبة المرضى اللي بينسوا مواعيدهم، وبيدي العيادة صورة أوضح عن تاريخ كل مريض.</p>
<h2 id="sec-5-3">ثانيًا: متابعة الأجهزة… قبل ما تتعطل في أسوأ توقيت</h2>
<p>في تخصصات زي طب الأسنان أو العيون، الأجهزة جزء أساسي من الخدمة. نظام الإدارة بيساعد العيادة تسجل حالة كل جهاز، آخر صيانة، ولو فيه جهاز عطلان، وده بيمنع موقف محرج إن مريض يحجز وييجي يلاقي الجهاز اللي محتاجه عطلان.</p>
<h2 id="sec-5-4">ثالثًا: إدارة حضور وانصراف الفريق</h2>
<p>نفس النظام بيقدر يسهّل تسجيل حضور وانصراف العاملين، وبيدي صاحب العيادة رؤية واضحة عن الالتزام، من غير متابعة يدوية مرهقة.</p>
<h2 id="sec-5-5">ليه ده مهم للطبيب نفسه، مش بس للمريض</h2>
<p>الفايدة في راحة الطبيب وصاحب العيادة. بدل ما الوقت يضيع في تنسيق يدوي بين الحجوزات والصيانة والفريق، كل حاجة بتبقى متابعة من مكان واحد، وده وقت وجهد بيترجم لتجربة أفضل للمريض واستقرار أكتر في شغل العيادة.</p>
<h2 id="sec-5-6">جزء من منظومة واحدة متكاملة</h2>
<p>نظام إدارة العيادة مش بديل عن <a href="/blog/leh-el-tabib-mehtag-website-social-media">الموقع والسوشيال ميديا والمحتوى الطبي</a> اللي اتكلمنا عنهم، لكنه مكمّل ليهم. لو الموقع والسوشيال ميديا بيجيبوا المريض، فنظام الإدارة هو اللي بيخلي تجربته منظمة وسلسة.</p>
<h2 id="sec-5-7">الخلاصة</h2>
<p>نظام إدارة العيادة بقى أداة عملية حقيقية، مش رفاهية تقنية. من متابعة رحلة المريض، لمراقبة حالة الأجهزة، لتنظيم حضور الفريق، كل ده بيتجمع في مكان واحد. تقدر تعرف أكتر عن <a href="/services">خدمات MDink</a> أو <a href="/contact">تتواصل معانا</a> مباشرة.</p>
<div class="blog-cta"><p><strong>عايز عيادتك تتنظم بنظام إدارة متكامل يناسب احتياجك؟</strong></p><p>احجز استشارتك المجانية وانضم لعضويتنا الآن عبر واتساب: <a href="https://wa.me/201020658409" target="_blank" rel="noopener noreferrer">+20 10 20658409</a></p></div>',
  'إدارة العيادات',
  'إدارة العيادات',
  'Clinic Management',
  'نظام إدارة العيادات: إزاي يتابع رحلة المريض ويسهّل شغل العيادة بالكامل',
  'نظام إدارة العيادات مش مجرد أجندة حجز. اعرف إزاي بيتابع رحلة المريض، يراقب حالة الأجهزة، وينظم حضور وانصراف الفريق في مكان واحد.',
  'نظام إدارة عيادات',
  '/blog/nezam-edaret-el-eyadat',
  ARRAY['نظام إدارة عيادات','رحلة المريض','تنظيم العيادة'],
  ARRAY['Clinic Management','Patient Journey','Clinic Organization'],
  'فريق MDink',
  'MDink Team',
  ARRAY['leh-el-tabib-mehtag-website-social-media','ezay-el-mareed-yebhas-an-tabib'],
  NULL
);


-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content)
SELECT 'blog_page', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'blog_page');

UPDATE public.cms_pages SET content = content || '{
  "title_ar":"المدونة الطبية","title_en":"Medical Blog",
  "intro_ar":"مقالات ورؤى عملية في التسويق الطبي، المواقع، السوشيال ميديا، رحلة المريض، وإدارة العيادات — مكتوبة لخدمة الأطباء والعيادات والمراكز الطبية.",
  "intro_en":"Practical insights on medical marketing, websites, social media, patient journey, and clinic management — created for doctors, clinics, and medical centers."
}'::jsonb WHERE key = 'blog_page';


-- ===================== 20260629160000_contact_page.sql =====================

-- ============================================================
-- MDink — Contact page rebuild: extended leads + page content
-- ============================================================

-- 1) Extend leads for richer lead management (dashboard-ready)
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_needed text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_link text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_online_presence_links text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_contact text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_page text DEFAULT '/contact';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Contact page structured content
-- [auto-guard]
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS key text;
ALTER TABLE public.cms_pages ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;
INSERT INTO public.cms_pages (key, content)
SELECT 'contact_page', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'contact_page');

UPDATE public.cms_pages
SET content = content || '{
  "hero_badge_ar":"ابدأ بخطوة بسيطة",
  "hero_badge_en":"Start with a Simple Step",
  "title_ar":"تواصل معنا",
  "title_en":"Contact Us",
  "intro_ar":"جاهزون نسمع منك، نفهم احتياجك، ونساعدك تختار الحل الأنسب لطبيبك، عيادتك، مركزك الطبي، أو مستشفاك.",
  "intro_en":"We are ready to listen, understand your needs, and help you choose the right solution for your doctor profile, clinic, medical center, or hospital.",
  "form_title_ar":"احجز استشارة مجانية",
  "form_title_en":"Book a Free Consultation",
  "form_subtitle_ar":"أخبرنا قليلًا عن مشروعك، وسنرد عليك خلال 24 ساعة.",
  "form_subtitle_en":"Tell us a little about your project, and we will get back to you within 24 hours.",
  "trust_title_ar":"نسمع أولًا… ثم نقترح",
  "trust_title_en":"We Listen First… Then We Recommend",
  "trust_body_ar":"في MDink لا نبدأ ببيع خدمة جاهزة، بل نبدأ بفهم احتياجك الحقيقي، طبيعة تخصصك، ونوع الجمهور الذي تريد الوصول إليه.",
  "trust_body_en":"At MDink, we do not start by selling a ready-made service. We start by understanding your real needs, your specialty, and the audience you want to reach.",
  "cta_title_ar":"جاهز تبدأ مشروعك الطبي؟",
  "cta_title_en":"Ready to Start Your Medical Project?",
  "cta_subtitle_ar":"سواء كنت طبيبًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — فريق MDink جاهز يساعدك تبني حضور رقمي موثوق.",
  "cta_subtitle_en":"Whether you are a doctor, clinic, medical center, polyclinic, or hospital, MDink is ready to help you build a trusted digital presence."
}'::jsonb
WHERE key = 'contact_page';



-- ===================== 20260629170000_website_management.sql =====================

-- ============================================================
-- MDink — Website Management dashboard support
-- Adds media_library + website_activity_log (the two genuinely
-- new tables from the spec) and seeds SEO defaults.
-- Existing tables already cover the rest:
--   website page content  -> cms_pages / cms_services / portfolio_items / blogs / client_testimonials
--   submitted_reviews      -> testimonial_submissions
--   contact_requests       -> leads
-- ============================================================

-- media_library: metadata for every uploaded asset
CREATE TABLE IF NOT EXISTS public.media_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  storage_path text,
  filename text,
  file_type text,
  mime_type text,
  size bigint,
  alt_ar text,
  alt_en text,
  used_in text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.media_library TO anon, authenticated;
GRANT ALL ON public.media_library TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read media_library" ON public.media_library;
CREATE POLICY "Public read media_library" ON public.media_library
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage media_library" ON public.media_library;
CREATE POLICY "Admins manage media_library" ON public.media_library
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- website_activity_log: audit trail for website-content edits
CREATE TABLE IF NOT EXISTS public.website_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text,
  page_key text,
  item_type text,
  item_id text,
  before_json jsonb,
  after_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.website_activity_log ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.website_activity_log TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins read activity" ON public.website_activity_log;
CREATE POLICY "Admins read activity" ON public.website_activity_log
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins insert activity" ON public.website_activity_log;
CREATE POLICY "Admins insert activity" ON public.website_activity_log
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

-- Seed SEO defaults (idempotent — only inserts a row if the page has none)
-- [auto-guard]
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS page_key text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_title_ar text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS meta_title_en text;
ALTER TABLE public.seo_settings ADD COLUMN IF NOT EXISTS robots text NOT NULL DEFAULT 'index,follow';
INSERT INTO public.seo_settings (page_key, meta_title_ar, meta_title_en, robots)
SELECT v.page_key, v.ar, v.en, 'index,follow'
FROM (VALUES
  ('home',     'MDink for Digital Solutions', 'MDink for Digital Solutions'),
  ('services', 'خدماتنا — MDink Solutions',   'Services — MDink Solutions'),
  ('portfolio','أعمالنا — MDink Solutions',   'Portfolio — MDink Solutions'),
  ('reviews',  'آراء عملائنا — MDink Solutions','Client Reviews — MDink Solutions'),
  ('blog',     'المدونة — MDink Solutions',    'Blog — MDink Solutions'),
  ('about',    'من نحن — MDink Solutions',     'About Us — MDink Solutions'),
  ('contact',  'تواصل معنا — MDink Solutions', 'Contact Us — MDink Solutions')
) AS v(page_key, ar, en)
WHERE NOT EXISTS (SELECT 1 FROM public.seo_settings s WHERE s.page_key = v.page_key);

-- Ensure the homepage title is EXACTLY the required string
UPDATE public.seo_settings
SET meta_title_ar = 'MDink for Digital Solutions',
    meta_title_en = 'MDink for Digital Solutions'
WHERE page_key = 'home'
  AND (meta_title_ar IS NULL OR meta_title_ar = '' OR meta_title_ar = 'MDink Solutions');


-- ===================== 20260629180000_operations_financial_hardening.sql =====================

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
-- [uniq-guard] public.permissions (permission_key)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace
    WHERE n.nspname='public' AND t.relname='permissions' AND c.contype IN ('p','u')
      AND (SELECT array_agg(a.attname ORDER BY a.attname) FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k)
          = (SELECT array_agg(x ORDER BY x) FROM unnest(ARRAY['permission_key']) x)
  ) THEN
    BEGIN ALTER TABLE public.permissions ADD CONSTRAINT permissions_permission_key_uq UNIQUE (permission_key);
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
END $$;
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
