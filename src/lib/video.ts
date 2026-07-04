// ============================================================
// MDink Solutions — Unified Video Helper
// يحوّل أي رابط فيديو (YouTube عادي/قصير/Shorts، Vimeo، MP4 مباشر)
// إلى معلومات تشغيل موحّدة: نوع، رابط embed، اتجاه (أفقي/عمودي)، صورة مصغّرة.
// يُستخدم في: بلوكات المقال، فيديو الهوم، شهادات الفيديو.
// ============================================================

export type VideoKind = "youtube" | "vimeo" | "file" | "unknown";
export type VideoOrientation = "horizontal" | "vertical";

export interface ParsedVideo {
  kind: VideoKind;
  /** رابط جاهز للتضمين في <iframe> (YouTube/Vimeo) أو للتشغيل المباشر (MP4) */
  embedUrl: string;
  /** المعرّف الأصلي (YouTube video id) إن وُجد */
  id: string | null;
  /** رابط صورة مصغّرة تلقائية (YouTube فقط) — قد يُستبدل بصورة مرفوعة */
  thumbnail: string | null;
  /** أفقي 16:9 أو عمودي 9:16 (Shorts) */
  orientation: VideoOrientation;
  /** هل الرابط صالح للعرض؟ */
  valid: boolean;
}

const YT_ID = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d+)/;
const FILE_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

/**
 * يحلّل رابط فيديو إلى معلومات تشغيل موحّدة.
 * @param url رابط الفيديو من الداشبورد
 * @param opts خيارات: hint للاتجاه، وقت البدء
 */
export function parseVideoUrl(url: string | null | undefined): ParsedVideo {
  const empty: ParsedVideo = {
    kind: "unknown",
    embedUrl: "",
    id: null,
    thumbnail: null,
    orientation: "horizontal",
    valid: false,
  };
  if (!url || typeof url !== "string") return empty;
  const clean = url.trim();
  if (!clean) return empty;

  // YouTube (بما فيها Shorts)
  const yt = clean.match(YT_ID);
  if (yt) {
    const id = yt[1];
    // Shorts = عمودي
    const isShorts = /\/shorts\//i.test(clean);
    return {
      kind: "youtube",
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      orientation: isShorts ? "vertical" : "horizontal",
      valid: true,
    };
  }

  // Vimeo
  const vm = clean.match(VIMEO_ID);
  if (vm) {
    return {
      kind: "vimeo",
      id: vm[1],
      embedUrl: `https://player.vimeo.com/video/${vm[1]}`,
      thumbnail: null,
      orientation: "horizontal",
      valid: true,
    };
  }

  // ملف مباشر (MP4 …)
  if (FILE_EXT.test(clean) || clean.startsWith("blob:") || clean.includes("/storage/")) {
    return {
      kind: "file",
      id: null,
      embedUrl: clean,
      thumbnail: null,
      orientation: "horizontal",
      valid: true,
    };
  }

  return empty;
}

/** هل الرابط فيديو صالح؟ (للتحقق في نماذج الداشبورد) */
export function isValidVideoUrl(url: string | null | undefined): boolean {
  return parseVideoUrl(url).valid;
}
