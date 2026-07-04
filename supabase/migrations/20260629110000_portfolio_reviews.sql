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
CREATE POLICY "Public read published client testimonials" ON public.client_testimonials
  FOR SELECT TO anon, authenticated
  USING (is_published OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage client testimonials" ON public.client_testimonials;
CREATE POLICY "Admins manage client testimonials" ON public.client_testimonials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- Seed a few starter client reviews (editable from dashboard later)
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
