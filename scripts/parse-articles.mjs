// ============================================================
// MDink Solutions — Article Parser
// يحوّل ملفات المقالات (.md بصيغة MDink) إلى بلوكات JSON منظمة
// جاهزة للزرع في عمود content_blocks (jsonb) في قاعدة البيانات.
//
// أنواع البلوكات المُنتَجة:
//   heading   { level: 2|3, text }
//   paragraph { text }               (يدعم <strong> للنص الغامق)
//   list      { style: 'bullet', items: [] }
//   note      { title, text }        (صندوق "معلومة مهمة")
//   cta       { text }               (فقرة الدعوة لاتخاذ إجراء)
//   faq       { items: [{ q, a }] }  (أسئلة وأجوبة → accordion + structured data)
// ============================================================

import { readFileSync } from "node:fs";

/** يحوّل **نص** إلى <strong>نص</strong> بشكل آمن */
function inlineBold(text) {
  return text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/**
 * يحلّل محتوى ملف مقال واحد إلى { meta, blocks }
 * @param {string} raw - المحتوى الخام للملف
 */
export function parseArticle(raw) {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");

  // ---------- 1) استخراج الميتاداتا (الأسطر قبل "Article body:") ----------
  const meta = {};
  const metaKeys = {
    "Title": "title",
    "Slug": "slug",
    "Meta title": "meta_title",
    "Meta description": "meta_description",
    "Excerpt": "excerpt",
    "Category": "category",
    "Keywords": "keywords",
    "Reading time": "reading_time_text",
  };

  let bodyStart = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^Article body\s*:/.test(line)) {
      bodyStart = i + 1;
      break;
    }
    const m = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (m && metaKeys[m[1].trim()]) {
      meta[metaKeys[m[1].trim()]] = m[2].trim();
    }
  }
  if (bodyStart === -1) bodyStart = 0;

  // reading_time كرقم (نأخذ أول رقم في النص)
  const rt = (meta.reading_time_text || "").match(/\d+/);
  meta.reading_time = rt ? parseInt(rt[0], 10) : 5;

  // ---------- 2) فصل جسم المقال عن FAQ وعن الإرشادات ----------
  // نقطع عند "FAQ:" ونتجاهل كل ما بعد "Suggested media"/"Internal links"
  const bodyLines = [];
  const faqLines = [];
  let mode = "body";
  for (let i = bodyStart; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^FAQ\s*:/.test(t)) { mode = "faq"; continue; }
    if (/^(Suggested media|Internal links)/i.test(t)) { mode = "ignore"; continue; }
    if (mode === "body") bodyLines.push(lines[i]);
    else if (mode === "faq") faqLines.push(lines[i]);
  }

  // ---------- 3) تحويل جسم المقال إلى بلوكات ----------
  const blocks = [];
  let uid = 0;
  const nextId = () => `blk-${++uid}`;

  // نقسّم على الأسطر الفارغة إلى "فقرات منطقية"
  const chunks = bodyLines.join("\n").split(/\n{2,}/);

  for (const chunkRaw of chunks) {
    const chunk = chunkRaw.trim();
    if (!chunk) continue;

    // عنوان ### (h3)
    let m = chunk.match(/^###\s+(.*)$/);
    if (m) {
      blocks.push({ id: nextId(), type: "heading", level: 3, text: m[1].trim() });
      continue;
    }
    // عنوان ## (h2)
    m = chunk.match(/^##\s+(.*)$/);
    if (m) {
      blocks.push({ id: nextId(), type: "heading", level: 2, text: m[1].trim() });
      continue;
    }

    // صندوق ملاحظة: يبدأ بـ **... :**
    const noteMatch = chunk.match(/^\*\*(.+?):\*\*\s*([\s\S]*)$/);
    if (noteMatch && /معلومة|ملاحظة|تحذير|مهم/.test(noteMatch[1])) {
      blocks.push({
        id: nextId(),
        type: "note",
        title: noteMatch[1].trim(),
        text: inlineBold(noteMatch[2].trim()),
      });
      continue;
    }

    // قائمة نقطية: كل الأسطر تبدأ بـ - أو • أو *
    const chunkLines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    const allList = chunkLines.length >= 1 && chunkLines.every((l) => /^[-*•]\s+/.test(l));
    if (allList) {
      blocks.push({
        id: nextId(),
        type: "list",
        style: "bullet",
        items: chunkLines.map((l) => inlineBold(l.replace(/^[-*•]\s+/, ""))),
      });
      continue;
    }

    // فقرة CTA (تبدأ بـ "ابدأ" أو تحتوي رابط واتساب/دعوة) — تبقى paragraph لكن بنوع cta
    if (/^(ابدأ|احجز|تواصل|انضم)/.test(chunk) && chunk.length < 400) {
      blocks.push({ id: nextId(), type: "cta", text: inlineBold(chunk) });
      continue;
    }

    // فقرة عادية
    blocks.push({ id: nextId(), type: "paragraph", text: inlineBold(chunk.replace(/\n/g, " ")) });
  }

  // ---------- 4) تحويل FAQ إلى بلوك واحد ----------
  const faqItems = [];
  const faqText = faqLines.join("\n");
  // نمط: **س: ...؟**  يليه سطر/أسطر الإجابة
  const faqRegex = /\*\*س:\s*([\s\S]*?)\*\*\s*\n([\s\S]*?)(?=\n\*\*س:|\s*$)/g;
  let fm;
  while ((fm = faqRegex.exec(faqText)) !== null) {
    const q = fm[1].trim();
    const a = fm[2].trim();
    if (q && a) faqItems.push({ q, a });
  }
  if (faqItems.length) {
    blocks.push({ id: nextId(), type: "faq", items: faqItems });
  }

  return { meta, blocks };
}

// تشغيل مباشر للاختبار: node parse-articles.mjs <file>
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node parse-articles.mjs <article.md>");
    process.exit(1);
  }
  const parsed = parseArticle(readFileSync(file, "utf8"));
  console.log(JSON.stringify(parsed, null, 2));
}
