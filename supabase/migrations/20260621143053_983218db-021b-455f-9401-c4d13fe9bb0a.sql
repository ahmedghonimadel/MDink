
-- Roles enum and table
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'doctor');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
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

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published profiles" ON public.profiles FOR SELECT TO anon, authenticated
  USING (is_published = true OR auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "Doctor manages own profile" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Clinics
CREATE TABLE public.clinics (
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
CREATE POLICY "Public read clinics" ON public.clinics FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Doctor manages own clinics" ON public.clinics FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_clinics_updated BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Services
CREATE TABLE public.services (
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
CREATE POLICY "Public read services" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Doctor manages own services" ON public.services FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Testimonials
CREATE TABLE public.testimonials (
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
CREATE POLICY "Public read approved testimonials" ON public.testimonials FOR SELECT TO anon, authenticated
  USING (is_approved = true OR auth.uid() = doctor_id OR public.is_admin(auth.uid()));
CREATE POLICY "Doctor manages own testimonials" ON public.testimonials FOR ALL TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));

-- Content calendar
CREATE TABLE public.content_calendar (
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
CREATE POLICY "Doctor reads own calendar" ON public.content_calendar FOR SELECT TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
CREATE POLICY "Doctor updates own calendar status" ON public.content_calendar FOR UPDATE TO authenticated
  USING (auth.uid() = doctor_id OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = doctor_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins create calendar entries" ON public.content_calendar FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "Admins delete calendar entries" ON public.content_calendar FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));
CREATE TRIGGER trg_calendar_updated BEFORE UPDATE ON public.content_calendar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Leads
CREATE TABLE public.leads (
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
CREATE POLICY "Anyone can submit leads" ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Admins read leads" ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins update leads" ON public.leads FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
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
  INSERT INTO public.profiles (id, username, full_name, email)
  VALUES (NEW.id, v_username, v_fullname, NEW.email);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'doctor');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
