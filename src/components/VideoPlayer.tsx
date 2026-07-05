import { useState } from "react";
import { Play } from "lucide-react";
import { parseVideoUrl } from "@/lib/video";

interface VideoPlayerProps {
  url: string;
  /** صورة مصغّرة مرفوعة تدوس على التلقائية */
  thumbnail?: string | null;
  title?: string;
  /** فرض الاتجاه (يتجاوز الاكتشاف التلقائي) */
  orientation?: "horizontal" | "vertical";
  className?: string;
  /** يُستدعى عند انتهاء تشغيل فيديو MP4 (للانتقال للتالي في السلايدر) */
  onEnded?: () => void;
  /** يُستدعى عند بدء/إيقاف التشغيل (لإيقاف اللف التلقائي أثناء المشاهدة) */
  onPlayStateChange?: (playing: boolean) => void;
}

/**
 * مشغّل فيديو موحّد لكل الموقع.
 * - YouTube/Vimeo: صورة مصغّرة + زر تشغيل، ثم iframe عند الضغط.
 * - MP4: عنصر <video> بضوابط.
 * - أفقي: إطار 16:9. عمودي (Shorts): إطار موبايل 9:16 محدود العرض.
 * - لا يشغّل تلقائيًا، ولا يعرض iframe مكسور لو الرابط غير صالح.
 */
export function VideoPlayer({
  url,
  thumbnail,
  title,
  orientation,
  className = "",
  onEnded,
  onPlayStateChange,
}: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const v = parseVideoUrl(url);

  if (!v.valid) {
    return (
      <div className={`flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground ${className}`}>
        {title || "فيديو غير متاح"}
      </div>
    );
  }

  const dir = orientation || v.orientation;
  const isVertical = dir === "vertical";
  const poster = thumbnail || v.thumbnail;

  // الإطار: عمودي بعرض محدود يشبه الموبايل، أفقي 16:9 كامل العرض
  const frameClass = isVertical
    ? "relative mx-auto w-full max-w-[300px] overflow-hidden rounded-3xl bg-black shadow-card"
    : "relative w-full overflow-hidden rounded-2xl bg-black shadow-card";
  const ratioStyle = isVertical
    ? { aspectRatio: "9 / 16" }
    : { aspectRatio: "16 / 9" };

  // ملف MP4 مباشر
  if (v.kind === "file") {
    return (
      <div className={`${frameClass} ${className}`} style={ratioStyle}>
        <video
          src={v.embedUrl}
          poster={poster || undefined}
          controls
          playsInline
          onPlay={() => onPlayStateChange?.(true)}
          onPause={() => onPlayStateChange?.(false)}
          onEnded={() => {
            onPlayStateChange?.(false);
            onEnded?.();
          }}
          className="h-full w-full object-contain"
        />
      </div>
    );
  }

  // YouTube / Vimeo
  return (
    <div className={`${frameClass} ${className}`} style={ratioStyle}>
      {playing ? (
        <iframe
          src={`${v.embedUrl}${v.embedUrl.includes("?") ? "&" : "?"}autoplay=1`}
          title={title || "video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setPlaying(true);
            onPlayStateChange?.(true);
          }}
          className="group absolute inset-0 flex h-full w-full items-center justify-center"
          aria-label={title ? `تشغيل: ${title}` : "تشغيل الفيديو"}
        >
          {poster ? (
            <img
              src={poster}
              alt={title || ""}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 gradient-hero opacity-90" />
          )}
          <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/40" />
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-brand transition-transform group-hover:scale-110">
            <Play className="h-7 w-7 translate-x-0.5 text-brand" fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  );
}
