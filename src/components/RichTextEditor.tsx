import { useRef, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
  Type,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  dir?: "rtl" | "ltr";
};

// محرر نصوص غني (زي Word) — تحكم كامل في حجم الخط، العريض، العناوين، القوائم، الروابط
export function RichTextEditor({ value, onChange, placeholder, dir = "rtl" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [showFontSize, setShowFontSize] = useState(false);

  // اضبط المحتوى الأولي مرة واحدة فقط (تجنب فقدان مكان المؤشر)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function exec(command: string, arg?: string) {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emit();
  }

  function emit() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function setFontSize(size: string) {
    // غلّف التحديد في span بحجم الخط المطلوب
    exec("fontSize", "7"); // قيمة مؤقتة
    if (ref.current) {
      ref.current.querySelectorAll('font[size="7"]').forEach((el) => {
        const span = document.createElement("span");
        span.style.fontSize = size;
        span.innerHTML = el.innerHTML;
        el.replaceWith(span);
      });
      emit();
    }
    setShowFontSize(false);
  }

  function addLink() {
    const url = prompt(dir === "rtl" ? "أدخل الرابط (URL):" : "Enter URL:");
    if (url) exec("createLink", url);
  }

  const fontSizes = [
    { label: dir === "rtl" ? "صغير جداً" : "X-Small", size: "12px" },
    { label: dir === "rtl" ? "صغير" : "Small", size: "14px" },
    { label: dir === "rtl" ? "عادي" : "Normal", size: "16px" },
    { label: dir === "rtl" ? "متوسط" : "Medium", size: "20px" },
    { label: dir === "rtl" ? "كبير" : "Large", size: "24px" },
    { label: dir === "rtl" ? "كبير جداً" : "X-Large", size: "32px" },
    { label: dir === "rtl" ? "ضخم" : "Huge", size: "40px" },
  ];

  const btn =
    "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background">
      {/* شريط الأدوات */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1.5">
        <button type="button" onClick={() => exec("bold")} className={btn} title="عريض">
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("italic")} className={btn} title="مائل">
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("underline")} className={btn} title="تحته خط">
          <Underline className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* حجم الخط */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontSize((v) => !v)}
            className="flex h-9 items-center gap-1 rounded-md px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="حجم الخط"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs">{dir === "rtl" ? "حجم" : "Size"}</span>
          </button>
          {showFontSize ? (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowFontSize(false)} />
              <div className="absolute z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card shadow-card">
                {fontSizes.map((fs) => (
                  <button
                    key={fs.size}
                    type="button"
                    onClick={() => setFontSize(fs.size)}
                    className="block w-full px-3 py-2 text-right text-sm hover:bg-accent"
                    style={{ fontSize: fs.size === "40px" ? "24px" : fs.size }}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* العناوين */}
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h1>")}
          className={btn}
          title="عنوان 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h2>")}
          className={btn}
          title="عنوان 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<h3>")}
          className={btn}
          title="عنوان 3"
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<p>")}
          className="flex h-9 items-center rounded-md px-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          title="نص عادي"
        >
          {dir === "rtl" ? "عادي" : "Body"}
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        {/* القوائم */}
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className={btn}
          title="قائمة نقطية"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("insertOrderedList")}
          className={btn}
          title="قائمة مرقمة"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => exec("formatBlock", "<blockquote>")}
          className={btn}
          title="اقتباس"
        >
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" onClick={addLink} className={btn} title="إضافة رابط">
          <LinkIcon className="h-4 w-4" />
        </button>

        <div className="mx-1 h-6 w-px bg-border" />

        <button type="button" onClick={() => exec("undo")} className={btn} title="تراجع">
          <Undo className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => exec("redo")} className={btn} title="إعادة">
          <Redo className="h-4 w-4" />
        </button>
      </div>

      {/* منطقة الكتابة */}
      <div
        ref={ref}
        contentEditable
        dir={dir}
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="prose-editor min-h-[260px] max-w-none px-4 py-3 text-sm leading-relaxed outline-none"
        style={{ direction: dir }}
        suppressContentEditableWarning
      />
    </div>
  );
}
