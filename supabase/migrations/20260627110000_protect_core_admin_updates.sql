-- Protect core MDink admins from role deletion or downgrade at database level.

CREATE OR REPLACE FUNCTION public.prevent_protected_super_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = COALESCE(OLD.user_id, NEW.user_id);

  IF EXISTS (SELECT 1 FROM public.admin_allowlist WHERE lower(email) = lower(v_email)) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Protected core admin role cannot be deleted';
    END IF;

    IF TG_OP = 'UPDATE' AND (NEW.role <> 'super_admin' OR NEW.user_id <> OLD.user_id) THEN
      RAISE EXCEPTION 'Protected core admin role cannot be changed';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' AND OLD.role = 'super_admin' AND (SELECT count(*) FROM public.user_roles WHERE role = 'super_admin') <= 1 THEN
    RAISE EXCEPTION 'Cannot delete the last super admin role';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS protect_super_admin_role_delete ON public.user_roles;
DROP TRIGGER IF EXISTS protect_core_admin_role_change ON public.user_roles;
CREATE TRIGGER protect_core_admin_role_change
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_super_admin_role_change();
