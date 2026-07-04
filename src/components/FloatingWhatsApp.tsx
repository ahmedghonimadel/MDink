import { useSiteConfig, whatsappUrlFrom } from "@/lib/use-site-config";
import { useLocale } from "@/lib/i18n";

// زر واتساب عائم واضح — يظهر في كل الصفحات، ويُتحكم فيه من لوحة التحكم (site_settings)
export function FloatingWhatsApp() {
  const cfg = useSiteConfig();
  const { t } = useLocale();

  // إخفاء الزر لو عطّله الأدمن من اللوحة
  if (cfg.whatsapp_floating_enabled === "0") return null;

  const msg = cfg.whatsapp_message || "";
  const url = whatsappUrlFrom(cfg.whatsapp_number) + (msg ? `?text=${encodeURIComponent(msg)}` : "");
  const openWhatsApp = () => window.open(url, "_blank", "noopener,noreferrer");

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        type="button"
        onClick={openWhatsApp}
        aria-label={t.contactWhatsApp}
        className="relative flex h-14 w-14 items-center justify-center rounded-full shadow-brand transition-transform hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#25D366" }}
      >
        {/* أيقونة واتساب واضحة (SVG) */}
        <svg viewBox="0 0 32 32" className="h-8 w-8" fill="#fff" aria-hidden>
          <path d="M16.004 0h-.008C7.174 0 .001 7.174.001 16c0 3.5 1.13 6.744 3.05 9.38L1.05 31.5l6.32-2.02A15.9 15.9 0 0016.004 32C24.83 32 32 24.826 32 16S24.83 0 16.004 0zm9.36 22.6c-.39 1.098-1.934 2.008-3.166 2.274-.842.18-1.94.322-5.64-1.21-4.73-1.96-7.774-6.766-8.01-7.08-.228-.314-1.914-2.548-1.914-4.86s1.21-3.45 1.64-3.922c.354-.39.774-.566 1.03-.566.256 0 .512.002.736.014.236.012.552-.09.862.658.318.766 1.082 2.65 1.176 2.842.094.192.156.416.03.666-.126.25-.19.406-.376.626-.188.22-.396.49-.566.658-.188.188-.384.392-.164.77.22.376.98 1.616 2.104 2.616 1.446 1.29 2.664 1.69 3.04 1.88.376.188.596.156.816-.094.22-.25.94-1.098 1.19-1.474.25-.376.5-.314.844-.188.344.126 2.184 1.03 2.56 1.218.376.188.626.282.72.438.094.156.094.906-.296 2.004z" />
        </svg>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-30" style={{ backgroundColor: "#25D366" }} />
      </button>
    </div>
  );
}
