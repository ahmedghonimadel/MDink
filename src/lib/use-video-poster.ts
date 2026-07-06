import { useEffect, useState } from "react";
import { parseVideoUrl } from "./video";

/**
 * يلتقط إطارًا من فيديو MP4 مباشر (Storage) ويعيده كـ data URL لاستخدامه
 * صورة مصغّرة/بوستر عندما لا توجد صورة مرفوعة. يعمل فقط لملفات الفيديو
 * (ليس YouTube/Vimeo) ويتطلب أن يسمح الخادم بـ CORS — وإلا يعيد null بهدوء.
 */
export function useVideoPoster(url?: string | null): string | null {
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    setPoster(null);
    const v = parseVideoUrl(url);
    if (!url || v.kind !== "file" || typeof document === "undefined") return;

    let cancelled = false;
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "metadata";
    video.src = url;

    const seek = () => {
      // إطار من منتصف الثانية الأولى — يتجنّب الإطار الأسود الأول غالبًا
      const t = Math.min(1, (video.duration || 2) / 2);
      try {
        video.currentTime = t;
      } catch {
        /* بعض المتصفحات ترفض seek مبكرًا — نتجاهل */
      }
    };
    const capture = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setPoster(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        /* canvas ملوّث (CORS) أو غير مدعوم — نتركه ليقع على البديل */
      }
    };

    video.addEventListener("loadedmetadata", seek);
    video.addEventListener("seeked", capture);
    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", seek);
      video.removeEventListener("seeked", capture);
      video.src = "";
    };
  }, [url]);

  return poster;
}
