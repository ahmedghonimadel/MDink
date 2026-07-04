import { EditableText } from "@/components/Editable";

/**
 * معاينة حية لإدارة صفحة "من نحن".
 * تعرض المحتوى (المقدمة، الرؤية، الرسالة، القيم، عنوان الفريق) بتصميمه الحقيقي،
 * وكل نص عليه قلم للتعديل في مكانه. يُحفظ بزر "حفظ" العام فوق.
 */
export function AboutLivePreview({
  content,
  set,
}: {
  content: Record<string, any>;
  set: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 معاينة حية لصفحة "من نحن". اضغطي على القلم بجانب أي نص لتعديله في مكانه. لا تنسي "حفظ كل
        التغييرات" فوق.
      </div>

      {/* المقدمة */}
      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <h2 className="mb-2 text-sm font-bold text-brand">من نحن</h2>
        <EditableText
          as="p"
          multiline
          value={content.intro_ar || ""}
          onSave={(v) => set("intro_ar", v)}
          placeholder="مقدمة عن الشركة"
          className="mx-auto block max-w-2xl text-lg leading-relaxed"
        />
      </section>

      {/* الرؤية والرسالة والقيم */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h3 className="mb-2 font-bold text-brand">الرؤية</h3>
          <EditableText
            as="p"
            multiline
            value={content.vision_ar || ""}
            onSave={(v) => set("vision_ar", v)}
            placeholder="رؤيتنا"
            className="block text-sm text-muted-foreground"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h3 className="mb-2 font-bold text-brand">الرسالة</h3>
          <EditableText
            as="p"
            multiline
            value={content.mission_ar || ""}
            onSave={(v) => set("mission_ar", v)}
            placeholder="رسالتنا"
            className="block text-sm text-muted-foreground"
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <h3 className="mb-2 font-bold text-brand">القيم</h3>
          <EditableText
            as="p"
            multiline
            value={content.values_ar || ""}
            onSave={(v) => set("values_ar", v)}
            placeholder="قيمنا"
            className="block text-sm text-muted-foreground"
          />
        </div>
      </section>

      {/* عنوان قسم الفريق */}
      <section className="rounded-2xl border border-border bg-card p-8 text-center">
        <EditableText
          as="h2"
          value={content.team_title_ar || ""}
          onSave={(v) => set("team_title_ar", v)}
          placeholder="عنوان قسم الفريق"
          className="block text-2xl font-extrabold"
        />
        <EditableText
          as="p"
          multiline
          value={content.team_text_ar || ""}
          onSave={(v) => set("team_text_ar", v)}
          placeholder="نص قسم الفريق"
          className="mx-auto mt-2 block max-w-2xl text-muted-foreground"
        />
      </section>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        لإضافة أعضاء الفريق أو تعديل بطاقاتهم، استخدمي تبويب "تعديل تفصيلي" فوق. وبطاقات الأعضاء
        اللي انضموا تُدار من "بروفايلات الفريق".
      </div>
    </div>
  );
}
