import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type,
  Heading,
  List,
  Image as ImageIcon,
  Video,
  Info,
  Quote,
  Megaphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ImageUpload";
import type { Block } from "@/components/BlockRenderer";

let counter = 0;
function newId() {
  counter += 1;
  return `blk-${Date.now()}-${counter}`;
}

const BLOCK_TYPES: { type: Block["type"]; label: string; icon: any }[] = [
  { type: "paragraph", label: "فقرة", icon: Type },
  { type: "heading", label: "عنوان", icon: Heading },
  { type: "list", label: "قائمة", icon: List },
  { type: "note", label: "ملاحظة", icon: Info },
  { type: "quote", label: "اقتباس", icon: Quote },
  { type: "image", label: "صورة", icon: ImageIcon },
  { type: "video", label: "فيديو", icon: Video },
  { type: "cta", label: "دعوة CTA", icon: Megaphone },
];

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

interface BlocksEditorProps {
  blocks: Block[];
  onChange: (blocks: Block[]) => void;
}

/**
 * محرر بلوكات المقال للداشبورد.
 * يدعم: إضافة أي نوع بلوك، تعديل محتواه، ترتيبه لأعلى/أسفل، وحذفه.
 * كل تغيير ينعكس فورًا على الحالة الأب عبر onChange.
 */
export function BlocksEditor({ blocks, onChange }: BlocksEditorProps) {
  function update(id: string, patch: Partial<Block>) {
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  }
  function add(type: Block["type"]) {
    onChange([...blocks, makeBlock(type)]);
  }
  function remove(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function move(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= blocks.length) return;
    const copy = [...blocks];
    [copy[idx], copy[to]] = [copy[to], copy[idx]];
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">محتوى المقال (بلوكات)</span>
        <span className="text-xs text-muted-foreground">{blocks.length} بلوك</span>
      </div>

      {/* قائمة البلوكات */}
      <div className="space-y-3">
        {blocks.map((b, i) => (
          <div key={b.id} className="rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {BLOCK_TYPES.find((t) => t.type === b.type)?.label ?? b.type}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(b.id, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="لأعلى"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(b.id, 1)}
                  disabled={i === blocks.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="لأسفل"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(b.id)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <BlockFields block={b} update={(patch) => update(b.id, patch)} />
          </div>
        ))}
        {blocks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            لا توجد بلوكات بعد. أضف أول بلوك من الأزرار بالأسفل.
          </div>
        )}
      </div>

      {/* أزرار إضافة البلوكات */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        {BLOCK_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => add(t.type)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:border-brand/40 hover:text-brand"
          >
            <Plus className="h-3.5 w-3.5" /> <t.icon className="h-3.5 w-3.5" /> {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** حقول تحرير بلوك واحد حسب نوعه */
function BlockFields({ block, update }: { block: Block; update: (patch: any) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => update({ level: Number(e.target.value) })}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
          >
            <option value={2}>عنوان رئيسي (H2)</option>
            <option value={3}>عنوان فرعي (H3)</option>
          </select>
          <Input
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="نص العنوان"
          />
        </div>
      );

    case "paragraph":
      return (
        <Textarea
          value={block.text}
          onChange={(e) => update({ text: e.target.value })}
          placeholder="نص الفقرة… (يمكن استخدام **نص** للتغميق)"
          rows={3}
        />
      );

    case "list":
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={block.style ?? "bullet"}
              onChange={(e) => update({ style: e.target.value })}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="bullet">نقاط</option>
              <option value="number">أرقام</option>
            </select>
          </div>
          {block.items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <Input
                value={it}
                onChange={(e) => {
                  const items = [...block.items];
                  items[idx] = e.target.value;
                  update({ items });
                }}
                placeholder={`عنصر ${idx + 1}`}
              />
              <button
                type="button"
                onClick={() => update({ items: block.items.filter((_, i) => i !== idx) })}
                className="rounded p-2 text-destructive hover:bg-destructive/10"
                aria-label="حذف عنصر"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => update({ items: [...block.items, ""] })}
          >
            <Plus className="ml-1 h-3.5 w-3.5" /> عنصر
          </Button>
        </div>
      );

    case "note":
      return (
        <div className="space-y-2">
          <Input
            value={block.title ?? ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="عنوان الملاحظة (مثل: معلومة مهمة)"
          />
          <Textarea
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="نص الملاحظة"
            rows={2}
          />
        </div>
      );

    case "quote":
      return (
        <div className="space-y-2">
          <Textarea
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="نص الاقتباس"
            rows={2}
          />
          <Input
            value={block.author ?? ""}
            onChange={(e) => update({ author: e.target.value })}
            placeholder="المصدر / القائل (اختياري)"
          />
        </div>
      );

    case "image":
      return (
        <div className="space-y-2">
          <ImageUpload
            value={block.url}
            onChange={(url) => update({ url })}
            label="صورة البلوك"
          />
          <Input
            value={block.caption ?? ""}
            onChange={(e) => update({ caption: e.target.value })}
            placeholder="تعليق أسفل الصورة (اختياري)"
          />
          <Input
            value={block.alt ?? ""}
            onChange={(e) => update({ alt: e.target.value })}
            placeholder="نص بديل alt (للـSEO وإمكانية الوصول)"
          />
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <Input
            value={block.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="رابط الفيديو (YouTube / Shorts / Vimeo / MP4)"
          />
          <Input
            value={block.title ?? ""}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="عنوان/وصف الفيديو (اختياري)"
          />
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

    case "cta":
      return (
        <div className="space-y-2">
          <Textarea
            value={block.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="نص الدعوة (مثل: هل تريد تطوير حضورك الطبي؟)"
            rows={2}
          />
          <div className="grid gap-2 md:grid-cols-2">
            <Input
              value={block.buttonText ?? ""}
              onChange={(e) => update({ buttonText: e.target.value })}
              placeholder="نص الزر"
            />
            <Input
              value={block.buttonUrl ?? ""}
              onChange={(e) => update({ buttonUrl: e.target.value })}
              placeholder="رابط الزر (فارغ = واتساب افتراضي)"
            />
          </div>
        </div>
      );

    default:
      return null;
  }
}
