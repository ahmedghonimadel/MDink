// منقّي HTML بسيط لمحتوى المدونة — يسمح بوسوم التنسيق فقط ويزيل أي شيء خطير
// Simple HTML sanitizer for blog content — allows formatting tags, strips dangerous content

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "h1",
  "h2",
  "h3",
  "h4",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "span",
  "div",
  "img",
]);

const ALLOWED_ATTRS = new Set(["href", "src", "alt", "style", "dir", "target", "rel", "id"]);

/**
 * ينقّي HTML من المحرر الغني قبل عرضه.
 * يزيل <script>, <style>, معالجات الأحداث (onclick), وروابط javascript:
 */
export function sanitizeBlogHtml(html: string): string {
  if (!html) return "";
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    // على الخادم: إزالة الوسوم الخطيرة بشكل أساسي
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/on\w+\s*=\s*"[^"]*"/gi, "")
      .replace(/on\w+\s*=\s*'[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }

  const doc = new DOMParser().parseFromString(html, "text/html");

  function clean(node: Element) {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        // استبدل الوسم غير المسموح بمحتواه النصي
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }
      // نظّف الخصائص
      for (const attr of Array.from(child.attributes)) {
        const name = attr.name.toLowerCase();
        if (!ALLOWED_ATTRS.has(name)) {
          child.removeAttribute(attr.name);
        } else if ((name === "href" || name === "src") && /^\s*javascript:/i.test(attr.value)) {
          child.removeAttribute(attr.name);
        }
      }
      // الروابط الخارجية تفتح بأمان
      if (tag === "a" && child.getAttribute("href")) {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
      clean(child);
    }
  }

  clean(doc.body);
  return doc.body.innerHTML;
}
