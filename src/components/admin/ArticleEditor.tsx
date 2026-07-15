import { useRef, useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Heading,
  List as ListIcon,
  Image as ImageIcon,
  Video as VideoIcon,
  Info,
  Quote,
  Megaphone,
  CalendarDays,
  Save,
  Star,
  HelpCircle,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/ImageUpload";
import { VideoUpload } from "@/components/VideoUpload";
import type { Block } from "@/components/BlockRenderer";
import type { FaqItem } from "@/components/FaqAccordion";

/**
 * محرّر المقال — بوب أب كبير يشبه صفحة المقال للزائر. كل العناصر تُضاف وتُعدَّل
 * في مكانها مباشرةً داخل المقال (بدون بوب أب متداخل): خيارات العناصر تظهر ثابتة
 * فوق مكان الإضافة، وحقول كل عنصر تُحرَّر في مكانها. البلوكات نفس نموذج
 * content_blocks فمخرجاته متوافقة تمامًا مع صفحة العرض العامة.
 */

let counter = 0;
function newId() {
  counter += 1;
  return `blk-${Date.now()}-${counter}`;
}

function makeBlock(type: Block["type"]): Block {
  const id = newId();
  switch (type) {
    case "heading":
      return { id, type: "heading", level: 2, text: "" };
    case "list":
      return { id, type: "list", style: "bullet", items: [""] };
    case "note":
      return { id, type: "note", title: "معلومة مهمة", text: "" };
    case "quote":
      return { id, type: "quote", text: "", author: "" };
    case "image":
      return { id, type: "image", url: "", alt: "", caption: "" };
    case "video":
      return { id, type: "video", url: "", title: "", thumbnail: "" };
    case "cta":
      return { id, type: "cta", text: "", buttonText: "", buttonUrl: "" };
    default:
      return { id, type: "paragraph", text: "" };
  }
}

const PICKER: { type: Block["type"]; label: string; icon: any; hint: string }[] = [
  { type: "paragraph", label: "فقرة", icon: Type, hint: "نص عادي تكتبه مباشرة" },
  { type: "heading", label: "عنوان قسم", icon: Heading, hint: "عنوان فرعي للقسم" },
  { type: "image", label: "صورة", icon: ImageIcon, hint: "رفع أو رابط" },
  { type: "video", label: "فيديو", icon: VideoIcon, hint: "رفع أو رابط" },
  { type: "list", label: "نقاط", icon: ListIcon, hint: "قائمة نقاط/أرقام" },
  { type: "quote", label: "اقتباس", icon: Quote, hint: "اقتباس مميّز" },
  { type: "note", label: "ملاحظة", icon: Info, hint: "صندوق معلومة" },
  { type: "cta", label: "زر دعوة", icon: Megaphone, hint: "دعوة للتواصل" },
];

type Category = { id: string; name: string; name_en?: string | null; is_active?: boolean };

interface ArticleEditorProps {
  open: boolean;
  onClose: () => void;
  form: any;
  patch: (p: Record<string, any>) => void;
  blocks: Block[];
  setBlocks: (b: Block[]) => void;
  faq: FaqItem[];
  setFaq: (f: FaqItem[]) => void;
  categories: Category[];
  editingId: string | null;
  saving: boolean;
  onSave: () => void;
}

export function ArticleEditor({
  open,
  onClose,
  form,
  patch,
  blocks,
  setBlocks,
  faq,
  setFaq,
  categories,
  editingId,
  saving,
  onSave,
}: ArticleEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newCat, setNewCat] = useState(false);

  if (!open) return null;

  function updateBlock(id: string, p: Partial<Block>) {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...p } as Block) : b)));
  }
  function removeBlock(id: string) {
    setBlocks(blocks.filter((b) => b.id !== id));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[to]] = [copy[to], copy[idx]];
    setBlocks(copy);
  }
  function insertAt(index: number, type: Block["type"]) {
    const copy = [...blocks];
    copy.splice(index, 0, makeBlock(type));
    setBlocks(copy);
  }

  const todayLabel = form.published_at
    ? new Date(form.published_at).toLocaleDateString("ar-EG", { dateStyle: "long" })
    : "يُضاف تلقائيًا عند النشر";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-2 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir="rtl"
    >
      <div className="my-4 w-full max-w-3xl rounded-3xl border border-border bg-background shadow-2xl">
        {/* رأس البوب أب */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
          <h3 className="text-lg font-bold">{editingId ? "✍️ تعديل المقال" : "✍️ مقال جديد"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* جسم المقال — يشبه صفحة الزائر */}
        <article className="px-5 py-6 sm:px-10 sm:py-8">
          {form.category_ar ? (
            <span className="mb-4 inline-block rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
              {form.category_ar}
            </span>
          ) : null}

          {/* العنوان */}
          <AutoTextarea
            value={form.title_ar || ""}
            onChange={(v) => patch({ title_ar: v })}
            placeholder="عنوان المقال…"
            className="block w-full resize-none border-0 bg-transparent p-0 text-3xl font-extrabold leading-tight text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-4xl"
          />

          {/* صورة الغلاف */}
          <div className="mt-6">
            {form.cover_image_url ? (
              <div className="group/cover relative overflow-hidden rounded-2xl border border-border">
                <img src={form.cover_image_url} alt={form.title_ar || ""} className="w-full object-cover" />
                <button
                  type="button"
                  onClick={() => patch({ cover_image_url: "" })}
                  className="absolute left-2 top-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover/cover:opacity-100"
                >
                  إزالة الصورة
                </button>
              </div>
            ) : (
              <ImageUpload
                label="صورة الغلاف (تظهر تحت العنوان)"
                value={form.cover_image_url || ""}
                onChange={(v) => patch({ cover_image_url: v })}
                folder="blog"
              />
            )}
          </div>

          {/* التاريخ + الناشر */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border pb-6 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">MDink Solutions</span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> {todayLabel}
            </span>
          </div>

          {/* البلوكات — كلها تُحرَّر في مكانها */}
          <div className="mt-6 space-y-1">
            <AddBar onInsert={(t) => insertAt(0, t)} />
            {blocks.map((b, i) => (
              <div key={b.id}>
                <BlockShell
                  index={i}
                  total={blocks.length}
                  onUp={() => moveBlock(b.id, -1)}
                  onDown={() => moveBlock(b.id, 1)}
                  onDelete={() => removeBlock(b.id)}
                >
                  <BlockBody block={b} update={(p) => updateBlock(b.id, p)} />
                </BlockShell>
                <AddBar onInsert={(t) => insertAt(i + 1, t)} />
              </div>
            ))}
            {blocks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                ابدأ بإضافة أول عنصر من الأزرار فوق.
              </div>
            )}
          </div>

          {/* الأسئلة الشائعة */}
          <div className="mt-10 border-t border-border pt-6">
            <div className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
              <HelpCircle className="h-5 w-5 text-brand" /> الأسئلة الشائعة (آخر المقال)
            </div>
            <FaqInline items={faq} onChange={setFaq} />
          </div>
        </article>

        {/* شريط الحفظ السفلي */}
        <div className="sticky bottom-0 z-10 rounded-b-3xl border-t border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">التصنيف</label>
              {newCat ? (
                <div className="flex gap-2">
                  <Input
                    autoFocus
                    value={form.category_ar || ""}
                    onChange={(e) => patch({ category_ar: e.target.value })}
                    placeholder="اسم تصنيف جديد…"
                  />
                  <Button size="sm" variant="ghost" onClick={() => setNewCat(false)}>
                    القائمة
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <select
                    value={form.category_ar || ""}
                    onChange={(e) => {
                      const sel = categories.find((c) => c.name === e.target.value);
                      patch({ category_ar: e.target.value, category_en: sel?.name_en ?? form.category_en });
                    }}
                    className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
                  >
                    <option value="">— اختر تصنيفًا —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                        {c.is_active === false ? " (مخفي)" : ""}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => { setNewCat(true); patch({ category_ar: "" }); }}>
                    <Plus className="ml-1 h-4 w-4" /> جديد
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="mb-1.5 block text-sm font-medium">الحالة</label>
                <select
                  value={form.status}
                  onChange={(e) => patch({ status: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  <option value="draft">مسودة (غير ظاهرة)</option>
                  <option value="published">منشور</option>
                </select>
              </div>
              <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm">
                <input type="checkbox" checked={!!form.is_featured} onChange={(e) => patch({ is_featured: e.target.checked })} />
                <Star className="h-4 w-4 text-accent" /> مميّز
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition ${showAdvanced ? "rotate-180" : ""}`} />
            خيارات متقدمة (الرابط وSEO — تُضبط تلقائيًا)
          </button>
          {showAdvanced && (
            <div className="mt-3 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
              <LabeledInput label="الرابط Slug (فارغ = تلقائي)" value={form.slug || ""} onChange={(v) => patch({ slug: v })} dir="ltr" placeholder="auto" />
              <LabeledInput label="Title English (اختياري)" value={form.title_en || ""} onChange={(v) => patch({ title_en: v })} dir="ltr" />
              <LabeledInput label="مقتطف قصير (فارغ = تلقائي)" value={form.excerpt_ar || ""} onChange={(v) => patch({ excerpt_ar: v })} />
              <LabeledInput label="Excerpt English (اختياري)" value={form.excerpt_en || ""} onChange={(v) => patch({ excerpt_en: v })} dir="ltr" />
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-5 py-2 text-sm font-medium hover:bg-accent">
              إلغاء
            </button>
            <Button onClick={onSave} disabled={saving} className="gradient-hero text-brand-foreground shadow-brand">
              <Save className="ml-1.5 h-4 w-4" />
              {saving ? "جاري الحفظ…" : editingId ? "حفظ المقال ✓" : "نشر المقال ✓"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── inline add bar: خيارات العناصر ثابتة في مكان الإضافة (بدون بوب أب) ───────── */
function AddBar({ onInsert }: { onInsert: (t: Block["type"]) => void }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <div className="flex justify-center py-1">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground opacity-70 transition hover:border-brand/50 hover:text-brand hover:opacity-100"
        >
          <Plus className="h-3.5 w-3.5" /> إضافة عنصر
        </button>
      </div>
    );
  }
  return (
    <div className="my-1 rounded-2xl border border-border bg-card p-2">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-muted-foreground">اختر العنصر:</span>
        <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-muted-foreground hover:bg-accent" aria-label="إغلاق">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {PICKER.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => {
              onInsert(t.type);
              setOpen(false);
            }}
            className="flex flex-col items-center gap-1 rounded-xl border border-border p-2.5 text-center transition hover:border-brand/50 hover:bg-brand/5"
          >
            <t.icon className="h-5 w-5 text-brand" />
            <span className="text-xs font-semibold">{t.label}</span>
            <span className="text-[10px] leading-tight text-muted-foreground">{t.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── per-block wrapper with hover controls ───────── */
function BlockShell({
  children,
  index,
  total,
  onUp,
  onDown,
  onDelete,
}: {
  children: React.ReactNode;
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group/blk relative rounded-xl transition hover:bg-muted/30">
      <div className="absolute -right-1 top-1 z-10 flex flex-col gap-0.5 opacity-0 transition group-hover/blk:opacity-100">
        <IconBtn onClick={onUp} disabled={index === 0} label="لأعلى"><ArrowUp className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn onClick={onDown} disabled={index === total - 1} label="لأسفل"><ArrowDown className="h-3.5 w-3.5" /></IconBtn>
        <IconBtn onClick={onDelete} label="حذف" danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
      </div>
      <div className="px-1 py-1.5">{children}</div>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, label, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md border border-border bg-background p-1 shadow-sm hover:bg-accent disabled:opacity-30 ${danger ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground"}`}
    >
      {children}
    </button>
  );
}

/* ───────── in-place editor for each block type ───────── */
function BlockBody({ block, update }: { block: Block; update: (p: any) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="flex items-center gap-2">
          <select
            value={block.level}
            onChange={(e) => update({ level: Number(e.target.value) })}
            className="h-8 rounded-md border border-border bg-background px-1.5 text-xs text-muted-foreground"
            title="مستوى العنوان"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <AutoTextarea
            value={block.text}
            onChange={(v) => update({ text: v })}
            placeholder="عنوان القسم…"
            className={`block flex-1 resize-none border-0 border-r-4 border-brand bg-transparent py-0 pr-3 font-extrabold text-foreground outline-none placeholder:text-muted-foreground/40 ${
              block.level === 3 ? "text-xl" : "text-2xl sm:text-3xl"
            }`}
          />
        </div>
      );
    case "paragraph":
      return (
        <AutoTextarea
          value={block.text}
          onChange={(v) => update({ text: v })}
          placeholder="اكتب فقرتك هنا…"
          className="block w-full resize-none border-0 bg-transparent p-0 text-base leading-loose text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-lg"
        />
      );
    case "list":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <select
              value={block.style ?? "bullet"}
              onChange={(e) => update({ style: e.target.value })}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground"
            >
              <option value="bullet">نقاط •</option>
              <option value="number">أرقام ١٢٣</option>
            </select>
            <span className="text-xs text-muted-foreground">قائمة</span>
          </div>
          <ul className="space-y-1.5">
            {block.items.map((it, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-brand">{block.style === "number" ? `${idx + 1}.` : "•"}</span>
                <input
                  value={it}
                  onChange={(e) => {
                    const items = [...block.items];
                    items[idx] = e.target.value;
                    update({ items });
                  }}
                  placeholder={`عنصر ${idx + 1}`}
                  className="flex-1 border-0 border-b border-transparent bg-transparent py-0.5 text-base text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-border"
                />
                <button
                  type="button"
                  onClick={() => update({ items: block.items.filter((_, i) => i !== idx) })}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label="حذف عنصر"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <Button type="button" size="sm" variant="outline" onClick={() => update({ items: [...block.items, ""] })}>
            <Plus className="ml-1 h-3.5 w-3.5" /> عنصر
          </Button>
        </div>
      );
    case "image":
      return (
        <div className="space-y-2">
          {block.url ? (
            <figure className="group/img relative overflow-hidden rounded-2xl border border-border shadow-card">
              <img src={block.url} alt={block.alt || ""} className="w-full object-cover" />
              <button
                type="button"
                onClick={() => update({ url: "" })}
                className="absolute left-2 top-2 rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white opacity-0 transition group-hover/img:opacity-100"
              >
                تغيير الصورة
              </button>
            </figure>
          ) : (
            <ImageUpload label="صورة داخل المقال — ارفع من جهازك أو الصق رابط" value={block.url} onChange={(url) => update({ url })} folder="blog" />
          )}
          <input
            value={block.caption ?? ""}
            onChange={(e) => update({ caption: e.target.value })}
            placeholder="تعليق أسفل الصورة (اختياري)"
            className="block w-full border-0 bg-transparent py-1 text-center text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <input
            value={block.alt ?? ""}
            onChange={(e) => update({ alt: e.target.value })}
            placeholder="وصف الصورة alt (مهم للسيو)"
            className="block w-full rounded-md border border-dashed border-border bg-transparent px-2 py-1 text-xs text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      );
    case "video":
      return (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-brand">
            <VideoIcon className="h-4 w-4" /> فيديو
          </div>
          <VideoUpload
            label="ارفع من جهازك أو الصق رابط (YouTube / Shorts / Vimeo / MP4)"
            value={block.url}
            onChange={(url) => update({ url })}
            folder="blog"
          />
          <Input value={block.title ?? ""} onChange={(e) => update({ title: e.target.value })} placeholder="عنوان/وصف الفيديو (اختياري)" />
          <select
            value={block.orientation ?? ""}
            onChange={(e) => update({ orientation: e.target.value || undefined })}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value="">الاتجاه: تلقائي</option>
            <option value="horizontal">أفقي (16:9)</option>
            <option value="vertical">عمودي (Shorts/موبايل)</option>
          </select>
        </div>
      );
    case "quote":
      return (
        <blockquote className="rounded-2xl border-r-4 border-brand bg-muted/40 p-4">
          <AutoTextarea
            value={block.text}
            onChange={(v) => update({ text: v })}
            placeholder="نص الاقتباس…"
            className="block w-full resize-none border-0 bg-transparent p-0 text-base italic text-foreground outline-none placeholder:text-muted-foreground/40"
          />
          <input
            value={block.author ?? ""}
            onChange={(e) => update({ author: e.target.value })}
            placeholder="— المصدر (اختياري)"
            className="mt-2 block w-full border-0 bg-transparent p-0 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </blockquote>
      );
    case "note":
      return (
        <div className="rounded-2xl border border-brand/25 bg-brand/5 p-4">
          <input
            value={block.title ?? ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="عنوان الملاحظة"
            className="mb-1 block w-full border-0 bg-transparent p-0 text-sm font-bold text-brand outline-none placeholder:text-brand/40"
          />
          <AutoTextarea
            value={block.text}
            onChange={(v) => update({ text: v })}
            placeholder="نص الملاحظة…"
            className="block w-full resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/40"
          />
        </div>
      );
    case "cta":
      return (
        <div className="rounded-2xl gradient-hero p-5 text-center text-brand-foreground">
          <AutoTextarea
            value={block.text}
            onChange={(v) => update({ text: v })}
            placeholder="نص الدعوة (مثل: هل تريد تطوير حضورك الطبي؟)"
            className="block w-full resize-none border-0 bg-transparent p-0 text-center text-base font-semibold text-brand-foreground outline-none placeholder:text-brand-foreground/60"
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={block.buttonText ?? ""} onChange={(e) => update({ buttonText: e.target.value })} placeholder="نص الزر" className="bg-white/90 text-foreground" />
            <Input value={block.buttonUrl ?? ""} onChange={(e) => update({ buttonUrl: e.target.value })} placeholder="رابط الزر (فارغ = واتساب)" dir="ltr" className="bg-white/90 text-foreground" />
          </div>
        </div>
      );
    default:
      return null;
  }
}

/* ───────── FAQ inline ───────── */
function FaqInline({ items, onChange }: { items: FaqItem[]; onChange: (f: FaqItem[]) => void }) {
  function update(i: number, p: Partial<FaqItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...p } : it)));
  }
  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">سؤال {i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              aria-label="حذف السؤال"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <input
            value={it.q}
            onChange={(e) => update(i, { q: e.target.value })}
            placeholder="السؤال"
            className="mb-2 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold outline-none"
          />
          <textarea
            value={it.a}
            onChange={(e) => update(i, { a: e.target.value })}
            placeholder="الجواب"
            rows={2}
            className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none"
          />
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, { q: "", a: "" }])}>
        <Plus className="ml-1 h-3.5 w-3.5" /> إضافة سؤال
      </Button>
    </div>
  );
}

/* ───────── helpers ───────── */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      dir="rtl"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
    />
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  dir = "rtl",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} dir={dir} placeholder={placeholder} />
    </div>
  );
}
