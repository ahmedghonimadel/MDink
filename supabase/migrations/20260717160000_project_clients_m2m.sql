-- علاقة many-to-many بين المشاريع والعملاء (مشروع لعدة عملاء، وعميل لعدة مشاريع).
-- مطبَّقة مباشرة على القاعدة الحية عبر Management API؛ هذا الملف يوثّقها.
CREATE TABLE IF NOT EXISTS public.project_clients (
  project_id uuid NOT NULL REFERENCES public.mdink_projects(id) ON DELETE CASCADE,
  client_id  uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, client_id)
);
ALTER TABLE public.project_clients ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.project_clients TO authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage project_clients" ON public.project_clients;
CREATE POLICY "Admins manage project_clients" ON public.project_clients
  FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Accountant read project_clients" ON public.project_clients;
CREATE POLICY "Accountant read project_clients" ON public.project_clients
  FOR SELECT TO authenticated USING (public.is_accountant(auth.uid()));

-- ترحيل الروابط القديمة (عميل واحد لكل مشروع)
INSERT INTO public.project_clients (project_id, client_id)
SELECT p.id, p.client_id FROM public.mdink_projects p
JOIN public.clients c ON c.id = p.client_id
WHERE p.client_id IS NOT NULL
ON CONFLICT DO NOTHING;
