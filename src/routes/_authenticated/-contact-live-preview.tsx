import { pickIcon } from "@/lib/cms";
import { openExternal } from "@/lib/external-links";

/**
 * معاينة حية لقنوات التواصل.
 * تعرض القنوات بشكل الكروت اللي الزائر يشوفها، مع زر فتح كل قناة للتأكد أنها تعمل.
 */
export function ContactLivePreview({ channels }: { channels: any[] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 دي معاينة حية لقنوات التواصل زي ما الزائر يشوفها. اضغطي على أي قناة للتأكد أن رابطها
        يعمل. للتعديل أو الإضافة استخدمي النموذج تحت.
      </div>

      {channels.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {channels.map((ch: any) => {
            const Icon = pickIcon(ch.icon);
            return (
              <button
                key={ch.id}
                onClick={() => ch.url && openExternal(ch.url)}
                className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 text-right shadow-card transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-brand"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground">{ch.label_ar}</div>
                  <div className="truncate text-sm text-muted-foreground" dir="ltr">
                    {ch.value}
                  </div>
                  {!ch.is_active ? (
                    <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      مخفية عن الزوار
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          لا توجد قنوات تواصل بعد. أضيفيها من النموذج تحت.
        </div>
      )}
    </div>
  );
}
