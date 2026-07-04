# MDink Solutions — Deployment Guide (README_DEPLOY.md)

دليل نشر موقع + لوحة تحكم MDink Solutions على سيرفر خاص (VPS) أو منصة مجانية للمعاينة.

---

## 1. المتطلبات
- **Node.js 20 LTS+** (تحقّق: `node -v`)
- **npm 10+**
- مشروع **Supabase** جاهز (تم تشغيل `SUPABASE_SETUP.sql` عليه)

## 2. متغيّرات البيئة
انسخ `.env.example` إلى `.env` واملأ القيم من Supabase → Project Settings → API:
```
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_PUBLISHABLE_KEY="YOUR_ANON_KEY"
VITE_SUPABASE_PROJECT_ID="YOUR_PROJECT_ID"
# للسيرفر/السكربتات فقط — لا يظهر في المتصفح أبدًا:
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```
> **أمان:** `SUPABASE_SERVICE_ROLE_KEY` يُستخدم فقط في السكربتات/Edge Functions — الواجهة تستعمل الـanon key فقط.

## 3. الأوامر
```bash
npm install          # تثبيت الحزم
npm run lint         # فحص جودة (اختياري)
npx tsc --noEmit     # فحص أنواع (اختياري)
npm run build        # بناء الإنتاج → dist/
npm run preview      # معاينة محلية للبناء
```
**تشغيل الإنتاج (SSR):**
```bash
PORT=3000 node dist/server/server.js
```

## 4. إعداد Supabase (مرة واحدة)
1. SQL Editor → الصق كامل `SUPABASE_SETUP.sql` → **Run** (آمن لإعادة التشغيل).
2. تأكّد من وجود bucket `mdink-media` (يُنشأ تلقائيًا).
3. Authentication → أنشئ حسابات الفريق. الإيميلان الأساسيان يُضافان كـ admin تلقائيًا.

---

## 5-أ. معاينة سريعة على منصة مجانية (موصى به للعرض للعميلة)

المشروع SSR (Node)، فأنسب منصات مجانية:

**Railway** (الأبسط لـNode SSR):
1. ادخل railway.app → New Project → Deploy from GitHub (أو ارفع الكود).
2. Variables → أضف متغيّرات البيئة من `.env`.
3. Build command: `npm run build` — Start command: `node dist/server/server.js`.
4. Railway يعطيك رابط `*.up.railway.app` جاهز للمعاينة.

**Render** (بديل):
- New → Web Service → Build: `npm install && npm run build` — Start: `node dist/server/server.js` — أضف متغيّرات البيئة.

> ملاحظة: Vercel/Netlify مناسبة أكثر للمواقع الثابتة؛ لـSSR الكامل استخدم Railway/Render لسهولة أعلى.

## 5-ب. النشر على سيرفر خاص (VPS) — للإنتاج النهائي

```bash
# تجهيز السيرفر
sudo apt update && sudo apt install -y nginx git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2

# المشروع
git clone <repo> /var/www/mdink && cd /var/www/mdink
cp .env.example .env   # املأ القيم
npm ci && npm run build

# تشغيل دائم
PORT=3000 pm2 start "node dist/server/server.js" --name mdink
pm2 save && pm2 startup
```

**Nginx** (`/etc/nginx/sites-available/mdink`):
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/mdink /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

**الدومين:** سجل A يشير لـIP السيرفر (`@` و `www`).

**SSL:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**تحديث لاحق:**
```bash
cd /var/www/mdink && git pull && npm ci && npm run build && pm2 restart mdink
```

## 6. النسخ الاحتياطي
- قاعدة البيانات: Supabase → Database → Backups.
- الوسائط: bucket `mdink-media`.
- الكود/البيئة: احتفظ بنسخة `.env` بأمان (خارج git).

## 7. استكشاف الأخطاء
- **502 خلف Nginx:** تأكد `pm2 status` يُظهر mdink يعمل والمنفذ مطابق.
- **"Missing Supabase env":** `.env` ناقص وقت البناء؛ أعد `npm run build`.
- **الصور لا تظهر:** تأكد bucket `mdink-media` عام.
- **لوحة التحكم لا تفتح:** تأكد أن حسابك في `admin_users` بـ is_active=true.
