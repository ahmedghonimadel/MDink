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
