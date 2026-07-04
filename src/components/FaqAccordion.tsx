import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

interface FaqAccordionProps {
  items: FaqItem[];
  title?: string;
}

/**
 * أكورديون الأسئلة الشائعة في نهاية المقال.
 * كل سؤال يفتح/يقفل جوابه. تصميم MDink (أزرق/أبيض).
 * البيانات المهيكلة (FAQPage JSON-LD) تُضاف من صفحة المقال في <head>.
 */
export function FaqAccordion({ items, title = "أسئلة شائعة" }: FaqAccordionProps) {
  const [open, setOpen] = useState<number | null>(0);

  if (!Array.isArray(items) || items.length === 0) return null;

  return (
    <section className="mt-12" dir="rtl">
      <div className="mb-5 inline-flex items-center gap-2 text-xl font-extrabold">
        <HelpCircle className="h-5 w-5 text-brand" />
        {title}
      </div>
      <div className="space-y-3">
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-brand/30"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 p-5 text-right"
                aria-expanded={isOpen}
              >
                <span className="font-bold text-foreground">{item.q}</span>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-brand transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 leading-relaxed text-muted-foreground">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** يبني JSON-LD من نوع FAQPage للأسئلة (للـSEO) */
export function buildFaqJsonLd(items: FaqItem[]) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
