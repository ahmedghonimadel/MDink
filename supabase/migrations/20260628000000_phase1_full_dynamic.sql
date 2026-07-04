-- ============================================================
-- MDink — Phase 1: Full Dynamic Control
-- يكمل كل الحقول الناقصة عشان لوحة التحكم تتحكم في كل نقطة
-- ============================================================

-- 1) توسيع cms_pages/home بكل الأقسام الديناميكية
-- (services_json, advantages_json, stats_json, dashboard_card_json, sections order/visibility)
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
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.seo_settings TO anon, authenticated;
GRANT ALL ON public.seo_settings TO authenticated, service_role;
DROP POLICY IF EXISTS "Public read seo settings" ON public.seo_settings;
CREATE POLICY "Public read seo settings" ON public.seo_settings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admins manage seo settings" ON public.seo_settings;
CREATE POLICY "Admins manage seo settings" ON public.seo_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

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
CREATE POLICY "Admins read audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id OR public.is_admin(auth.uid()));

-- 13) Storage bucket للملفات والصور (لو مش موجود)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mdink-media', 'mdink-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: قراءة عامة، رفع للأدمن فقط
DROP POLICY IF EXISTS "Public read mdink media" ON storage.objects;
CREATE POLICY "Public read mdink media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'mdink-media');
DROP POLICY IF EXISTS "Admins upload mdink media" ON storage.objects;
CREATE POLICY "Admins upload mdink media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'mdink-media' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update mdink media" ON storage.objects;
CREATE POLICY "Admins update mdink media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'mdink-media' AND public.is_admin(auth.uid()));
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
CREATE POLICY "Public create consultations" ON public.free_consultations FOR INSERT TO anon, authenticated WITH CHECK (true);
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
