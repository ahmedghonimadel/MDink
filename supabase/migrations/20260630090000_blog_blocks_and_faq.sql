-- ============================================================
-- MDink Solutions — Blog Blocks + FAQ system
-- يضيف نظام بلوكات المحتوى (JSONB) وFAQ لجدول blog_posts،
-- ويؤكد وجود التصنيفات الأساسية. آمن لإعادة التشغيل (idempotent).
-- ============================================================

-- ---------- 1) أعمدة البلوكات وFAQ على blog_posts ----------
-- content_blocks: مصفوفة بلوكات منظمة (heading/paragraph/list/note/image/video/cta/faq)
-- هي المصدر الأساسي للعرض؛ عمود content النصي القديم يبقى للتوافق الرجعي.
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_blocks jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS content_blocks_en jsonb NOT NULL DEFAULT '[]'::jsonb;

-- faq: مصفوفة { q, a } مستقلة لإخراج structured data (FAQPage) للـSEO
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb;

-- keywords: سلسلة كلمات مفتاحية للـSEO (كانت مذكورة في المقالات)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS keywords text;

-- views_count: عدّاد المشاهدات (تحسين مطلوب في المتطلبات)
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0;

-- ---------- 2) دالة زيادة المشاهدات بأمان (RPC) ----------
-- تُستدعى من الواجهة عند فتح المقال؛ SECURITY DEFINER لتخطّي RLS للكتابة المحدودة.
CREATE OR REPLACE FUNCTION public.increment_blog_views(post_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE slug = post_slug AND is_published = true;
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_views(text) TO anon, authenticated;

-- ---------- 3) تأكيد التصنيفات الأساسية ----------
-- أعمدة الوصف (تظهر كصندوق تعريف عند اختيار التصنيف في المدونة العامة)
ALTER TABLE public.blog_categories
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.blog_categories
  ADD COLUMN IF NOT EXISTS description_en text;

-- التصنيفات الخمسة المتوافقة مع مقالات MDink. آمنة عبر ON CONFLICT على slug.
-- (تفترض وجود قيد فريد على blog_categories.slug — نضيفه إن لم يوجد)
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
      AND rel.relname = 'blog_categories'
      AND con.contype = 'u'
      AND con.conkey = ARRAY[
        (SELECT attnum FROM pg_attribute WHERE attrelid = rel.oid AND attname = 'slug')
      ]::smallint[]
  ) INTO has_unique;

  IF NOT has_unique THEN
    ALTER TABLE public.blog_categories
      ADD CONSTRAINT blog_categories_slug_key UNIQUE (slug);
  END IF;
END $$;

INSERT INTO public.blog_categories (name, name_en, slug, description, display_order, is_active) VALUES
  ('التسويق الطبي',  'Medical Marketing',  'medical-marketing',  'مقالات عملية في تسويق العيادات والمستشفيات رقميًا وبناء حضور طبي موثوق.', 1, true),
  ('المواقع الطبية', 'Medical Websites',   'medical-websites',   'كل ما يخص المواقع الطبية الاحترافية: التصميم، تجربة المريض، والحجز.',   2, true),
  ('إدارة العيادات', 'Clinic Management',  'clinic-management',  'أنظمة وأدوات تنظيم العيادة وتقليل الضغط اليومي وتحسين تجربة المريض.',   3, true),
  ('SEO طبي',        'Medical SEO',        'medical-seo',        'كيف يظهر الطبيب على جوجل باحترافية ويصل لمرضاه في اللحظة المناسبة.',    4, true),
  ('المحتوى الطبي',  'Medical Content',    'medical-content',    'صناعة محتوى طبي يبني ثقة المريض قبل أول تواصل ويؤكد خبرة الطبيب.',      5, true)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      name_en = EXCLUDED.name_en,
      description = COALESCE(public.blog_categories.description, EXCLUDED.description),
      display_order = EXCLUDED.display_order,
      is_active = true;

-- ---------- 4) إزالة تصنيف "رحلة المريض" المرفوض إن وُجد ----------
-- ننقل أي مقالات مرتبطة به إلى "المحتوى الطبي" ثم نحذف التصنيف.
DO $$
DECLARE
  patient_journey_id uuid;
  medical_content_id uuid;
BEGIN
  SELECT id INTO patient_journey_id FROM public.blog_categories
    WHERE name ILIKE '%رحلة المريض%' OR slug ILIKE '%patient-journey%' LIMIT 1;
  SELECT id INTO medical_content_id FROM public.blog_categories
    WHERE slug = 'medical-content' LIMIT 1;

  IF patient_journey_id IS NOT NULL THEN
    IF medical_content_id IS NOT NULL THEN
      UPDATE public.blog_posts
        SET category_id = medical_content_id
        WHERE category_id = patient_journey_id;
    END IF;
    DELETE FROM public.blog_categories WHERE id = patient_journey_id;
  END IF;
END $$;

-- ---------- 5) فهارس مساعدة للأداء ----------
CREATE INDEX IF NOT EXISTS idx_blog_posts_published
  ON public.blog_posts (is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug
  ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category
  ON public.blog_posts (category_id);
