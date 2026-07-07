import { sanitizeBlogHtml } from "@/lib/sanitize-html";

/**
 * معاينة حية للمقال أثناء الكتابة + توضيح أحجام الخطوط لكل حقل.
 * يساعد الكاتبة على معرفة كل حقل هيظهر بأي حجم خط للزائر.
 */
export function BlogLivePreview({ form }: { form: Record<string, any> }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed border-brand/40 bg-brand/5 p-3 text-center text-sm text-muted-foreground">
        👇 دي معاينة حية للمقال زي ما هيظهر للزائر. كل حقل بيبان بحجم خط مختلف (موضّح تحت).
      </div>

      {/* دليل أحجام الحقول */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="mb-3 text-sm font-bold text-muted-foreground">📏 أحجام الحقول للزائر:</h3>
        <ul className="space-y-1.5 text-sm">
          <li className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <span className="text-muted-foreground">العنوان (Title)</span>
            <span className="font-medium text-brand">خط كبير جداً — 36px عريض</span>
          </li>
          <li className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <span className="text-muted-foreground">المقتطف (Excerpt)</span>
            <span className="font-medium text-brand">خط متوسط — 18px</span>
          </li>
          <li className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <span className="text-muted-foreground">التصنيف (Category)</span>
            <span className="font-medium text-brand">خط صغير — 14px</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="text-muted-foreground">المحتوى (Content)</span>
            <span className="font-medium text-brand">
              تتحكمي فيه بالمحرر (عناوين، فقرات، أحجام مختلفة)
            </span>
          </li>
        </ul>
      </div>

      {/* المعاينة الفعلية للمقال */}
      <article className="rounded-2xl border border-border bg-card p-8">
        {form.cover_image_url ? (
          <img
            src={form.cover_image_url}
            alt={form.alt_ar || form.title_ar}
            loading="lazy"
            className="mb-6 h-56 w-full rounded-xl object-cover"
          />
        ) : (
          <div className="mb-6 flex h-56 w-full items-center justify-center rounded-xl bg-muted text-muted-foreground">
            صورة الغلاف هتظهر هنا
          </div>
        )}

        {/* التصنيف — صغير */}
        {form.category_ar ? (
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-medium text-brand">
            {form.category_ar}
          </span>
        ) : null}

        {/* العنوان — كبير جداً */}
        <h1 className="mt-3 text-4xl font-extrabold leading-tight">
          {form.title_ar || <span className="text-muted-foreground">عنوان المقال هيظهر هنا</span>}
        </h1>

        {/* المقتطف — متوسط */}
        {form.excerpt_ar ? (
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{form.excerpt_ar}</p>
        ) : null}

        {/* المحتوى — منسّق من المحرر */}
        {form.content_ar ? (
          <div
            className="blog-content mt-6 border-t border-border pt-6"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: sanitizeBlogHtml(form.content_ar) }}
          />
        ) : (
          <p className="mt-6 border-t border-border pt-6 text-muted-foreground">
            محتوى المقال هيظهر هنا بالتنسيق اللي تعمليه في المحرر (تبويب "تعديل المقال").
          </p>
        )}
      </article>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
        لكتابة أو تعديل المقال واستخدام المحرر (زي Word)، روحي تبويب "تعديل المقال" فوق.
      </div>
    </div>
  );
}
