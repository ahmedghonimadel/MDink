
CREATE TABLE public.site_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT ALL ON public.site_config TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.site_config TO authenticated;

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read site_config"
  ON public.site_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert site_config"
  ON public.site_config FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update site_config"
  ON public.site_config FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete site_config"
  ON public.site_config FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_site_config_updated_at
  BEFORE UPDATE ON public.site_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
