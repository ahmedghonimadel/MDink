# MDink Solutions — Security Notes (SECURITY_NOTES.md)

## المصادقة والصلاحيات
- الدخول عبر **Supabase Auth**. لوحة التحكم محميّة بـ`beforeLoad` تتحقق من `admin_users`.
- `admin_users.role`: `admin` (صلاحية كاملة) / `editor` (إدارة محتوى) / `viewer` (قراءة).
- الإيميلان `shfahmy2010@gmail.com` و `tasneemfahmy21@gmail.com` = Super Admin كامل، محميّان بـtrigger ضد الحذف/التعطيل/التخفيض.

## RLS (مفعّل على كل الجداول)
- **الزائر (anon):** يقرأ فقط المحتوى المنشور/النشط (services, portfolio_projects active, blog_posts published, testimonials active, social_links active, site_settings). ويُدرِج فقط في `contact_submissions` + `consultations` + `doctor_applications` + رأي معلّق في `written_testimonials`.
- **الأدمن:** يدير كل المحتوى عبر `is_admin_user()`.
- **بيانات داخلية (clients, client_payments, team_tasks, audit_logs, operations...):** أدمن فقط — الزائر لا يقرأها إطلاقًا.
- **الماليات (`client_payments`, `audit_logs`):** محميّة لـSuper Admin/أدمن فقط عبر RLS، ليس إخفاء واجهة فقط.

## مفاتيح Supabase
- الواجهة تستعمل **anon key فقط** (`VITE_SUPABASE_ANON_KEY`).
- **`service_role` لا يظهر في الواجهة إطلاقًا** — فقط في `scripts/seed-admins.mjs` و Edge Function.
- إنشاء المستخدمين من اللوحة يتم عبر **Edge Function `create-admin-user`** (server-side)، لا service_role في الفرونت.

## Storage
- Bucket `mdink-media`: قراءة عامة، كتابة/تعديل/حذف للأدمن فقط (4 سياسات على storage.objects).

## التحقق من المدخلات
- الفورمات تستخدم **Zod** للتحقق قبل الإرسال.
- `sanitize()` في الإعدادات يزيل أحرف التحكم و`<script>`.

## Checklist أمني
- [x] لا service_role في الفرونت
- [x] RLS مفعّل على كل الـ28 جدول
- [x] الزائر لا يصل لبيانات اللوحة
- [x] الوصول المباشر لـ`/admin/*` بدون صلاحية → redirect لـ`/auth`
- [x] الماليات محميّة بالـRLS
- [x] الإيميلان الأساسيان محميّان بـtrigger
- [x] الفورمات تتحقق من المدخلات
- [x] متغيّرات البيئة غير مكشوفة
