-- ============================================================
-- MDink Solutions — Testimonials tables (video + written)
-- تعرّف الجدولين اللذين تقرأ منهما صفحة الآراء والداشبورد.
-- آمنة لإعادة التشغيل (idempotent).
-- ============================================================

-- ---------- 1) شهادات الفيديو ----------
CREATE TABLE IF NOT EXISTS public.video_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_title text,
  client_specialty text,
  video_url text NOT NULL,
  video_media_id uuid,
  thumbnail_image_id uuid,
  thumbnail_url text,
  rating int DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- أعمدة اختيارية إضافية (تُضاف فقط إن لم توجد — للتوافق مع أي بنية سابقة)
ALTER TABLE public.video_testimonials ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.video_testimonials ADD COLUMN IF NOT EXISTS short_text text;

ALTER TABLE public.video_testimonials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.video_testimonials TO anon, authenticated;
GRANT ALL ON public.video_testimonials TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read active video testimonials" ON public.video_testimonials;
CREATE POLICY "Public read active video testimonials" ON public.video_testimonials
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage video testimonials" ON public.video_testimonials;
CREATE POLICY "Admins manage video testimonials" ON public.video_testimonials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- 2) الآراء المكتوبة ----------
CREATE TABLE IF NOT EXISTS public.written_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  client_title text,
  client_specialty text,
  profile_image_id uuid,
  profile_image_url text,
  review_image_id uuid,
  review_image_url text,
  review_text text NOT NULL,
  original_post_url text,
  button_text text,
  rating int DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.written_testimonials ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

ALTER TABLE public.written_testimonials ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.written_testimonials TO anon, authenticated;
GRANT ALL ON public.written_testimonials TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read active written testimonials" ON public.written_testimonials;
CREATE POLICY "Public read active written testimonials" ON public.written_testimonials
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage written testimonials" ON public.written_testimonials;
CREATE POLICY "Admins manage written testimonials" ON public.written_testimonials
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ---------- 3) فهارس ----------
CREATE INDEX IF NOT EXISTS idx_video_testi_active ON public.video_testimonials (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_written_testi_active ON public.written_testimonials (is_active, display_order);

-- ---------- 4) بذور أولية للآراء المكتوبة (قابلة للتعديل من الداشبورد) ----------
INSERT INTO public.written_testimonials
  (client_name, client_specialty, review_text, rating, display_order, is_featured, is_verified)
SELECT * FROM (VALUES
  ('د. علام', 'استشاري قلب',
   'فريق MDink بنى لي موقعًا احترافيًا سهّل على مرضاي الوصول لي والحجز بسرعة. النتائج كانت واضحة من أول شهر.',
   5, 10, true, true),
  ('عيادة هوا', 'عيادة نسائية',
   'تنظيم المحتوى والظهور في نتائج البحث فرق كتير معانا. تعامل مهني والتزام بالمواعيد.',
   5, 20, true, true)
) AS v(client_name, client_specialty, review_text, rating, display_order, is_featured, is_verified)
WHERE NOT EXISTS (SELECT 1 FROM public.written_testimonials);
