-- ============================================================
-- MDink Solutions — Add missing English (_en) columns
-- Several admin forms already collect English variants but had no
-- column to write to, so the English input was silently dropped.
-- This adds the columns; the app is updated in the same commit to
-- persist and consume them per locale.
-- آمنة لإعادة التشغيل (idempotent).
-- ============================================================

-- ---------- site_settings ----------
-- footer_about_text (AR) existed only in an old key/value `settings` table
-- but not on `site_settings`; add it now alongside its EN variant.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS brand_name_en text,
  ADD COLUMN IF NOT EXISTS footer_about_text text,
  ADD COLUMN IF NOT EXISTS footer_about_text_en text;

-- ---------- social_links ----------
ALTER TABLE public.social_links
  ADD COLUMN IF NOT EXISTS label_en text;

-- ---------- testimonials (video + written) ----------
ALTER TABLE public.video_testimonials
  ADD COLUMN IF NOT EXISTS client_name_en text,
  ADD COLUMN IF NOT EXISTS client_title_en text,
  ADD COLUMN IF NOT EXISTS client_specialty_en text;

ALTER TABLE public.written_testimonials
  ADD COLUMN IF NOT EXISTS client_name_en text,
  ADD COLUMN IF NOT EXISTS client_title_en text,
  ADD COLUMN IF NOT EXISTS client_specialty_en text,
  ADD COLUMN IF NOT EXISTS review_text_en text;
