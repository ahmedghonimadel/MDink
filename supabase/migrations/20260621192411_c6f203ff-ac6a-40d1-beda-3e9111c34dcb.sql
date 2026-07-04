
-- Blogs table
CREATE TABLE public.blogs (
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
GRANT SELECT ON public.blogs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blogs TO authenticated;
GRANT ALL ON public.blogs TO service_role;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read published blogs" ON public.blogs FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage blogs" ON public.blogs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_blogs_updated BEFORE UPDATE ON public.blogs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dynamic Links table
CREATE TABLE public.dynamic_links (
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
CREATE POLICY "Public can read active links" ON public.dynamic_links FOR SELECT TO anon, authenticated USING (is_active OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage links" ON public.dynamic_links FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER trg_links_updated BEFORE UPDATE ON public.dynamic_links FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed site_config (idempotent)
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
INSERT INTO public.dynamic_links (title, subtitle, url, platform_type, accent_color, sort_order) VALUES
  ('Allam Heart Care Center', 'منصة متقدمة لطب القلب', 'https://allamheartcare.com', 'web', '#E63946', 10),
  ('Howa Clinics',            'الصدارة على Google – طب ذكوري', 'https://howaclinic.com', 'web', '#0077B6', 20),
  ('Seniors Clinic',          'منصة رعاية كبار السن الفاخرة', 'https://seniors-clinic.com/en/home/', 'web', '#06B6A4', 30),
  ('Viral Reel — Campaign 01', 'حملة محتوى طبي فيروسي', 'https://www.instagram.com/reel/DNyFBP1WNB9/', 'instagram', '#1A44B3', 40),
  ('Viral Reel — Campaign 02', 'محتوى توعوي عالي التفاعل', 'https://www.instagram.com/reel/DNqZxjqMybo/', 'instagram', '#1A44B3', 50)
ON CONFLICT DO NOTHING;

-- Seed a starter blog post so the page isn't empty
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
