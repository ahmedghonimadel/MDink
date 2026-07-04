// ============================================================
// MDink Solutions — Blog Articles Seeder
// يقرأ ملفات المقالات (.md)، يحوّلها لبلوكات JSON عبر parseArticle،
// ويزرعها في جدول blog_posts مربوطة بتصنيفاتها في blog_categories.
//
// التشغيل:
//   1) انسخ .env مع القيم الحقيقية (VITE_SUPABASE_URL + SERVICE_ROLE_KEY)
//   2) node scripts/seed-blog-articles.mjs
//
// يستخدم SERVICE_ROLE_KEY لتخطّي RLS أثناء الإدخال (سيرفر فقط).
// آمن لإعادة التشغيل: يعمل upsert على slug.
// ============================================================

import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { parseArticle } from "./parse-articles.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- إعداد الاتصال ----------
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || SERVICE_KEY.includes("YOUR_")) {
  console.error(
    "\n❌ ناقص إعدادات الاتصال.\n" +
      "تأكد من وجود هذه القيم الحقيقية في .env:\n" +
      "  SUPABASE_URL / VITE_SUPABASE_URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY (المفتاح السري — من جهازك فقط)\n",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------- ربط تصنيف المقال (بالعربي) بـ category slug ----------
const CATEGORY_SLUG_BY_NAME = {
  "التسويق الطبي": "medical-marketing",
  "المواقع الطبية": "medical-websites",
  "إدارة العيادات": "clinic-management",
  "SEO طبي": "medical-seo",
  "المحتوى الطبي": "medical-content",
};

const DEFAULT_AUTHOR = "فريق MDink Solutions";
const ARTICLES_DIR = resolve(__dirname, "../seed-articles");

async function main() {
  // 1) اقرأ خريطة التصنيفات: slug -> id
  const { data: cats, error: catErr } = await supabase
    .from("blog_categories")
    .select("id, slug, name");
  if (catErr) {
    console.error("❌ فشل قراءة التصنيفات:", catErr.message);
    process.exit(1);
  }
  const catIdBySlug = Object.fromEntries((cats ?? []).map((c) => [c.slug, c.id]));
  console.log(`✓ تم تحميل ${cats?.length ?? 0} تصنيف`);

  // 2) اقرأ ملفات المقالات
  let files;
  try {
    files = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    console.error(`❌ مجلد المقالات غير موجود: ${ARTICLES_DIR}`);
    process.exit(1);
  }
  console.log(`✓ عُثر على ${files.length} مقال\n`);

  let ok = 0;
  let displayOrder = 10;

  for (const file of files.sort()) {
    const raw = readFileSync(join(ARTICLES_DIR, file), "utf8");
    const { meta, blocks } = parseArticle(raw);

    if (!meta.slug || !meta.title) {
      console.warn(`⚠️  تخطّي ${file}: ينقصه slug أو title`);
      continue;
    }

    const categorySlug = CATEGORY_SLUG_BY_NAME[meta.category?.trim()];
    const categoryId = categorySlug ? catIdBySlug[categorySlug] : null;
    if (!categoryId) {
      console.warn(`⚠️  ${file}: تصنيف غير معروف "${meta.category}" — سيُزرع بدون تصنيف`);
    }

    // افصل بلوكات FAQ عن باقي المحتوى (FAQ يُخزَّن في عمود مستقل)
    const faqBlock = blocks.find((b) => b.type === "faq");
    const contentBlocks = blocks.filter((b) => b.type !== "faq");
    const faqItems = faqBlock?.items ?? [];

    // ابنِ نسخة نصية بسيطة (content) للتوافق مع أي كود قديم يقرأ content
    const plainContent = contentBlocks
      .map((b) => {
        if (b.type === "heading") return `${"#".repeat(b.level)} ${b.text}`;
        if (b.type === "paragraph" || b.type === "cta") return b.text;
        if (b.type === "note") return `**${b.title}:** ${b.text}`;
        if (b.type === "list") return b.items.map((i) => `- ${i}`).join("\n");
        return "";
      })
      .filter(Boolean)
      .join("\n\n");

    const row = {
      slug: meta.slug,
      title: meta.title,
      excerpt: meta.excerpt ?? null,
      content: plainContent,
      content_blocks: contentBlocks,
      faq: faqItems,
      category_id: categoryId,
      author: DEFAULT_AUTHOR,
      reading_time: meta.reading_time ?? 5,
      meta_title: meta.meta_title ?? meta.title,
      meta_description: meta.meta_description ?? meta.excerpt ?? null,
      keywords: meta.keywords ?? null,
      is_published: true,
      is_featured: false,
      display_order: displayOrder,
      published_at: new Date().toISOString(),
    };

    const { error: upErr } = await supabase
      .from("blog_posts")
      .upsert(row, { onConflict: "slug" });

    if (upErr) {
      console.error(`❌ فشل زرع ${meta.slug}:`, upErr.message);
    } else {
      console.log(`✓ زُرع: ${meta.slug}  [${meta.category}]  (${contentBlocks.length} بلوك، ${faqItems.length} سؤال)`);
      ok++;
      displayOrder += 10;
    }
  }

  console.log(`\n✅ تم زرع ${ok}/${files.length} مقال بنجاح.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("خطأ غير متوقع:", e);
  process.exit(1);
});
