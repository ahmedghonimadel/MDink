import { useRef, useState } from "react";
import { Upload, X, Link2, Loader2 } from "lucide-react";
import { uploadMedia, ACCEPT_IMAGE } from "@/lib/upload";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  accept?: string;
  className?: string;
};

/**
 * رفع صورة بالسحب والإفلات أو الاختيار من الجهاز، مع خيار URL يدوي.
 * Preview فوري + إمكانية الحذف.
 */
export function ImageUpload({
  value,
  onChange,
  folder = "general",
  label,
  accept = ACCEPT_IMAGE,
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
      const url = await uploadMedia(file, folder);
      onChange(url);
      toast.success("تم رفع الصورة");
    } catch (e: any) {
      toast.error(e?.message || "تعذر رفع الصورة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      {label ? <div className="mb-1.5 text-sm font-medium">{label}</div> : null}

      {value ? (
        <div className="group relative inline-block">
          <img
            src={value}
            alt=""
            className="h-32 w-full max-w-xs rounded-xl border border-border object-cover"
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md transition hover:scale-110"
            aria-label="حذف الصورة"
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
          className={`flex h-32 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition ${
            dragOver
              ? "border-brand bg-brand/5"
              : "border-border hover:border-brand/40 hover:bg-accent/40"
          }`}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          ) : (
            <>
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">اسحب صورة هنا أو اضغط للرفع</span>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setShowUrl((s) => !s)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-brand"
        >
          <Link2 className="h-3 w-3" /> أو أدخل رابط صورة
        </button>
        {showUrl ? (
          <input
            type="url"
            dir="ltr"
            placeholder="https://..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1.5 w-full max-w-xs rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          />
        ) : null}
      </div>
    </div>
  );
}
