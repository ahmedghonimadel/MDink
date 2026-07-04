# MDink Solutions — Testing Checklist (TESTING_CHECKLIST.md)

## قبل الاختبار
- [ ] تشغيل `SUPABASE_SETUP.sql` بنجاح (Success).
- [ ] `.env` مضبوط بقيم Supabase الصحيحة.
- [ ] `npm install && npm run build` بلا أخطاء.
- [ ] حسابات الفريق منشأة في Supabase Auth.

## الموقع العام
- [ ] الرئيسية تفتح؛ الهيرو يعرض العنوان الجديد + صورة المنصة (بعد رفعها).
- [ ] قسم "ليه تختار MDink Solutions" ظاهر؛ بلوك الفيديو مكان الكارت القديم.
- [ ] الخدمات تُقرأ من قاعدة البيانات.
- [ ] الأعمال تعرض صور حقيقية (بعد رفعها من اللوحة).
- [ ] المدونة بلا "رحلة المريض"؛ التصنيفات الجديدة تعمل؛ المقال يفتح.
- [ ] التواصل: الكروت تعرض WhatsApp → LinkedIn → Instagram → Facebook؛ الفورم يحفظ في `contact_submissions`.
- [ ] الآراء: شهادات الفيديو + "آراء عملاء MDink Solutions" المكتوبة.
- [ ] زر واتساب العائم يظهر في كل الصفحات ويفتح wa.me.
- [ ] تبديل AR/EN + داكن/فاتح سليم.
- [ ] الموبايل بلا scroll أفقي.

## لوحة التحكم
- [ ] الدخول `/auth` يعمل؛ redirect للوحة.
- [ ] السايدبار يظهر حسب الصلاحية.
- [ ] admin.home: حفظ الهيرو + الفيديو → يظهر في الموقع.
- [ ] admin.services: إضافة/تعديل/حذف/ترتيب/إخفاء خدمة.
- [ ] admin.portfolio: رفع صورة عمل + حفظ → تظهر في الموقع.
- [ ] admin.reviews: إضافة شهادة فيديو/مكتوبة؛ اعتماد رأي معلّق.
- [ ] admin.blogs: إضافة مقال + تصنيف + نشر → يظهر في المدونة.
- [ ] admin.about: تعديل الفريق (بطاقة شيماء "مؤسِّس MDink Solutions").
- [ ] admin.contact-settings: تعديل سوشيال + رقم واتساب + رسالة + تفعيل الزر العائم.
- [ ] admin.seo: حفظ عناوين/أوصاف الصفحات.
- [ ] admin.leads: عرض الطلبات + تغيير الحالة + حذف.
- [ ] admin.consultations / clients / doctor-applications / team / team-tasks / reels / operations / exports / audit-logs / team-profiles: تفتح وتقرأ/تكتب من قاعدة البيانات.
- [ ] dashboard: الإحصائيات حقيقية (ليست وهمية).

## الأمان
- [ ] حساب عادي لا يفتح `/admin/*` عبر URL مباشر.
- [ ] حساب غير Super Admin لا يقرأ `client_payments`/`audit_logs`.
- [ ] لا أخطاء console.

## الإنتاج
- [ ] `npm run build` ناجح.
- [ ] `node dist/server/server.js` يعمل.
