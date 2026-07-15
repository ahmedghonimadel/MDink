import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical } from "lucide-react";
import { requireWebsiteAdmin } from "@/lib/admin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ServicesLivePreview } from "./-services-live-preview";

export const Route = createFileRoute("/_authenticated/admin/services")({
  beforeLoad: requireWebsiteAdmin,
  component: AdminServices,
});

// أقسام صفحة /services بالترتيب الافتراضي (نفس ترتيب الصفحة العامة)
const DEFAULT_SECTIONS_ORDER = ["hero", "services", "content", "steps", "cta"];
const SECTION_LABELS: Record<string, string> = {
  hero: "الهيرو + نخدم (القسم العلوي)",
  services: "شبكة الخدمات",
  content: "محتوى حقيقي من داخل عيادتك",
  steps: "خطوات العمل (كيف نبدأ؟)",
  cta: "دعوة الإجراء النهائية",
};

const TABS = [
  { id: "live", label: "✨ الصفحة الحية" },
  { id: "sections", label: "🔀 ترتيب الأقسام" },
];

function AdminServices() {
  const db = supabase as any;
  const qc = useQueryClient();
  const [tab, setTab] = useState("live");

  const { data: services = [] } = useQuery({
    queryKey: ["admin-services-v2"],
    queryFn: async () => {
      const rows = (await db.from("services").select("*").order("display_order")).data ?? [];
      // خريطة الحقول الجديدة → ما تتوقعه واجهة الإدارة
      return rows.map((s: any) => ({
        ...s,
        title_ar: s.title,
        title_en: s.title_en,
        description_ar: s.description,
        description_en: s.description_en,
        checkmarks_ar: s.bullets,
        checkmarks_en: s.bullets,
        sort_order: s.display_order,
        is_published: s.is_active,
        image_url: s.image_url ?? "",
      }));
    },
  });

  // محتوى عناوين/أقسام الصفحة من page_sections
  const { data: pageContent } = useQuery({
    queryKey: ["page-sections-admin", "services"],
    queryFn: async () => {
      const rows = (await db.from("page_sections").select("*").eq("page_slug", "services")).data ?? [];
      const merged: Record<string, any> = {};
      rows.forEach((r: any) => Object.assign(merged, r.content_json ?? {}));
      return merged;
    },
  });
  const [page, setPage] = useState<Record<string, any>>({});
  useEffect(() => {
    if (pageContent) setPage(pageContent);
  }, [pageContent]);

  async function savePage() {
    const { error } = await db.from("page_sections").upsert(
      {
        page_slug: "services",
        section_key: "intro",
        content_json: page,
        is_visible: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "page_slug,section_key" },
    );
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["page-sections-admin", "services"] });
    qc.invalidateQueries({ queryKey: ["page-sections-public", "services"] });
    toast.success("تم حفظ التغييرات ✓");
  }

  const order: string[] = Array.isArray(page.sections_order)
    ? page.sections_order
    : DEFAULT_SECTIONS_ORDER;
  const hidden: string[] = Array.isArray(page.sections_hidden) ? page.sections_hidden : [];
  const setOrder = (o: string[]) => setPage((p) => ({ ...p, sections_order: o }));
  const setHidden = (h: string[]) => setPage((p) => ({ ...p, sections_hidden: h }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إدارة خدمات MDink</h1>
        <p className="mt-1 text-muted-foreground">
          تحكم كامل في كل الأقسام — بالعربي والإنجليزي، بنفس شكل الموقع.
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

      {tab === "live" && <ServicesLivePreview page={page} setPage={setPage} services={services} />}

      {/* ——— ترتيب الأقسام ——— */}
      {tab === "sections" && (
        <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <p className="mb-4 text-sm text-muted-foreground">
            رتّب الأقسام (أعلى/أسفل) أو أخفِ أي قسم من صفحة الخدمات، ثم اضغط "حفظ كل التغييرات".
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
          <span className="flex-1 text-sm font-medium">{SECTION_LABELS[id] ?? id}</span>
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
