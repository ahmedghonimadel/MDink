-- ============================================================
-- MDink Solutions — Reviews: homepage feature flag + safe public submissions
-- 1) show_on_home: يقرر الأدمن أي رأي يظهر في الصفحة الرئيسية.
-- 2) يسمح للزوّار (anon) بإرسال رأي (نص/صورة/فيديو) كـ pending فقط
--    (is_active=false, is_verified=false, show_on_home=false) — لا يظهر أي
--    محتوى قبل موافقة الأدمن (سياسات القراءة العامة تعرض is_active فقط).
-- 3) يسمح بالصور/الفيديو بدون نص (review_text أصبح اختياريًا).
-- آمنة لإعادة التشغيل (idempotent).
-- ============================================================

-- ---------- 1) show_on_home على الجدولين ----------
ALTER TABLE public.video_testimonials   ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;
ALTER TABLE public.written_testimonials ADD COLUMN IF NOT EXISTS show_on_home boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_video_testi_home   ON public.video_testimonials   (show_on_home, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_written_testi_home ON public.written_testimonials (show_on_home, is_active, display_order);

-- ---------- 2) اجعل نص الرأي المكتوب اختياريًا (للسماح برأي صورة فقط) ----------
ALTER TABLE public.written_testimonials ALTER COLUMN review_text DROP NOT NULL;

-- ---------- 3) صلاحيات إدراج للزوّار (anon) — pending فقط ----------
-- منح INSERT (القراءة/الإدارة ممنوحة مسبقًا). anon يملك SELECT فقط قبل الآن.
GRANT INSERT ON public.written_testimonials TO anon;
GRANT INSERT ON public.video_testimonials   TO anon;

-- رأي مكتوب/صورة: الزائر يقدر يُدرج صفًّا معلّقًا فقط (لن يظهر قبل الموافقة)
DROP POLICY IF EXISTS "Anon submit pending written testimonial" ON public.written_testimonials;
CREATE POLICY "Anon submit pending written testimonial" ON public.written_testimonials
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_active = false AND is_verified = false AND show_on_home = false);

-- شهادة فيديو مُرسَلة: نفس القاعدة — pending فقط
DROP POLICY IF EXISTS "Anon submit pending video testimonial" ON public.video_testimonials;
CREATE POLICY "Anon submit pending video testimonial" ON public.video_testimonials
  FOR INSERT TO anon, authenticated
  WITH CHECK (is_active = false AND is_verified = false AND show_on_home = false);

-- ملاحظة: سياسات "Public read active ..." الموجودة تعرض للعامة الصفوف الظاهرة
-- فقط (is_active OR is_admin)، لذا الآراء المُرسَلة تبقى مخفية حتى موافقة الأدمن.
