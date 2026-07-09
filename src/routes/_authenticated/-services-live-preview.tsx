import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { EditableText, EditableImage } from "@/components/Editable";
import { pickIcon, splitLines, joinLines } from "@/lib/cms";
import { supabase } from "@/integrations/supabase/client";

/**
 * معاينة حية لإدارة صفحة الخدمات.
 * تعرض عنوان الصفحة وكروت الخدمات بتصميمها الحقيقي، وكل عنصر عليه قلم للتعديل في مكانه.
 * التعديلات على الكروت تُحفظ فورًا في قاعدة البيانات.
 */
export function ServicesLivePreview({
  page,
  setPage,
  services,
}: {
  page: Record<string, any>;
  setPage: (fn: (p: Record<string, any>) => Record<string, any>) => void;
  services: any[];
}) {
  const db = supabase as any;
  const qc = useQueryClient();
  const setP = (k: string, v: string) => setPage((p) => ({ ...p, [k]: v }));

  // حفظ فوري لحقل في كرت خدمة
  async function saveService(id: string, field: string, value: string) {
    const payload: Record<string, any> =
      field === "checkmarks_ar" ? { checkmarks_ar: splitLines(value) } : { [field]: value };
    const { error } = await db.from("services").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-cms-services"] });
    qc.invalidateQueries({ queryKey: ["public-cms-services"] });
    toast.success("تم الحفظ ✓");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 معاينة حية لصفحة الخدمات. اضغطي على القلم بجانب أي نص أو صورة لتعديله في مكانه (يُحفظ
        فورًا). عنوان الصفحة يُحفظ بزر "حفظ" المنفصل.
      </div>

      {/* عنوان الصفحة */}
      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <EditableText
          as="h1"
          value={page.title_ar || ""}
          onSave={(v) => setP("title_ar", v)}
          placeholder="عنوان الصفحة"
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
          ⚠️ عنوان ومقدمة الصفحة يُحفظوا بزر "حفظ عناوين الصفحة" تحت (مش فوري).
        </p>
      </section>

      {/* كروت الخدمات */}
      <section className="rounded-2xl border border-border bg-card p-8">
        <h2 className="mb-6 text-center text-lg font-bold text-muted-foreground">
          كروت الخدمات ({services.length}) — تُحفظ فورًا عند التعديل
        </h2>
        {services.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s: any) => {
              const Icon = pickIcon(s.icon);
              const checks = Array.isArray(s.checkmarks_ar) ? s.checkmarks_ar : [];
              return (
                <div
                  key={s.id}
                  className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-brand"
                >
                  {s.image_url ? (
                    <EditableImage
                      value={s.image_url}
                      onSave={(v) => saveService(s.id, "image_url", v)}
                      alt={s.title_ar}
                      className="h-44 w-full object-cover"
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-6 w-6" />
                    </div>
                    <EditableText
                      as="h3"
                      value={s.title_ar || ""}
                      onSave={(v) => saveService(s.id, "title_ar", v)}
                      placeholder="عنوان الخدمة"
                      className="mt-4 block text-lg font-bold"
                    />
                    <EditableText
                      as="p"
                      multiline
                      value={s.description_ar || ""}
                      onSave={(v) => saveService(s.id, "description_ar", v)}
                      placeholder="وصف الخدمة"
                      className="mt-2 block text-sm leading-relaxed text-muted-foreground"
                    />
                    <div className="mt-4 border-t border-border pt-4">
                      {checks.map((point: string, pi: number) => (
                        <div key={pi} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" /> {point}
                        </div>
                      ))}
                      <EditableText
                        as="div"
                        multiline
                        value={joinLines(checks)}
                        onSave={(v) => saveService(s.id, "checkmarks_ar", v)}
                        placeholder="النقاط (كل نقطة في سطر)"
                        className="mt-2 block whitespace-pre-line text-xs text-brand/70"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            لا توجد خدمات بعد. أضيفيها من تبويب "تعديل تفصيلي".
          </div>
        )}
      </section>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        لإضافة خدمة جديدة أو حذف خدمة أو تغيير الأيقونة، استخدمي تبويب "تعديل تفصيلي" فوق.
      </div>
    </div>
  );
}
