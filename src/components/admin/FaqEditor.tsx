import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { FaqItem } from "@/components/FaqAccordion";

interface FaqEditorProps {
  items: FaqItem[];
  onChange: (items: FaqItem[]) => void;
}

/**
 * محرر الأسئلة الشائعة (FAQ) في نهاية المقال.
 * الأدمن يقدر يزوّد/يقلّل الأسئلة، يعدّل السؤال والجواب، ويرتّبهم.
 */
export function FaqEditor({ items, onChange }: FaqEditorProps) {
  function update(i: number, patch: Partial<FaqItem>) {
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function add() {
    onChange([...items, { q: "", a: "" }]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const to = i + dir;
    if (to < 0 || to >= items.length) return;
    const copy = [...items];
    [copy[i], copy[to]] = [copy[to], copy[i]];
    onChange(copy);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-bold">
          <HelpCircle className="h-4 w-4 text-brand" /> الأسئلة الشائعة (آخر المقال)
        </span>
        <span className="text-xs text-muted-foreground">{items.length} سؤال</span>
      </div>

      <div className="space-y-3">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border bg-background p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">سؤال {i + 1}</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="لأعلى"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-accent disabled:opacity-30"
                  aria-label="لأسفل"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label="حذف السؤال"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Input
                value={it.q}
                onChange={(e) => update(i, { q: e.target.value })}
                placeholder="السؤال"
              />
              <Textarea
                value={it.a}
                onChange={(e) => update(i, { a: e.target.value })}
                placeholder="الجواب"
                rows={2}
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            لا توجد أسئلة بعد. أضف سؤالًا ليظهر في نهاية المقال.
          </div>
        )}
      </div>

      <Button type="button" size="sm" variant="outline" onClick={add}>
        <Plus className="ml-1 h-3.5 w-3.5" /> إضافة سؤال
      </Button>
    </div>
  );
}
