-- (1) دور «محاسب» بصلاحية مالية مستقلة  +  (2) إشعار تلقائي عند وصول طلب جديد من الموقع
-- آمن للتشغيل المتكرر (idempotent).

-- ── 1) توسيع أدوار admin_users ليشمل «accountant» ──
ALTER TABLE public.admin_users DROP CONSTRAINT IF EXISTS admin_users_role_check;
ALTER TABLE public.admin_users
  ADD CONSTRAINT admin_users_role_check CHECK (role IN ('admin', 'editor', 'viewer', 'accountant'));

-- دالة: هل المستخدم محاسب نشط؟
CREATE OR REPLACE FUNCTION public.is_accountant(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = _uid AND role = 'accountant' AND is_active
  );
$$;

-- المحاسب: قراءة العملاء + قراءة/تعديل حالة الدفع، وإدارة سجلات المدفوعات (إضافية للسياسات الحالية)
DROP POLICY IF EXISTS "Accountant read clients" ON public.clients;
CREATE POLICY "Accountant read clients" ON public.clients
  FOR SELECT TO authenticated USING (public.is_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant update clients" ON public.clients;
CREATE POLICY "Accountant update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.is_accountant(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()));

DROP POLICY IF EXISTS "Accountant manage payments" ON public.client_payments;
CREATE POLICY "Accountant manage payments" ON public.client_payments
  FOR ALL TO authenticated
  USING (public.is_accountant(auth.uid())) WITH CHECK (public.is_accountant(auth.uid()));

-- ── 2) إشعار الإدارة عند وصول طلب جديد من الموقع ──
-- SECURITY DEFINER لتجاوز RLS على notifications (العميل العام لا يملك صلاحية الإدراج).
-- يُشعِر فقط الطلبات القادمة من الموقع (source فارغ)، لا الطلبات اليدوية التي يضيفها الأدمن.
CREATE OR REPLACE FUNCTION public.notify_admins_new_lead()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE
  admin_id  uuid;
  src_label text;
BEGIN
  IF NEW.source IS NOT NULL THEN
    RETURN NEW; -- طلب يدوي من الأدمن — لا حاجة لإشعار
  END IF;

  src_label := CASE TG_TABLE_NAME
    WHEN 'contact_submissions' THEN 'طلب تواصل'
    WHEN 'doctor_applications' THEN 'طلب طبيب'
    WHEN 'consultations'       THEN 'استشارة مجانية'
    ELSE 'طلب جديد'
  END;

  FOR admin_id IN
    SELECT user_id FROM public.admin_users
      WHERE role = 'admin' AND is_active AND user_id IS NOT NULL
    UNION
    SELECT id FROM auth.users
      WHERE lower(email) IN ('shfahmy2010@gmail.com', 'tasneemfahmy21@gmail.com')
  LOOP
    -- أعمدة الجدول الحي: recipient_user_id/title/message/type (وجهة النقر تُشتقّ من type='lead')
    INSERT INTO public.notifications (recipient_user_id, title, message, type)
    VALUES (admin_id, src_label || ' جديد من الموقع', COALESCE(NEW.full_name, 'طلب جديد'), 'lead');
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_lead_contact ON public.contact_submissions;
CREATE TRIGGER trg_notify_lead_contact
  AFTER INSERT ON public.contact_submissions
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_lead();

DROP TRIGGER IF EXISTS trg_notify_lead_doctor ON public.doctor_applications;
CREATE TRIGGER trg_notify_lead_doctor
  AFTER INSERT ON public.doctor_applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_lead();

DROP TRIGGER IF EXISTS trg_notify_lead_consult ON public.consultations;
CREATE TRIGGER trg_notify_lead_consult
  AFTER INSERT ON public.consultations
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_lead();
