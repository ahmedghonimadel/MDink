-- مسمّى مخصص يظهر تحت اسم العضو في البطاقة العامة (يحل محل الدور/شارة المؤسِّس).
-- مطبَّق مباشرة على القاعدة الحية عبر Management API؛ هذا الملف يوثّقه.
ALTER TABLE public.team_profiles ADD COLUMN IF NOT EXISTS display_title text;
