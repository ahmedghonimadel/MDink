-- Final delivery hardening and feature tables for MDink.

CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  full_name text NOT NULL,
  role public.app_role NOT NULL DEFAULT 'super_admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;

DROP POLICY IF EXISTS "Admins read admin_allowlist" ON public.admin_allowlist;
CREATE POLICY "Admins read admin_allowlist"
  ON public.admin_allowlist FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

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

  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, v_username, v_fullname, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT role INTO v_role
  FROM public.admin_allowlist
  WHERE lower(email) = lower(NEW.email);

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
CREATE POLICY "Public read published portfolio_items" ON public.portfolio_items
  FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage portfolio_items" ON public.portfolio_items;
CREATE POLICY "Admins manage portfolio_items" ON public.portfolio_items
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published reel_campaigns" ON public.reel_campaigns;
CREATE POLICY "Public read published reel_campaigns" ON public.reel_campaigns
  FOR SELECT TO anon, authenticated USING (is_published OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage reel_campaigns" ON public.reel_campaigns;
CREATE POLICY "Admins manage reel_campaigns" ON public.reel_campaigns
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can submit consultations" ON public.consultations;
CREATE POLICY "Anyone can submit consultations" ON public.consultations
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
CREATE POLICY "Admins manage consultations" ON public.consultations
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage client_payments" ON public.client_payments;
CREATE POLICY "Admins manage client_payments" ON public.client_payments
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read published doctor_gallery" ON public.doctor_gallery;
CREATE POLICY "Public read published doctor_gallery" ON public.doctor_gallery
  FOR SELECT TO anon, authenticated USING (is_published OR auth.uid() = doctor_id OR public.is_admin(auth.uid()));
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

INSERT INTO public.portfolio_items (title, slug, client_name, specialty, description, website_url, image_url, metrics, is_featured, sort_order) VALUES
  ('Allam Heart Care Center', 'allam-heart-care-center', 'Allam Heart Care Center', 'Cardiology', 'منصة طبية احترافية لعيادة قلب مع تجربة واضحة للحجز والتواصل.', 'https://allamheartcare.com', '', '{"result":"موقع طبي سريع ومهيأ للسيو"}', true, 10),
  ('Howa Clinics', 'howa-clinics', 'Howa Clinics', 'Andrology', 'حضور رقمي طبي موجه لمحركات البحث والتحويل المباشر عبر واتساب.', 'https://howaclinic.com', '', '{"result":"تحسين الظهور في Google"}', true, 20),
  ('Seniors Clinic', 'seniors-clinic', 'Seniors Clinic', 'Geriatrics', 'واجهة طبية راقية لخدمات رعاية كبار السن مع محتوى منظم وسهل التصفح.', 'https://seniors-clinic.com/en/home/', '', '{"result":"تجربة مستخدم موثوقة"}', true, 30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.reel_campaigns (title, platform, reel_url, views, likes, comments, notes, sort_order) VALUES
  ('Viral Reel - Campaign 01', 'instagram', 'https://www.instagram.com/reel/DNyFBP1WNB9/', 0, 0, 0, 'الأرقام تحدث يدويًا من لوحة الأدمن', 10),
  ('Viral Reel - Campaign 02', 'instagram', 'https://www.instagram.com/reel/DNqZxjqMybo/', 0, 0, 0, 'الأرقام تحدث يدويًا من لوحة الأدمن', 20)
ON CONFLICT DO NOTHING;
