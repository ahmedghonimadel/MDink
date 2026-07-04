import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { EditableText, EditableImage } from "@/components/Editable";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/external-links";

/**
 * معاينة حية لإدارة صفحة الأعمال.
 * تعرض عناوين الصفحة والأعمال بتصميمها الحقيقي، وكل عنصر عليه قلم للتعديل في مكانه.
 * تعديلات الأعمال تُحفظ فورًا. كل عمل عليه زر لفتح رابطه للتأكد أنه يعمل.
 */
export function PortfolioLivePreview({
  page,
  setP,
  items,
}: {
  page: Record<string, any>;
  setP: (k: string, v: string) => void;
  items: any[];
}) {
  const db = supabase as any;
  const qc = useQueryClient();

  async function saveItem(id: string, field: string, value: string) {
    const payload: Record<string, any> = { [field]: value };
    // website_url يُحفظ في العمودين (url + website_url) للتوافق
    if (field === "website_url") payload.url = value;
    const { error } = await db.from("portfolio_projects").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-portfolio-items"] });
    qc.invalidateQueries({ queryKey: ["public-portfolio"] });
    toast.success("تم الحفظ ✓");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 معاينة حية لصفحة الأعمال. اضغطي على القلم بجانب أي نص أو صورة لتعديله في مكانه (يُحفظ
        فورًا). عناوين الصفحة تُحفظ بزر "حفظ" فوق.
      </div>

      {/* عناوين الصفحة */}
      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <EditableText
          as="h1"
          value={page.title_ar || ""}
          onSave={(v) => setP("title_ar", v)}
          placeholder="عنوان صفحة الأعمال"
          className="block text-3xl font-extrabold"
        />
        <EditableText
          as="p"
          multiline
          value={page.intro_ar || ""}
          onSave={(v) => setP("intro_ar", v)}
          placeholder="مقدمة الصفحة"
          className="mx-auto mt-3 block max-w-2xl text-muted-foreground"
        />
        <p className="mt-2 text-xs text-amber-600">
          ⚠️ عناوين الصفحة تُحفظ بزر "حفظ" فوق (مش فوري).
        </p>
      </section>

      {/* الأعمال */}
      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-6 text-center text-lg font-bold text-muted-foreground">
          الأعمال ({items.length}) — تُحفظ فورًا عند التعديل
        </h2>
        {items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item: any) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-border bg-background"
              >
                <EditableImage
                  value={item.image_url || ""}
                  onSave={(v) => saveItem(item.id, "image_url", v)}
                  alt={item.title_ar}
                  className="h-40 w-full object-cover"
                />
                <div className="p-5">
                  <EditableText
                    as="h3"
                    value={item.title_ar || ""}
                    onSave={(v) => saveItem(item.id, "title_ar", v)}
                    placeholder="عنوان العمل"
                    className="block font-bold"
                  />
                  <EditableText
                    as="p"
                    multiline
                    value={item.description_ar || ""}
                    onSave={(v) => saveItem(item.id, "description_ar", v)}
                    placeholder="وصف العمل"
                    className="mt-2 block text-sm text-muted-foreground"
                  />
                  {/* الرابط + زر فتحه للتأكد أنه يعمل */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <EditableText
                        as="div"
                        value={item.website_url || ""}
                        onSave={(v) => saveItem(item.id, "website_url", v)}
                        placeholder="رابط العمل (https://...)"
                        className="block truncate text-xs text-brand"
                      />
                    </div>
                    {item.website_url ? (
                      <button
                        onClick={() => openExternal(item.website_url)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand hover:bg-brand/20"
                        title="فتح الرابط للتأكد أنه يعمل"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا توجد أعمال بعد. أضيفيها من تبويب "تعديل تفصيلي".
          </div>
        )}
      </section>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        لإضافة عمل جديد أو حذف عمل أو رفع صورة جديدة، استخدمي تبويب "تعديل تفصيلي" فوق.
      </div>
    </div>
  );
}
