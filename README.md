# MDink for Digital Solutions

موقع شركة تسويق طبي احترافي + لوحة تحكم CMS كاملة + نظام إدارة عمليات وفريق (Role-Based Dashboards).

Professional medical-marketing company website + full CMS + operations & role-based team dashboards.

**Stack:** React · TypeScript · TanStack Router/Start · Tailwind CSS · Supabase · Vite

---

## ⚙️ التشغيل المحلي / Run Locally

```bash
# 1. تثبيت الحزم / install dependencies
npm install

# 2. إعداد المتغيرات / set environment variables
cp .env.example .env
# ثم املأ .env بقيم مشروع Supabase الخاص بك / then fill .env

# 3. التشغيل للتطوير / run dev server
npm run dev

# 4. بناء الإنتاج / production build
npm run build
```

---

## 🗄️ إعداد Supabase / Supabase Setup

### 1. أنشئ مشروع Supabase
أنشئ مشروعًا على [supabase.com](https://supabase.com) واحصل على:
- `Project URL` و `anon/publishable key` → في `.env`
- `service_role key` (سري) → في `.env` كـ `SUPABASE_SERVICE_ROLE_KEY`

### 2. شغّل الـ Migrations
ارفع كل ملفات `supabase/migrations/*.sql` بالترتيب (مرقّمة بالتاريخ):
- Supabase Dashboard → SQL Editor، أو `supabase db push`

### 3. الأدمن الأساسي / Core Admins
الإيميلات التالية تحصل تلقائيًا على `super_admin` وهي محمية من الحذف:
- `shfahmy2010@gmail.com`
- `tasneemfahmy21@gmail.com`

أنشئ لهم حسابات من Authentication → Users بنفس الإيميل.

### 4. Storage
migration المرحلة 1 ينشئ bucket `mdink-media` تلقائيًا.

### 5. Edge Function (إنشاء المستخدمين)
```bash
supabase functions deploy create-admin-user
```
ثم في Edge Functions → Secrets أضف: `PROJECT_URL`, `PROJECT_ANON_KEY`, `PROJECT_SERVICE_ROLE_KEY`.

---

## 🚀 الرفع على Netlify / Vercel

**Vercel:** اربط المستودع → أضف متغيرات `.env` في Environment Variables → Build: `npm run build`

**Netlify:** اربط المستودع → أضف المتغيرات في Site Settings → Build: `npm run build`

> لا تضع `SUPABASE_SERVICE_ROLE_KEY` إلا في متغيرات السيرفر، وليس في أي متغير يبدأ بـ `VITE_`.

---

## 👥 الأدوار / Roles

| الدور | يرى ماذا |
|------|----------|
| `super_admin` | كل شيء — المحتوى، المستخدمون، العملاء، المدفوعات، التقارير |
| `website_admin` | محتوى الموقع: Home, Services, Portfolio, Reels, Blog, About, SEO |
| `operations_admin` | العملاء، المدفوعات، المهام، الطلبات، التصدير |
| `team_member` | لوحة شخصية لتسجيل مهامه حسب دوره |
| `viewer` | قراءة فقط |

أدوار الفريق: محرر فيديو، مصمم جرافيك، مطور ويب، مودريتور، كاتب محتوى، مصور، مراجع طبي، عمليات.
كل عضو يكمل بروفايل مهني عند أول دخول، ولا يظهر في الفريق العام إلا بموافقة `super_admin`.

---

## ✨ المميزات / Features

- **محتوى ديناميكي 100%** — كل نص ورقم وصورة قابل للتعديل من لوحة التحكم
- **ثنائي اللغة** — عربي RTL / إنجليزي LTR مع تبديل فوري
- **رفع الصور والملفات** من الجهاز (Supabase Storage)
- **نظام دفع وتقسيط** كامل + حساب نسبة التحويل
- **Role-Based Dashboards** — كل عضو يرى لوحة مخصصة لدوره
- **تصدير Excel** لكل البيانات
- **SEO لكل صفحة** + PWA + sitemap + robots
- **أمان**: RLS مفعّل، لا service role في الواجهة، حماية الأدمن الأساسي، noindex لصفحات الإدارة

---

© MDink for Digital Solutions
