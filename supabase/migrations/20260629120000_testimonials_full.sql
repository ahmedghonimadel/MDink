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
CREATE POLICY "Anyone can submit a review" ON public.testimonial_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (consent = true);

DROP POLICY IF EXISTS "Admins read submissions" ON public.testimonial_submissions;
CREATE POLICY "Admins read submissions" ON public.testimonial_submissions
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage submissions" ON public.testimonial_submissions;
CREATE POLICY "Admins manage submissions" ON public.testimonial_submissions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 3) Seed the real testimonials (replace the placeholder seed rows)
DELETE FROM public.client_testimonials
WHERE name_ar IN ('د. علام','عيادة هو','عيادتي','د. عزيزة','أميرة منقوش','Mero Abdallah','د. أميرة المنقوش','Dr. Ragab Allam');

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
   NULL, NULL, 5, 'image', '/testimonials/amira-almangoush-review.png', '/testimonials/amira-almangoush-review.png',
   NULL, 'facebook', true, false, false, true, 30),

  -- Written 2: Dr. Ragab Allam
  ('Dr. Ragab Allam','Dr. Ragab Allam','جهة طبية','Medical Professional',
   'رأي د. رجب علام','Dr. Ragab Allam Review',
   'توضح هذه الشهادة احترافية MDink، الالتزام بالمواعيد، والمتابعة المستمرة، مع فهم عميق للتسويق الطبي.',
   'This testimonial reflects MDink''s professionalism, commitment to deadlines, continuous follow-up, and deep understanding of medical marketing.',
   'شركة MDink for Digital Solutions أثبتت على مدار ما يقارب 5 سنوات مستوى عالي جدًا من الاحترافية والالتزام في العمل. الفريق يتميز بفهم عميق للتسويق الطبي، وده شيء نادر ومهم جدًا لأي جهة طبية تبحث عن التميز. التزام واضح بالمواعيد، متابعة مستمرة لكل التفاصيل، تطوير دائم في الأداء والاستراتيجيات، وتعامل راقي واحترافي من د شيماء. بصراحة، هم ليسوا مجرد شركة تسويق، بل شركاء نجاح حقيقيين. أي شخص أو مؤسسة تبحث عن نتائج حقيقية في التسويق الطبي، فـ MDink هي الاختيار الصحيح بدون تردد.',
   'MDink for Digital Solutions has proven, over nearly 5 years, a very high level of professionalism and commitment. The team has a deep understanding of medical marketing — rare and valuable for any medical organization seeking excellence. Clear commitment to deadlines, continuous attention to every detail, ongoing development in performance and strategy, and refined professional dealing from Dr. Shaima. Honestly, they are not just a marketing company but real success partners. Anyone seeking real results in medical marketing — MDink is the right choice without hesitation.',
   NULL, NULL, 5, 'image', '/testimonials/ragab-allam-review.png', '/testimonials/ragab-allam-review.png',
   NULL, 'facebook', true, true, false, true, 40);
