# MDink Solutions — Production Setup & Deployment

دليل تشغيل ونشر موقع ولوحة تحكم MDink Solutions على سيرفر خاص (VPS) مع دومين و SSL.

---

## 1. نظرة عامة على المشروع

- **الإطار**: React + TypeScript + **TanStack Start** (SSR) + Vite + Tailwind.
- **قاعدة البيانات / المصادقة / التخزين**: **Supabase** (Postgres + Auth + Storage + RLS).
- **الموقع العام**: صفحات الزوّار (رئيسية، خدمات، أعمال، آراء، من نحن، مدونة، تواصل).
- **لوحة التحكم**: `/auth` لدخول الفريق، و `/dashboard` + `/admin/*` للإدارة (محميّة).
- **اللغات**: عربي RTL / إنجليزي LTR، ووضع داكن/فاتح.

---

## 2. المتطلبات

- **Node.js 20 LTS أو أحدث** (موصى به 20.x). تحقّق: `node -v`.
- **npm 10+**.
- حساب/مشروع **Supabase** جاهز (Production).
- سيرفر Linux (Ubuntu 22.04+ موصى به) + دومين + منفذ 80/443 مفتوح.

---

## 3. متغيّرات البيئة (Environment Variables)

انسخ `.env.example` إلى `.env` واملأ القيم من Supabase → Project Settings → API:

```
# آمنة للمتصفح
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"

# للسيرفر فقط — لا تُرسَل للمتصفح أبدًا
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"   # سرّي — لإنشاء المستخدمين من السكربت فقط
```

> **أمان حرج**: `SUPABASE_SERVICE_ROLE_KEY` يُستخدم فقط في سكربتات السيرفر (مثل `seed-admins.mjs`) — **لا يُستورد أبدًا في كود الواجهة**. الواجهة تستعمل `VITE_SUPABASE_ANON_KEY` فقط.

---

## 4. إعداد Supabase (مرّة واحدة)

1. **الهجرات (Migrations)**: افتح Supabase → SQL Editor، الصق كامل ملف **`MDINK_RUN_ALL_IN_ORDER.sql`** واضغط **Run**. يُنشئ كل الجداول/الأعمدة/السياسات ويزرع المحتوى (idempotent — آمن لإعادة التشغيل). خُذ **Backup** قبل التشغيل.
2. **Storage bucket**: الملف ينشئ bucket باسم `mdink-media` (عام للقراءة). تأكد من وجوده في Storage.
3. **RLS**: مُفعّل على كل الجداول المكشوفة. الزائر يقرأ المحتوى المنشور فقط؛ الأدمن/المحرر يكتب حسب الصلاحية.
4. **حسابات Super Admin**: الإيميلان `shfahmy2010@gmail.com` و `tasneemfahmy21@gmail.com` هما الوحيدان بصلاحية كاملة (مثبّتان في الكود و RLS).
5. **إنشاء أول مستخدم أدمن**: من Supabase → Authentication → Add user (أو عبر `npm run seed:admins` بعد ضبط `.env`). ثم أضف صفّه في `user_roles` بالدور `super_admin` إن لزم.

---

## 5. أوامر التشغيل

```bash
npm install            # تثبيت الحزم
npm run lint           # فحص الجودة (اختياري)
npx tsc --noEmit       # فحص الأنواع (اختياري)
npm run build          # بناء الإنتاج -> مجلد dist/
npm run preview        # معاينة محلية للبناء
```

**تشغيل الإنتاج (SSR)** — نقطة الدخول: `dist/server/server.js`:

```bash
node dist/server/server.js
# يستمع افتراضيًا على المنفذ 3000 (اضبط PORT حسب الحاجة)
PORT=3000 node dist/server/server.js
```

---

## 6. النشر على سيرفر خاص (VPS)

### أ. تجهيز السيرفر
```bash
sudo apt update && sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

### ب. جلب المشروع وبناؤه
```bash
git clone <repo-or-upload-files> /var/www/mdink
cd /var/www/mdink
cp .env.example .env    # ثم املأ القيم
npm ci
npm run build
```

### ج. التشغيل الدائم بـ PM2
```bash
PORT=3000 pm2 start "node dist/server/server.js" --name mdink
pm2 save
pm2 startup      # نفّذ الأمر الذي يطبعه لتشغيله عند الإقلاع
pm2 logs mdink   # لمتابعة اللوجز
pm2 restart mdink   # لإعادة التشغيل بعد تحديث
```

### د. Nginx كـ Reverse Proxy
`/etc/nginx/sites-available/mdink`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/mdink /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### هـ. الدومين (DNS)
من لوحة مزوّد الدومين: سجل **A** يشير إلى IP السيرفر لـ `@` و `www`.

### و. SSL بـ Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
# التجديد التلقائي مُفعّل عبر systemd timer؛ تحقق: sudo certbot renew --dry-run
```

### ز. تحديث لاحق
```bash
cd /var/www/mdink && git pull && npm ci && npm run build && pm2 restart mdink
```

---

## 7. النسخ الاحتياطي (Backups)

- **قاعدة البيانات**: Supabase → Database → Backups (Daily للـ Pro). أو `pg_dump` دوري.
- **الوسائط**: bucket `mdink-media` — نزّل نسخة دورية أو فعّل نسخ Storage.
- **الكود/البيئة**: احتفظ بنسخة من `.env` في مكان آمن (خارج git).

---

## 8. قوائم الاختبار

### اختبار وظيفي
- [ ] صفحات الموقع العام تفتح بلا أخطاء (رئيسية/خدمات/أعمال/آراء/من نحن/مدونة/تواصل).
- [ ] المقالات تفتح في تاب جديد وتعرض المحتوى + المقال التالي/المرتبط.
- [ ] تبديل اللغة (AR/RTL ↔ EN/LTR) والوضع الداكن/الفاتح سليم.
- [ ] فورم تواصل يحفظ في `leads`؛ فورم "اترك رأيك" يحفظ في `testimonial_submissions` + رفع الوسائط.
- [ ] دخول `/auth` يعمل، وإعادة التوجيه للوحة بعد الدخول.
- [ ] السايدبار يظهر حسب الصلاحية (Super Admin يرى الكل).
- [ ] `/admin/reviews` يعرض الشهادات ويقبل/يرفض المُرسَلة.
- [ ] `/admin/seo` يحفظ ويحدّث عنوان تبويب المتصفح (الرئيسية = `MDink for Digital Solutions`).
- [ ] رفع الصور من اللوحة يخزّن في `mdink-media`.
- [ ] الموبايل responsive بلا overflow أفقي.

### اختبار الأمان
- [ ] لا يوجد `service_role` في كود الواجهة (فقط في سكربتات السيرفر).
- [ ] RLS مفعّل على كل الجداول؛ الزائر لا يقرأ بيانات اللوحة.
- [ ] مستخدم غير مصرّح لا يفتح `/admin/*` عبر URL مباشر (redirect لـ `/auth`).
- [ ] `client_financials` غير مقروء إلا للإيميلين Super Admin (جرّب بحساب عادي).
- [ ] الفورمات تتحقق من المدخلات (Zod) وترفض الفارغ/غير الصالح.

---

## 9. استكشاف الأخطاء (Troubleshooting)

- **"Missing Supabase environment variable(s)"**: `.env` ناقص `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` وقت البناء. أعد `npm run build` بعد ضبطه.
- **`column ... does not exist` عند تشغيل SQL**: شغّل `MDINK_RUN_ALL_IN_ORDER.sql` كاملًا (يحتوي حُرّاس `ADD COLUMN IF NOT EXISTS`). لا تشغّل ملفات جزئية بترتيب عشوائي.
- **`ON CONFLICT ... no unique constraint`**: الملف يضيف قيود UNIQUE تلقائيًا؛ تأكد أنك شغّلت النسخة الأحدث كاملة.
- **الصفحة تعرض 502 خلف Nginx**: تأكد أن `pm2 status` يُظهر `mdink` يعمل والمنفذ مطابق لـ `proxy_pass`.
- **الصور لا تظهر**: تحقق من أن bucket `mdink-media` عام (public) وأن السياسات مطبّقة.

---

## 10. الصيانة والدعم

- راقب اللوجز: `pm2 logs mdink` وسجلات Nginx في `/var/log/nginx/`.
- حدّث الحزم الأمنية دوريًا: `npm audit` و `npm update` (مع اختبار البناء).
- راجع Supabase → Logs عند أي خطأ في الاستعلامات أو RLS.
- خُذ Backup قبل أي هجرة SQL جديدة.

---

## ملاحظات ختامية / حدود حالية

بعض بنود لوحة العمليات المتقدّمة (إنشاء المستخدمين عبر Edge Function، الإشعارات اللحظية Realtime، تصدير Excel مع فلترة الأعمدة، شاشات المهام ورفع أدلّتها) **جداولها وسياساتها جاهزة في قاعدة البيانات**، لكن بعض واجهاتها لم تُبنَ بالكامل بعد وتحتاج دفعات لاحقة. تفاصيل ما تم وما تبقّى موجودة في ملاحظات التسليم.
