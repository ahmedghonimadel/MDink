-- ============================================================
-- MDink — Contact page rebuild: extended leads + page content
-- ============================================================

-- 1) Extend leads for richer lead management (dashboard-ready)
ALTER TABLE public.leads ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS organization_type text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS service_needed text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_link text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS current_online_presence_links text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS preferred_contact text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS language text DEFAULT 'ar';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_page text DEFAULT '/contact';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Contact page structured content
INSERT INTO public.cms_pages (key, content)
SELECT 'contact_page', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'contact_page');

UPDATE public.cms_pages
SET content = content || '{
  "hero_badge_ar":"ابدأ بخطوة بسيطة",
  "hero_badge_en":"Start with a Simple Step",
  "title_ar":"تواصل معنا",
  "title_en":"Contact Us",
  "intro_ar":"جاهزون نسمع منك، نفهم احتياجك، ونساعدك تختار الحل الأنسب لطبيبك، عيادتك، مركزك الطبي، أو مستشفاك.",
  "intro_en":"We are ready to listen, understand your needs, and help you choose the right solution for your doctor profile, clinic, medical center, or hospital.",
  "form_title_ar":"احجز استشارة مجانية",
  "form_title_en":"Book a Free Consultation",
  "form_subtitle_ar":"أخبرنا قليلًا عن مشروعك، وسنرد عليك خلال 24 ساعة.",
  "form_subtitle_en":"Tell us a little about your project, and we will get back to you within 24 hours.",
  "trust_title_ar":"نسمع أولًا… ثم نقترح",
  "trust_title_en":"We Listen First… Then We Recommend",
  "trust_body_ar":"في MDink لا نبدأ ببيع خدمة جاهزة، بل نبدأ بفهم احتياجك الحقيقي، طبيعة تخصصك، ونوع الجمهور الذي تريد الوصول إليه.",
  "trust_body_en":"At MDink, we do not start by selling a ready-made service. We start by understanding your real needs, your specialty, and the audience you want to reach.",
  "cta_title_ar":"جاهز تبدأ مشروعك الطبي؟",
  "cta_title_en":"Ready to Start Your Medical Project?",
  "cta_subtitle_ar":"سواء كنت طبيبًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — فريق MDink جاهز يساعدك تبني حضور رقمي موثوق.",
  "cta_subtitle_en":"Whether you are a doctor, clinic, medical center, polyclinic, or hospital, MDink is ready to help you build a trusted digital presence."
}'::jsonb
WHERE key = 'contact_page';
