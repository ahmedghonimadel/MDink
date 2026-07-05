import { useRef, useState } from "react";
import { Upload, X, Link2, Loader2 } from "lucide-react";
import { uploadVideo, ACCEPT_VIDEO } from "@/lib/upload";
import { parseVideoUrl } from "@/lib/video";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  className?: string;
};

/**
 * رفع فيديو من الجهاز (بالسحب أو الاختيار) مع خيار لصق رابط
 * (YouTube / Shorts / Vimeo / MP4). Preview فوري + إمكانية الحذف.
 * الملف المرفوع يُخزَّن على Supabase Storage ويُرجَّع رابطه العام.
 */
export function VideoUpload({
  value,
  onChange,
  folder = "videos",
  label,
  className = "",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadVideo(file, folder);
      onChange(url);
      toast.success("تم رفع الفيديو");
    } catch (e: any) {
      toast.error(e?.message || "تعذر رفع الفيديو");
    } finally {
      setBusy(false);
    }
  }

  const parsed = parseVideoUrl(value);
  const isFile = parsed.kind === "file";

  return (
    <div className={className}>
      {label ? <div className="mb-1.5 text-sm font-medium">{label}</div> : null}

      {value ? (
        <div className="group relative inline-block w-full max-w-xs">
          {isFile ? (
            <video
              src={value}
              controls
              playsInline
              className="h-40 w-full rounded-xl border border-border bg-black object-contain"
            />
          ) : (
            <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-center">
              {parsed.thumbnail ? (
                <img
                  src={parsed.thumbnail}
                  alt=""
                  className="h-24 w-full rounded-lg object-cover"
                />
              ) : null}
              <span className="truncate text-xs text-muted-foreground" dir="ltr">
                {parsed.valid ? `رابط ${parsed.kind}` : "رابط غير صالح"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md transition hover:scale-110"
            aria-label="حذف الفيديو"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`flex h-40 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/40 hover:bg-accent/40"
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="h-6 w-6 animate-spin text-brand" />
              <span className="text-xs text-muted-foreground">جاري رفع الفيديو...</span>
            </>
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اسحب فيديو هنا أو اضغط للرفع</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_VIDEO}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
        >
          <Link2 className="h-3 w-3" /> أو أدخل رابط فيديو (YouTube / Vimeo / MP4)
        </button>
        {showUrl ? (
          <input
            type="url"
            dir="ltr"
            placeholder="https://youtube.com/watch?v=..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1.5 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        ) : null}
      </div>
    </div>
  );
}
