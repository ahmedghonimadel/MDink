import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MarketingLayout } from "@/components/MarketingLayout";
import { openExternal } from "@/lib/external-links";
import { useLocale } from "@/lib/i18n";
import { ExternalLink, Globe, Instagram, Facebook, Linkedin, Youtube, Music2 } from "lucide-react";

export const Route = createFileRoute("/links")({
  head: () => ({
    meta: [
      { title: "روابطنا — MDink Solutions" },
      { name: "description", content: "كل قنوات MDink Solutions الرقمية ومنصات أعمالنا في مكان واحد." },
      { property: "og:title", content: "روابطنا — MDink Solutions" },
      { property: "og:url", content: "/links" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/links" }],
  }),
  component: LinksPage,
});

function iconFor(platform: string) {
  switch (platform) {
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    case "linkedin":
      return Linkedin;
    case "youtube":
      return Youtube;
    case "tiktok":
      return Music2;
    default:
      return Globe;
  }
}

function LinksPage() {
  const { locale } = useLocale();
  const { data: links, isLoading } = useQuery({
    queryKey: ["public-links-from-social"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("social_links")
        .select("id,label,label_en,username,url,platform,icon,display_order")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return (data ?? []).map((l: any) => ({
        id: l.id,
        title:
          (locale === "en" ? (l.label_en || l.label) : (l.label || l.label_en)) ||
          l.platform,
        subtitle: l.username ?? "",
        url: l.url,
        platform_type: l.platform,
        accent_color: null,
        sort_order: l.display_order,
      }));
    },
  });

  return (
    <MarketingLayout>
      <header className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 -z-10 aurora-bg" />
        <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-4xl font-extrabold sm:text-5xl">روابط MDink Solutions</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            قنواتنا، أعمالنا الحية، وحملاتنا — كلها في مكان واحد.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-14 sm:px-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground">جاري التحميل…</div>
        ) : !links || links.length === 0 ? (
          <div className="rounded-2xl glass-card p-10 text-center text-muted-foreground">
            لم تتم إضافة روابط بعد.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {links.map((l: any) => {
              const Icon = iconFor(l.platform_type);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => openExternal(l.url)}
                  className="group flex items-center gap-4 rounded-2xl glass-card p-5 text-right transition-all duration-300 hover:-translate-y-1 hover:glow-blue"
                >
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
                    style={{
                      background: "color-mix(in oklab, var(--brand) 12%, transparent)",
                      color: "var(--brand)",
                    }}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{l.title}</div>
                    {l.subtitle && (
                      <div className="truncate text-xs text-muted-foreground">{l.subtitle}</div>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" />
                </button>
              );
            })}
          </div>
        )}
      </section>
    </MarketingLayout>
  );
}
