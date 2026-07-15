import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PortfolioLivePreview } from "./-portfolio-live-preview";

export const Route = createFileRoute("/_authenticated/admin/portfolio")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminPortfolio,
});

// فئات الأعمال بالترتيب الافتراضي (نفس ترتيب فلاتر صفحة /portfolio العامة)
const DEFAULT_CATEGORIES_ORDER = [
  "medical_websites",
  "social_media",
  "medical_photography",
  "seo_results",
  "monthly_work",
];
const CATEGORY_LABELS: Record<string, string> = {
  medical_websites: "مواقع طبية",
  social_media: "سوشيال ميديا",
  medical_photography: "تصوير طبي",
  seo_results: "SEO ونتائج بحث",
  monthly_work: "أعمال شهرية",
};

const TABS = [
  { id: "live", label: "✨ الصفحة الحية" },
  { id: "sections", label: "🔀 ترتيب الأقسام" },
];

function AdminPortfolio() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [tab, setTab] = useState("live");

  const { data: items = [] } = useQuery({
    queryKey: ["admin-portfolio-v2"],
    queryFn: async () => {
      const rows = (await db.from("portfolio_projects").select("*").order("display_order")).data ?? [];
      return rows.map((p: any) => ({
        ...p,
        title_ar: p.title,
        title_en: p.title_en,
        client_name_ar: p.client_name,
        description_ar: p.short_description,
        description_en: p.short_description_en,
        website_url: p.project_url,
        image_url: p.cover_image_url ?? "",
        sort_order: p.display_order,
        is_published: p.is_active,
      }));
    },
  });

  // محتوى عناوين/أقسام الصفحة من page_sections
  const { data: pageContent } = useQuery({
    queryKey: ["page-sections-admin", "portfolio"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "portfolio")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });
  const [page, setPage] = useState<Record<string, any>>({});
  useEffect(() => {
    if (pageContent) setPage(pageContent);
  }, [pageContent]);
  const setP = (k: string, v: string) => setPage((p) => ({ ...p, [k]: v }));

  async function savePage() {
    const { error } = await db.from("page_sections").upsert(
      {
        page_slug: "portfolio",
        section_key: "intro",
        content_json: page,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["page-sections-admin", "portfolio"] });
    qc.invalidateQueries({ queryKey: ["page-sections-public", "portfolio"] });
    toast.success("تم حفظ التغييرات ✓");
  }

  const order: string[] = Array.isArray(page.categories_order)
    ? page.categories_order
    : DEFAULT_CATEGORIES_ORDER;
  const hidden: string[] = Array.isArray(page.categories_hidden) ? page.categories_hidden : [];
  const setOrder = (o: string[]) => setPage((p) => ({ ...p, categories_order: o }));
  const setHidden = (h: string[]) => setPage((p) => ({ ...p, categories_hidden: h }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة الأعمال Portfolio</h1>
        <p className="mt-1 text-muted-foreground">
          كل الأعمال وعناوين الصفحة — بالعربي والإنجليزي، بنفس شكل الموقع.
        </p>
      </header>

      {/* تبويبات */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "gradient-hero text-brand-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "live" && <PortfolioLivePreview page={page} setP={setP} items={items} />}

      {/* ——— ترتيب الأقسام (الفئات) ——— */}
      {tab === "sections" && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="mb-4 text-sm text-muted-foreground">
            رتّب فئات الأعمال (أعلى/أسفل) أو أخفِ أي فئة من صفحة الأعمال، ثم اضغط "حفظ كل التغييرات".
            إخفاء فئة يُخفي زر الفلترة الخاص بها وكل أعمالها من الموقع.
          </p>
          <SectionsManager order={order} hidden={hidden} onOrder={setOrder} onHidden={setHidden} />
        </section>
      )}

      {/* زر الحفظ — أسفل الصفحة */}
      <div className="sticky bottom-0 z-30 -mx-1 mt-4 flex justify-end border-t border-border bg-background/90 py-3 backdrop-blur">
        <Button onClick={savePage} className="gradient-hero text-brand-foreground shadow-brand">
          <Save className="ml-2 h-4 w-4" /> حفظ كل التغييرات
        </Button>
      </div>
    </div>
  );
}

function SectionsManager({
  order,
  hidden,
  onOrder,
  onHidden,
}: {
  order: string[];
  hidden: string[];
  onOrder: (o: string[]) => void;
  onHidden: (h: string[]) => void;
}) {
  function move(i: number, dir: -1 | 1) {
    const n = [...order];
    const j = i + dir;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onOrder(n);
  }
  function toggle(id: string) {
    onHidden(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]);
  }
  return (
    <div className="space-y-2">
      {order.map((id, i) => (
        <div
          key={id}
          className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{CATEGORY_LABELS[id] ?? id}</span>
          <Button size="icon" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => move(i, 1)}
            disabled={i === order.length - 1}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => toggle(id)}>
            {hidden.includes(id) ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-brand" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
