-- ============================================================
-- MDink Solutions — page_sections safety migration
-- جدول page_sections هو العمود الفقري لـCMS الصفحات (hero/why/system/
-- blog intro/about ...). الكود يقرأ ويكتب فيه عبر upsert بـ onConflict
-- على (page_slug, section_key)، لذا وجود القيد الفريد شرط أساسي.
-- هذا الملف دفاعي: ينشئ الجدول/الأعمدة/القيد فقط إن لم توجد. idempotent.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  section_key text NOT NULL,
  title text,
  subtitle text,
  video_url text,
  content_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_visible boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- تأكيد وجود كل عمود يعتمد عليه الكود (للتوافق مع أي بنية سابقة)
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS title text;
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS content_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.page_sections ADD COLUMN IF NOT EXISTS display_order int NOT NULL DEFAULT 0;

-- القيد الفريد الذي يعتمد عليه upsert(onConflict: page_slug,section_key)
-- نتحقق من وجود أي قيد unique على نفس العمودين (بأي اسم) قبل الإضافة،
-- لأن SUPABASE_SETUP.sql قد ينشئه باسم تلقائي مختلف.
DO $$
DECLARE
  has_unique boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = rel.relnamespace
    WHERE ns.nspname = 'public'
      AND rel.relname = 'page_sections'
      AND con.contype = 'u'
      AND con.conkey @> ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'page_slug'),
        (SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'section_key')
      ]::smallint[]
  ) INTO has_unique;

  IF NOT has_unique THEN
    -- نظّف أي تكرارات محتملة قبل إضافة القيد
    DELETE FROM public.page_sections a USING public.page_sections b
      WHERE a.ctid < b.ctid
        AND a.page_slug = b.page_slug
        AND a.section_key = b.section_key;
    ALTER TABLE public.page_sections
      ADD CONSTRAINT page_sections_page_section_key UNIQUE (page_slug, section_key);
  END IF;
END $$;

-- RLS: قراءة عامة للأقسام الظاهرة، تعديل للأدمن فقط
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.page_sections TO anon, authenticated;
GRANT ALL ON public.page_sections TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read visible sections" ON public.page_sections;
CREATE POLICY "Public read visible sections" ON public.page_sections
  FOR SELECT TO anon, authenticated
  USING (is_visible OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage sections" ON public.page_sections;
CREATE POLICY "Admins manage sections" ON public.page_sections
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_page_sections_slug ON public.page_sections (page_slug, section_key);
