-- ============================================================
-- MDink — Services page refresh
-- Full 12-service catalog + expanded page copy/CTA
-- ============================================================

-- 1) Update the services_page CMS content (heading, intro, CTA)
UPDATE public.cms_pages
SET content = content || '{
  "title_ar":"خدمات رقمية متكاملة للقطاع الطبي",
  "title_en":"Integrated Digital Services for Healthcare",
  "intro_ar":"من بناء الموقع والهوية إلى التصوير داخل العيادة وإدارة الحملات — MDink تساعد الأطباء والعيادات والمراكز الطبية والمستشفيات على الظهور بثقة وجذب مرضى حقيقيين.",
  "intro_en":"From building the website and identity to in-clinic photography and campaign management — MDink helps doctors, clinics, medical centers, and hospitals appear with confidence and attract real patients.",
  "cta_title_ar":"جاهز تبني حضور طبي يليق بثقة مرضاك؟",
  "cta_title_en":"Ready to build a medical presence worthy of your patients'' trust?",
  "cta_text_ar":"سواء كنت طبيبًا مستقلًا، عيادة، مركزًا طبيًا، مجمع عيادات، أو مستشفى — نساعدك في بناء منظومة رقمية واضحة، موثوقة، وقابلة للنمو.",
  "cta_text_en":"Whether you are an independent doctor, a clinic, a medical center, a polyclinic, or a hospital — we help you build a clear, trustworthy, and scalable digital system.",
  "cta_primary_ar":"احجز استشارة مجانية",
  "cta_primary_en":"Book a free consultation",
  "cta_secondary_ar":"شاهد أعمالنا",
  "cta_secondary_en":"View our work"
}'::jsonb
WHERE key = 'services_page';

INSERT INTO public.cms_pages (key, content)
SELECT 'services_page', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.cms_pages WHERE key = 'services_page');

-- 2) Reseed the full 12-service catalog.
-- Replace the original 5 starter services with the complete list so the
-- public page and the admin "Services" section both show all twelve.
-- (Only deletes the known seeded starter rows; any service the admin added
--  manually with a different title is preserved.)
DELETE FROM public.cms_services
WHERE title_ar IN (
  'تصميم وتطوير مواقع طبية','إدارة السوشيال ميديا','SEO طبي','حملات إعلانية','تصوير طبي و Reels'
);

INSERT INTO public.cms_services
  (title_ar, title_en, description_ar, description_en, checkmarks_ar, checkmarks_en, icon, sort_order, is_published)
VALUES
  ('تصميم وتطوير مواقع طبية','Medical Website Design & Development',
   'مواقع احترافية مملوكة لك، مناسبة للأطباء والعيادات والمراكز والمستشفيات، سريعة، متجاوبة، ومهيأة للحجز والظهور في جوجل.',
   'Professional, owned websites for doctors, clinics, centers, and hospitals — fast, responsive, and built for booking and Google visibility.',
   ARRAY['تصميم مخصص','متجاوب مع الموبايل','مهيأ لمحركات البحث'],
   ARRAY['Custom design','Mobile responsive','SEO ready'],'Globe',10,true),

  ('لوحات تحكم وأنظمة إدارة','Dashboards & Management Systems',
   'لوحات سهلة لإدارة الأطباء، الخدمات، المقالات، الحجوزات، الاستفسارات، ومحتوى الموقع بدون تعقيد.',
   'Easy dashboards to manage doctors, services, articles, bookings, inquiries, and site content without complexity.',
   ARRAY['إدارة الأطباء والخدمات','متابعة الطلبات','تعديل المحتوى بسهولة'],
   ARRAY['Manage doctors & services','Track requests','Easy content editing'],'LayoutDashboard',20,true),

  ('SEO طبي ومحتوى بحث','Medical SEO & Search Content',
   'صفحات خدمات ومقالات طبية منظمة تساعد المرضى يفهموا خدمتك وتساعد موقعك يظهر في نتائج البحث.',
   'Organized service pages and medical articles that help patients understand your work and help your site rank.',
   ARRAY['كلمات مفتاحية طبية','Schema.org','صفحات خدمات متخصصة'],
   ARRAY['Medical keywords','Schema.org','Specialty service pages'],'TrendingUp',30,true),

  ('إدارة السوشيال ميديا','Social Media Management',
   'تقويم محتوى شهري، تصميمات احترافية، كتابة كابشنات، أفكار ريلز، ومتابعة الأداء بشكل مستمر.',
   'Monthly content calendar, professional designs, caption writing, reel ideas, and ongoing performance tracking.',
   ARRAY['تقويم شهري','تصميمات احترافية','متابعة الأداء'],
   ARRAY['Monthly calendar','Professional designs','Performance tracking'],'Sparkles',40,true),

  ('تصوير طبي داخل العيادة','In-Clinic Medical Photography',
   'جلسات تصوير حقيقية داخل العيادة أو المركز لإظهار المكان، الأطباء، الأجهزة، طريقة العمل، وفريق العمل بشكل مهني موثوق.',
   'Real photo sessions inside the clinic or center showing the space, doctors, equipment, workflow, and team — professionally and credibly.',
   ARRAY['تصوير الطبيب والفريق','تصوير المكان والأجهزة','محتوى حقيقي للثقة'],
   ARRAY['Doctor & team shots','Space & equipment shots','Real content for trust'],'Camera',50,true),

  ('فيديوهات وريلز طبية','Medical Videos & Reels',
   'تصوير ومونتاج فيديوهات قصيرة للأطباء، شرح الخدمات، لقطات من داخل العيادة، وتجهيز محتوى مناسب للسوشيال والإعلانات.',
   'Filming and editing short videos for doctors, service explainers, in-clinic footage, and content ready for social and ads.',
   ARRAY['ريلز طبية','فيديوهات شرح الخدمات','مونتاج احترافي'],
   ARRAY['Medical reels','Service explainer videos','Professional editing'],'Video',60,true),

  ('تصميم جرافيك طبي','Medical Graphic Design',
   'تصميم بوستات، إعلانات، كفرات، قوالب محتوى، عروض خدمات، وهوية بصرية متناسقة مع تخصصك الطبي.',
   'Posts, ads, covers, content templates, service offers, and visuals consistent with your medical specialty.',
   ARRAY['بوستات وإعلانات','قوالب محتوى','تصميمات للحملات'],
   ARRAY['Posts & ads','Content templates','Campaign designs'],'Palette',70,true),

  ('حملات إعلانية طبية','Medical Ad Campaigns',
   'إدارة حملات Meta و Google بأهداف واضحة: استفسارات، حجوزات، زيارات موقع، أو زيادة الوعي بالمركز.',
   'Managing Meta and Google campaigns with clear goals: inquiries, bookings, site visits, or awareness.',
   ARRAY['Meta Ads','Google Ads','تقارير أداء'],
   ARRAY['Meta Ads','Google Ads','Performance reports'],'Megaphone',80,true),

  ('هوية بصرية طبية','Medical Brand Identity',
   'بناء شكل بصري محترف للطبيب أو العيادة أو المركز: ألوان، خطوط، قوالب، أسلوب صور، وطريقة ظهور موحدة.',
   'Building a professional visual identity for the doctor, clinic, or center: colors, fonts, templates, photo style, and a unified look.',
   ARRAY['شعار وهوية','ألوان وخطوط','قوالب استخدام'],
   ARRAY['Logo & identity','Colors & fonts','Usage templates'],'ShieldCheck',90,true),

  ('ربط واتساب ونماذج حجز','WhatsApp & Booking Forms',
   'تحويل الزائر من مجرد مشاهدة إلى تواصل وحجز من خلال أزرار واضحة، نماذج سهلة، وربط مباشر بواتساب.',
   'Turning visitors into contacts and bookings through clear buttons, simple forms, and direct WhatsApp integration.',
   ARRAY['نماذج حجز','ربط واتساب','تتبع الاستفسارات'],
   ARRAY['Booking forms','WhatsApp integration','Inquiry tracking'],'MessageCircle',100,true),

  ('تقارير وتحليل الأداء','Reporting & Performance Analysis',
   'متابعة الزيارات، مصادر العملاء، أداء الإعلانات، أكثر الخدمات طلبًا، وتقديم توصيات تطوير شهرية.',
   'Tracking visits, client sources, ad performance, most-requested services, and providing monthly improvement recommendations.',
   ARRAY['تقارير شهرية','تحليل مصادر العملاء','توصيات تحسين'],
   ARRAY['Monthly reports','Client source analysis','Improvement recommendations'],'BarChart3',110,true),

  ('دعم وتطوير مستمر','Ongoing Support & Development',
   'متابعة الموقع، تحديث المحتوى، تحسين الأداء، إضافة خدمات جديدة، وتطوير مستمر حسب نمو العيادة أو المركز.',
   'Site monitoring, content updates, performance improvements, adding new services, and continuous development as your clinic grows.',
   ARRAY['دعم فني','تحديثات دورية','تطوير مستمر'],
   ARRAY['Technical support','Regular updates','Continuous development'],'LifeBuoy',120,true);
