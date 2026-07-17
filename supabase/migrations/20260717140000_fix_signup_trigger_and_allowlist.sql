-- إصلاح: إنشاء أي مستخدم كان يفشل بـ "Database error creating new user".
-- السبب: دوال على auth.users (handle_new_user) و user_roles
-- (prevent_protected_super_admin_role_change) و is_admin كانت تشير إلى جدول
-- public.admin_allowlist المفقود → خطأ "relation does not exist" يوقف الإنشاء.
--
-- الحل: (1) إعادة إنشاء admin_allowlist وتعبئته بالإدارة العليا،
--        (2) جعل handle_new_user مقاومًا للأخطاء فلا يُسقط إنشاء المستخدم أبدًا.
-- طُبِّق مباشرة على قاعدة البيانات الحية عبر Management API؛ هذا الملف يوثّقه.

-- (1) استعادة جدول القائمة البيضاء المفقود
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  role public.app_role NOT NULL DEFAULT 'super_admin'
);
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;

INSERT INTO public.admin_allowlist (email, role) VALUES
  ('shfahmy2010@gmail.com', 'super_admin'),
  ('tasneemfahmy21@gmail.com', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- (2) trigger إنشاء المستخدم — مقاوم للأخطاء (لا يُسقط الإنشاء مهما حدث)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_username text;
  v_fullname text;
BEGIN
  BEGIN
    v_fullname := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
    v_username := COALESCE(
      NEW.raw_user_meta_data->>'username',
      regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')
    );
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
      v_username := v_username || floor(random() * 1000)::text;
    END LOOP;

    INSERT INTO public.profiles (id, username, full_name, email)
    VALUES (NEW.id, v_username, v_fullname, NEW.email)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'doctor')
    ON CONFLICT (user_id, role) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user skipped: %', SQLERRM;
  END;
  RETURN NEW;
END;
$function$;
