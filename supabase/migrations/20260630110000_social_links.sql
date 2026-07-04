-- ============================================================
-- MDink Solutions — social_links table + correct ordering
-- الصفحة العامة وداشبورد التواصل يقرآن/يكتبان في social_links.
-- الترتيب المطلوب: واتساب ← LinkedIn ← إنستجرام (وبينهم فيسبوك).
-- آمن لإعادة التشغيل (idempotent).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.social_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  label text,
  username text,
  url text NOT NULL,
  icon text,
  display_order int NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- قيد فريد على platform لتمكين الزرع الآمن
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'social_links_platform_key'
      AND conrelid = 'public.social_links'::regclass
  ) THEN
    ALTER TABLE public.social_links ADD CONSTRAINT social_links_platform_key UNIQUE (platform);
  END IF;
END $$;

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.social_links TO anon, authenticated;
GRANT ALL ON public.social_links TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read active social links" ON public.social_links;
CREATE POLICY "Public read active social links" ON public.social_links
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage social links" ON public.social_links;
CREATE POLICY "Admins manage social links" ON public.social_links
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- الترتيب المطلوب: واتساب(10) ← LinkedIn(20) ← إنستجرام(30) ← فيسبوك(40)
-- LinkedIn يقع بعد واتساب وقبل إنستجرام كما هو مطلوب.
INSERT INTO public.social_links (platform, label, username, url, icon, display_order, is_active) VALUES
  ('whatsapp',  'واتساب',  '010 15587495', 'https://wa.me/201015587495',                    'MessageCircle', 10, true),
  ('linkedin',  'لينكدإن', 'MDink',        'https://www.linkedin.com/company/mdink/',        'Linkedin',      20, true),
  ('instagram', 'إنستجرام','mdink',        'https://www.instagram.com/mdinksolutions',       'Instagram',     30, true),
  ('facebook',  'فيسبوك',  'MDink Solutions','https://www.facebook.com/MDinksolutions',      'Facebook',      40, true)
ON CONFLICT (platform) DO UPDATE
  SET display_order = EXCLUDED.display_order,
      icon = EXCLUDED.icon;

CREATE INDEX IF NOT EXISTS idx_social_links_active ON public.social_links (is_active, display_order);
