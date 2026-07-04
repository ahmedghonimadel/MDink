-- ============================================================
-- MDink — About page (warm rebuild) structured content + gallery
-- ============================================================

-- 1) "Life at MDink" gallery table (dashboard-manageable later)
CREATE TABLE IF NOT EXISTS public.about_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  caption_ar text,
  caption_en text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.about_gallery ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.about_gallery TO anon, authenticated;
GRANT ALL ON public.about_gallery TO authenticated, service_role;

DROP POLICY IF EXISTS "Public read active about gallery" ON public.about_gallery;
CREATE POLICY "Public read active about gallery" ON public.about_gallery
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage about gallery" ON public.about_gallery;
CREATE POLICY "Admins manage about gallery" ON public.about_gallery
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- 2) Structured About content stored in cms_pages (key = 'about')
INSERT INTO public.cms_pages (key, content)
SELECT 'about', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'about');

UPDATE public.cms_pages
SET content = content || '{
  "hero_badge_ar":"فريق يفهم القطاع الطبي",
  "hero_badge_en":"A Team That Understands the Medical Sector",
  "hero_title_ar":"من نحن",
  "hero_title_en":"About Us",
  "hero_subtitle_ar":"في MDink، لا نبني حضورًا رقميًا فقط، بل نبني علاقة قائمة على الفهم، الثقة، والمتابعة الحقيقية. نحب أن يشعر كل عميل أنه يعمل مع فريق قريب منه، يفهم احتياجه، ويتعامل مع مشروعه كأنه جزء من بيته.",
  "hero_subtitle_en":"At MDink, we do not only build digital presence — we build relationships rooted in understanding, trust, and genuine follow-up. We want every client to feel they are working with a team that understands their needs and treats their project with real care.",
  "story_title_ar":"حكايتنا",
  "story_title_en":"Our Story",
  "story_body_ar":"بدأت MDink برغبة واضحة: أن يكون للطبيب والعيادة والجهة الطبية شريك رقمي يفهم طبيعة القطاع الطبي، ويجمع بين الاحتراف، الراحة، والمتابعة الصادقة. نحن لا نؤمن بالخدمة السريعة فقط، بل نؤمن بالعلاقة طويلة المدى، وبأن يشعر العميل أنه بين فريق يسانده ويهتم بنجاحه بصدق.",
  "story_body_en":"MDink began with a clear purpose: to give doctors, clinics, and medical organizations a digital partner that truly understands the medical field and combines professionalism, comfort, and sincere follow-up. We do not believe in quick service alone; we believe in long-term relationships and in making clients feel supported by a team that genuinely cares about their success.",
  "vision_ar":"أن نكون الشريك الرقمي الأقرب والأكثر فهمًا للقطاع الطبي، نبني حضورًا موثوقًا يليق بالأطباء والعيادات والجهات الطبية.",
  "vision_en":"To become the most trusted and understanding digital partner for the medical sector, building a digital presence worthy of doctors, clinics, and medical institutions.",
  "mission_ar":"أن نحول الخبرة الطبية إلى حضور رقمي واضح، دافئ، موثوق، وقابل للنمو من خلال المواقع، المحتوى، التصوير، والحملات.",
  "mission_en":"To transform medical expertise into a clear, warm, trusted, and scalable digital presence through websites, content, photography, and campaigns.",
  "values_ar":"الثقة، الوضوح، الالتزام، الاهتمام بالتفاصيل، الاحترام، والإنسانية في التعامل.",
  "values_en":"Trust, clarity, commitment, attention to detail, respect, and a deeply human approach to client relationships.",
  "team_title_ar":"فريق العمل",
  "team_title_en":"Our Team",
  "team_text_ar":"الأشخاص وراء تشغيل وتسويق وتطوير حضور MDink الطبي — فريق يجمع بين الخبرة، الود، والاهتمام الحقيقي بكل مشروع.",
  "team_text_en":"The people behind MDink''s medical marketing, development, content, and strategy — a team that combines expertise, warmth, and genuine care for every project.",
  "life_title_ar":"من كواليس MDink",
  "life_title_en":"Life at MDink",
  "life_text_ar":"لحظات تعكس روح الفريق، التعاون، والجانب الإنساني وراء ما نقدمه.",
  "life_text_en":"Moments that reflect our team spirit, collaboration, and the human side behind what we do.",
  "relationship_title_ar":"نؤمن بالعلاقة قبل الخدمة",
  "relationship_title_en":"We Believe in Relationships Before Services",
  "relationship_text_ar":"نحن لا نبحث عن تنفيذ مهمة ثم الرحيل، بل نبحث عن شراكة يشعر فيها العميل بالراحة، والوضوح، والثقة في كل خطوة.",
  "relationship_text_en":"We do not aim to complete a task and leave — we aim to build a partnership where the client feels comfortable, clear, and confident at every step.",
  "cta_title_ar":"إذا كنت تبحث عن فريق يفهمك قبل أن يبيع لك، فنحن هنا.",
  "cta_title_en":"If you are looking for a team that understands you before selling to you, we are here.",
  "cta_subtitle_ar":"ابدأ مشروعك الطبي مع MDink، ودعنا نبني لك حضورًا رقميًا موثوقًا، منظمًا، ودافئًا يعكس قيمتك الحقيقية.",
  "cta_subtitle_en":"Start your medical project with MDink, and let us build you a trusted, organized, and warm digital presence that reflects your real value.",
  "cta_primary_ar":"ابدأ مشروعك الطبي",
  "cta_primary_en":"Start Your Medical Project",
  "cta_secondary_ar":"تواصل معنا",
  "cta_secondary_en":"Contact Us"
}'::jsonb
WHERE key = 'about';
