# MDink Solutions — Database Schema

قاعدة بيانات MDink Solutions على Supabase (Postgres). **28 جدول**، RLS مفعّل على الكل.
كل الجداول تُنشأ عبر `SUPABASE_SETUP.sql` بالترتيب: تنظيف → جداول → فهارس → دوال/triggers → RLS → seed → حماية Super Admin.

---

## جداول الموقع + CMS (14)

| الجدول | الغرض | حقول أساسية |
|--------|-------|-------------|
| `admin_users` | التحكم في دخول لوحة التحكم | user_id, email, role (admin/editor/viewer), is_active |
| `site_settings` | إعدادات عامة (صف واحد) | brand_name, logo_url, phone, whatsapp_number, whatsapp_default_message, is_whatsapp_floating_enabled |
| `social_links` | كروت التواصل | platform, label, username, url, icon, display_order, is_active |
| `media_library` | كل الوسائط المرفوعة | title, file_url, storage_path, mime_type, alt_text, uploaded_by |
| `page_sections` | أهم جدول CMS: كل سكشن في كل صفحة | page_slug, section_key, title, subtitle, body_text, content_json, video_url, is_visible |
| `services` | خدمات MDink | title, description, icon, bullets, display_order, is_active |
| `portfolio_projects` | كروت الأعمال | title, client_name, category, tags, project_url, cover_image_url, is_active, is_featured |
| `blog_categories` | تصنيفات المدونة | name, slug (UNIQUE), display_order, is_active |
| `blog_posts` | مقالات المدونة | category_id, title, slug (UNIQUE), excerpt, content, cover_image_url, is_featured, is_published |
| `video_testimonials` | شهادات الفيديو | client_name, client_title, video_url, thumbnail_url, rating, is_active |
| `written_testimonials` | الآراء المكتوبة | client_name, review_text, review_image_url, original_post_url, rating, is_verified, is_active |
| `contact_submissions` | فورم تواصل | full_name, phone, specialty, message, status (new→closed) |
| `dashboard_activity_logs` | سجل نشاط اللوحة | admin_user_id, action, table_name, old_data, new_data |
| `notifications` | الإشعارات | recipient_user_id, title, message, type, is_read |

## جداول العمليات الداخلية (14)

| الجدول | الغرض |
|--------|-------|
| `seo_settings` | إعدادات SEO لكل صفحة (page_key UNIQUE) |
| `team_profiles` | بروفايلات أعضاء الفريق (roles, account_status, public_approved) |
| `team_members` | أعضاء الفريق المعروضون في "من نحن" |
| `clients` | عملاء MDink (doctor_name, project_status, payment_status) |
| `client_payments` | مدفوعات العملاء (Super Admin فقط) — total/paid_amount, installments |
| `consultations` | الاستشارات المجانية |
| `doctor_applications` | طلبات الأطباء (status, reviewed_by, internal_notes) |
| `team_tasks` | مهام الفريق (assigned_to, status, evidence_urls) |
| `reels` | حملات الريلز (video_url, views, likes, comments) |
| `operations` | سجل العمليات/المشاريع |
| `team_work_logs` | سجل عمل الفريق اليومي |
| `mdink_projects` | مشاريع مرتبطة بالمهام |
| `export_requests` | طلبات تصدير Excel |
| `audit_logs` | سجل النشاط الحساس (Super Admin فقط) |

---

## الدوال والـTriggers

- `set_updated_at()` — تحديث `updated_at` تلقائيًا على كل جدول له العمود.
- `is_admin_user()` — SECURITY DEFINER؛ ترجع true لو المستخدم في `admin_users` (نشط) أو إيميله من الإيميلين الأساسيين. أساس كل سياسات الكتابة.
- `handle_new_admin()` — عند إنشاء حساب Auth بأحد الإيميلين → يضاف تلقائيًا كـ admin.
- `protect_core_admins()` — trigger يمنع حذف/تعطيل/تخفيض الإيميلين الأساسيين.

## Storage

- Bucket `mdink-media` (عام للقراءة، كتابة للأدمن فقط) عبر 4 سياسات على `storage.objects`.

## Super Admin (محميّان)

`shfahmy2010@gmail.com` و `tasneemfahmy21@gmail.com` — الوحيدان بصلاحية كاملة، محميّان ضد الحذف/التعطيل/التخفيض، والوحيدان اللذان يريان الماليات.
