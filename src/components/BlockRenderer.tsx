import { Info, Quote, ArrowLeft } from "lucide-react";
import { VideoPlayer } from "@/components/VideoPlayer";
import { sanitizeBlogHtml } from "@/lib/sanitize-html";

// ---------- أنواع البلوكات ----------
export type Block =
  | { id: string; type: "heading"; level: 2 | 3; text: string }
  | { id: string; type: "paragraph"; text: string }
  | { id: string; type: "list"; style?: "bullet" | "number"; items: string[] }
  | { id: string; type: "note"; title?: string; text: string }
  | { id: string; type: "quote"; text: string; author?: string }
  | { id: string; type: "image"; url: string; alt?: string; caption?: string }
  | { id: string; type: "video"; url: string; title?: string; thumbnail?: string; orientation?: "horizontal" | "vertical" }
  | { id: string; type: "cta"; text: string; buttonText?: string; buttonUrl?: string }
  | { id: string; type: "faq"; items: { q: string; a: string }[] };

/** يحوّل نصًا بسيطًا فيه <strong> إلى عناصر آمنة */
function RichText({ text }: { text: string }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(text) }} />;
}

/** يولّد id ثابت من نص العنوان (لجدول المحتويات) */
export function headingId(text: string, idx: number): string {
  const base = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
  return base ? `${base}-${idx}` : `sec-${idx}`;
}

interface BlockRendererProps {
  blocks: Block[];
  waUrl?: string;
  contactUrl?: string;
}

/**
 * يعرض مصفوفة بلوكات المقال بتصميم MDink.
 * البلوكات المخفية (hidden) تُستبعد قبل الوصول هنا.
 */
export function BlockRenderer({ blocks, waUrl, contactUrl }: BlockRendererProps) {
  if (!Array.isArray(blocks) || blocks.length === 0) return null;

  let headingIdx = 0;

  return (
    <div className="blog-content space-y-6 leading-loose text-foreground" dir="rtl">
      {blocks.map((b) => {
        switch (b.type) {
          case "heading": {
            headingIdx++;
            const id = headingId(b.text, headingIdx);
            if (b.level === 3) {
              return (
                <h3 key={b.id} id={id} className="mt-8 text-xl font-bold text-foreground sm:text-2xl">
                  {b.text}
                </h3>
              );
            }
            return (
              <h2 key={b.id} id={id} className="mt-10 border-r-4 border-brand pr-3 text-2xl font-extrabold text-foreground sm:text-3xl">
                {b.text}
              </h2>
            );
          }

          case "paragraph":
            return (
              <p key={b.id} className="text-base leading-loose text-muted-foreground sm:text-lg">
                <RichText text={b.text} />
              </p>
            );

          case "list": {
            const Tag = b.style === "number" ? "ol" : "ul";
            return (
              <Tag
                key={b.id}
                className={`space-y-2 ${b.style === "number" ? "list-decimal" : "list-disc"} pr-6 text-base text-muted-foreground sm:text-lg`}
              >
                {b.items.map((it, i) => (
                  <li key={i} className="leading-relaxed">
                    <RichText text={it} />
                  </li>
                ))}
              </Tag>
            );
          }

          case "note":
            return (
              <div
                key={b.id}
                className="flex gap-3 rounded-2xl border border-brand/20 bg-brand/5 p-5"
              >
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand" />
                <div>
                  {b.title && <div className="mb-1 font-bold text-brand">{b.title}</div>}
                  <div className="text-sm leading-relaxed text-foreground sm:text-base">
                    <RichText text={b.text} />
                  </div>
                </div>
              </div>
            );

          case "quote":
            return (
              <blockquote
                key={b.id}
                className="relative rounded-2xl bg-muted/40 p-6 pr-12 text-lg font-medium italic text-foreground"
              >
                <Quote className="absolute right-4 top-4 h-6 w-6 text-brand/40" />
                <RichText text={b.text} />
                {b.author && <footer className="mt-2 text-sm font-normal not-italic text-muted-foreground">— {b.author}</footer>}
              </blockquote>
            );

          case "image":
            return (
              <figure key={b.id} className="my-6">
                <img
                  src={b.url}
                  alt={b.alt || b.caption || ""}
                  loading="lazy"
                  className="w-full rounded-2xl object-cover shadow-card"
                />
                {b.caption && (
                  <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                    {b.caption}
                  </figcaption>
                )}
              </figure>
            );

          case "video":
            return (
              <div key={b.id} className="my-6">
                <VideoPlayer
                  url={b.url}
                  title={b.title}
                  thumbnail={b.thumbnail}
                  orientation={b.orientation}
                />
                {b.title && (
                  <div className="mt-2 text-center text-sm text-muted-foreground">{b.title}</div>
                )}
              </div>
            );

          case "cta": {
            const btnUrl = b.buttonUrl || waUrl || contactUrl || "#";
            return (
              <div
                key={b.id}
                className="my-8 overflow-hidden rounded-3xl gradient-hero p-8 text-center text-brand-foreground shadow-brand"
              >
                <p className="text-lg font-bold">
                  <RichText text={b.text} />
                </p>
                {b.buttonText && (
                  <a
                    href={btnUrl}
                    target={btnUrl.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-bold text-brand transition-transform hover:-translate-y-0.5"
                  >
                    {b.buttonText} <ArrowLeft className="h-4 w-4" />
                  </a>
                )}
              </div>
            );
          }

          case "faq":
            // FAQ يُعرض عادةً عبر مكوّن منفصل (FaqAccordion)؛ نتجاهله هنا.
            return null;

          default:
            return null;
        }
      })}
    </div>
  );
}
