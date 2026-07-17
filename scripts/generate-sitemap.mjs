// يولّد public/sitemap.xml تلقائيًا وقت البناء: كل الصفحات العامة + كل مقالات
// المدونة المنشورة (من Supabase). يعمل تلقائيًا قبل كل build عبر npm "prebuild".
// آمن: لو تعذّر الوصول للقاعدة يكتب خريطة الصفحات الثابتة فقط بدون كسر البناء.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "https://mdinksolutions.com";

const STATIC_PAGES = [
  { path: "/", priority: "1.0" },
  { path: "/services", priority: "0.9" },
  { path: "/portfolio", priority: "0.9" },
  { path: "/reviews", priority: "0.8" },
  { path: "/blog", priority: "0.8" },
  { path: "/about", priority: "0.7" },
  { path: "/contact", priority: "0.9" },
  { path: "/links", priority: "0.5" },
];

function env(name) {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(join(ROOT, ".env"), "utf8");
    const m = raw.match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* no .env in CI — rely on process.env */
  }
  return "";
}

const SUPABASE_URL = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
const SUPABASE_KEY =
  env("VITE_SUPABASE_ANON_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY") || env("SUPABASE_ANON_KEY");

function urlEntry(loc, priority, lastmod) {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<priority>${priority}</priority></url>`;
}

async function fetchArticles() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_posts?select=slug,updated_at,published_at&is_published=eq.true&order=display_order.asc`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } },
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows.filter((r) => r?.slug) : [];
  } catch {
    return [];
  }
}

const articles = await fetchArticles();
const entries = [
  ...STATIC_PAGES.map((p) => urlEntry(`${ORIGIN}${p.path}`, p.priority)),
  ...articles.map((a) => {
    const lastmod = String(a.updated_at || a.published_at || "").slice(0, 10);
    const loc = `${ORIGIN}/blog/${encodeURIComponent(a.slug)}`;
    return urlEntry(loc, "0.7", lastmod || undefined);
  }),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

writeFileSync(join(ROOT, "public", "sitemap.xml"), xml, "utf8");
console.log(`[sitemap] ${STATIC_PAGES.length} pages + ${articles.length} articles → public/sitemap.xml`);
