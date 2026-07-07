import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { ImageUpload } from "@/components/ImageUpload";

/**
 * نص قابل للتعديل في مكانه (inline).
 * يظهر النص كما يراه الزائر، وعليه أيقونة قلم صغيرة.
 * عند الضغط على القلم يتحوّل لمربع تعديل في نفس المكان.
 */
export function EditableText({
  value,
  onSave,
  multiline = false,
  className = "",
  placeholder = "اضغط للتعديل",
  as: Tag = "span",
}: {
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
  as?: "span" | "div" | "h1" | "h2" | "h3" | "p";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    onSave(draft);
    setEditing(false);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <span className="relative z-20 block">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel();
            }}
            rows={3}
            className="w-full rounded-lg border-2 border-brand bg-background p-2 text-sm text-foreground shadow-brand outline-none"
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") cancel();
            }}
            className="w-full rounded-lg border-2 border-brand bg-background p-2 text-sm text-foreground shadow-brand outline-none"
          />
        )}
        <span className="mt-1 flex gap-1">
          <button
            onClick={commit}
            className="flex items-center gap-1 rounded-md bg-brand px-2 py-1 text-xs font-medium text-brand-foreground"
          >
            <Check className="h-3 w-3" /> حفظ
          </button>
          <button
            onClick={cancel}
            className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground"
          >
            <X className="h-3 w-3" /> إلغاء
          </button>
        </span>
      </span>
    );
  }

  return (
    <Tag
      className={`group/edit relative inline-block cursor-pointer rounded transition-colors hover:bg-brand/5 ${className}`}
      onClick={() => setEditing(true)}
    >
      {value || <span className="text-muted-foreground">{placeholder}</span>}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className="absolute -top-2 -left-2 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground opacity-0 shadow-md transition-opacity group-hover/edit:opacity-100"
        aria-label="تعديل"
        title="تعديل"
      >
        <Pencil className="h-3 w-3" />
      </button>
    </Tag>
  );
}

/**
 * صورة قابلة للتعديل في مكانها.
 * تعرض الصورة، وعليها زر تعديل صغير يفتح أداة رفع الصور.
 */
export function EditableImage({
  value,
  onSave,
  className = "",
  alt = "",
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
  alt?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="relative z-20 rounded-xl border-2 border-brand bg-background p-3 shadow-brand">
        <ImageUpload value={value} onChange={onSave} />
        <button
          onClick={() => setEditing(false)}
          className="mt-2 flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground"
        >
          <Check className="h-3 w-3" /> تم
        </button>
      </div>
    );
  }

  return (
    <div className="group/img relative inline-block">
      {value ? (
        <img src={value} alt={alt} loading="lazy" className={className} />
      ) : (
        <div
          className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
        >
          لا توجد صورة
        </div>
      )}
      <button
        onClick={() => setEditing(true)}
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-brand text-brand-foreground opacity-0 shadow-md transition-opacity group-hover/img:opacity-100"
        aria-label="تغيير الصورة"
        title="تغيير الصورة"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  );
}
