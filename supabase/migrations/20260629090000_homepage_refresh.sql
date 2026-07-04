-- ============================================================
-- MDink — Homepage refresh (brand colors already in code,
-- copy/social/stat updates pushed to the DB so they take effect
-- even on databases seeded by earlier migrations)
-- ============================================================

-- 1) Social links: remove Twitter/X, fix Instagram
UPDATE public.site_config SET value = '' WHERE key = 'twitter_url';
UPDATE public.site_config SET value = 'https://www.instagram.com/shaima2_fahmy' WHERE key = 'instagram_url';

-- 2) Homepage content (cms_pages.key = 'home') — overwrite only the
-- keys that changed; jsonb || keeps any other admin-edited keys intact,
-- and the LEFT-hand side (new values) wins for overlapping keys here.
UPDATE public.cms_pages
SET content = content || '{
  "hero_title_ar":"لأن الطبيب اليوم لا يحتاج ظهورًا رقميًا فقط؛ بل منصة منظمة تعرض خبرته، خدماته، ومواعيده، وتُقدّمه للمرضى بالصورة التي يستحقها.",
  "hero_title_en":"Because today''s doctor needs more than a digital presence; a structured platform that showcases their expertise, services, and schedule — presenting them to patients the way they deserve.",
  "hero_subtitle_ar":"MDink Solutions تبني مواقع طبية مملوكة للأطباء والعيادات والمراكز الطبية، تدير السوشيال ميديا، تطلق الحملات، وتؤهّلكم بمحتوى طبي ينافس في جوجل.",
  "hero_subtitle_en":"MDink Solutions builds owned medical websites for doctors, clinics, and medical centers, manages social media, launches campaigns, and equips you with medical content that can compete on Google.",
  "preview_doctor_ar":"عيادتي",
  "preview_doctor_en":"Eyadaty",
  "preview_specialty_ar":"All Women Health Services In One Place — Eyadaty",
  "preview_specialty_en":"All Women Health Services In One Place — Eyadaty",
  "preview_url":"3eyadaty-eg.com",
  "preview_link":"https://3eyadaty-eg.com/",
  "dashboard_card_json":[
    {"label_ar":"زائر شهريًا","label_en":"Monthly visitors","value":"18,500","icon":"Users"},
    {"label_ar":"حجز شهريًا","label_en":"Monthly bookings","value":"420","icon":"CalendarCheck"},
    {"label_ar":"نمو التفاعل","label_en":"Engagement growth","value":"+38%","icon":"TrendingUp"},
    {"label_ar":"حملات نشطة","label_en":"Active campaigns","value":"6","icon":"Megaphone"}
  ],
  "why_intro_ar":"في سوق مزدحم بالوكالات، نقدّم تركيبة فريدة لا يقدّمها أي منافس: منصة مملوكة لك بالكامل + خدمة تسويقية متكاملة — لكل طبيب، عيادة، أو مركز طبي.",
  "why_intro_en":"We combine a fully-owned digital platform with integrated marketing services for doctors, clinics, and medical centers — not a temporary campaign only.",
  "advantages_json":[
    {"ar":"منصة مملوكة لك بالكامل — طبيبًا كنت أو عيادة أو مركزًا طبيًا — لا مجرد خدمة تسويقية مؤقتة","en":"A platform fully owned by you — doctor, clinic, or medical center — not a temporary agency service"},
    {"ar":"لوحة تحكم سهلة تحرر محتواك بنفسك بدون مبرمج","en":"A simple dashboard to edit content without a developer"},
    {"ar":"تقارير أداء مباشرة من اللوحة بدل انتظار الوكالة","en":"Direct performance reports from the dashboard"},
    {"ar":"تصميم بصري مخصص لكل تخصص — لا قوالب عامة","en":"Specialty-based visual design, not generic templates"},
    {"ar":"ربط مباشر بواتساب وحجز فوري لتحويل الزائر لعميل","en":"WhatsApp and fast contact flows that convert visitors"}
  ],
  "system_title_ar":"منظومة رقمية متكاملة للقطاع الطبي",
  "system_title_en":"An Integrated Digital Ecosystem for Healthcare",
  "system_intro_ar":"موقع احترافي، لوحات تحكم، إدارة محتوى، وتقويم تسويقي — جاهزة للإطلاق والنمو.",
  "system_intro_en":"A professional website, dashboards, content management, and a marketing calendar — ready to launch and grow.",
  "system_items_json":[
    {"ar":"موقع MDink الرئيسي لإدارة حضورك الرقمي","en":"MDink''s main website to manage your digital presence"},
    {"ar":"مواقع مخصصة للأطباء والعيادات والمراكز الطبية","en":"Dedicated websites for doctors, clinics, and medical centers"},
    {"ar":"لوحة تحكم سهلة لتعديل الخدمات والمحتوى","en":"An easy dashboard to edit services and content"},
    {"ar":"لوحة إدارة للمتابعة والتقارير والطلبات","en":"A management dashboard for tracking, reports, and requests"},
    {"ar":"تقويم محتوى منظم للسوشيال ميديا","en":"An organized social media content calendar"}
  ]
}'::jsonb
WHERE key = 'home';

-- In case no 'home' row exists yet on a fresh database, make sure one is present
-- (the earlier seed migrations already insert a full default row, so this is a safety net only).
INSERT INTO public.cms_pages (key, content)
SELECT 'home', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'home');
