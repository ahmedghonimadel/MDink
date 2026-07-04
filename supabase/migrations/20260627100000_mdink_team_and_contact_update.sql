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
CREATE POLICY "Public read visible team_members"
  ON public.team_members FOR SELECT TO anon, authenticated
  USING (is_visible OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage team_members" ON public.team_members;
CREATE POLICY "Admins manage team_members"
  ON public.team_members FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP TRIGGER IF EXISTS trg_team_members_updated ON public.team_members;
CREATE TRIGGER trg_team_members_updated
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.team_members (full_name, role_title, email, image_url, bio, sort_order, is_visible) VALUES
  ('Shaimaa Fahmy', 'Founder / Super Admin', 'shfahmy2010@gmail.com', '', 'تقود MDink كرؤية رقمية متخصصة في المواقع الطبية والتسويق الرقمي للأطباء والعيادات.', 10, true)
ON CONFLICT DO NOTHING;
