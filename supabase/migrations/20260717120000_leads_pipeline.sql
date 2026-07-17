-- مسار الطلبات (Leads) → تحويل لعميل
-- 1) عمود «المصدر» (فيسبوك/واتساب/إحالة/…) للطلبات اليدوية
-- 2) عمود «converted_client_id» لربط الطلب بالعميل الناتج ومنع التحويل المكرر
-- 3) توحيد قيد الحالة بين جداول الطلبات الثلاثة على مفردات موحّدة تطابق الواجهة
--    (كانت مختلفة، فحالات مثل interested/postponed/agreed كانت تفشل عند الحفظ)
-- آمن للتشغيل المتكرر (idempotent).

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contact_submissions', 'doctor_applications', 'consultations'] LOOP
    -- الأعمدة الجديدة
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS source text', t);
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS converted_client_id uuid', t);

    -- توحيد قيد الحالة (نُسقط القيد القديم أياً كان اسمه ثم نضيف الموحّد)
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', t, t || '_status_check');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (status IN (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%L))',
      t, t || '_status_check',
      'new', 'contacted', 'interested', 'postponed', 'in_progress', 'reviewing',
      'approved', 'rejected', 'agreed', 'converted', 'closed', 'lost'
    );
  END LOOP;
END $$;

-- فهرس بسيط للبحث بالمصدر (اختياري لكنه مفيد للفلترة)
CREATE INDEX IF NOT EXISTS idx_contact_submissions_source ON public.contact_submissions (source);
