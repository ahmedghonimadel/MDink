import { useSiteConfig } from "@/lib/use-site-config";
import { useLocale } from "@/lib/i18n";
import logoUrl from "@/assets/mdink-logo.jpg";

/**
 * شعار MDink Solutions — يستخدم اللوجو المرفوع من لوحة التحكم،
 * وإلا يرجع للّوجو الأصلي المضمّن في المشروع.
 */
export function Logo({ showName = true, size = 40 }: { showName?: boolean; size?: number }) {
  const cfg = useSiteConfig();
  const { locale } = useLocale();
  const src = cfg.site_logo || logoUrl;
  const name = (locale === "en" ? cfg.site_name_en : cfg.site_name) || "MDink Solutions";
  return (
    <span className="flex items-center gap-2">
      <img
        src={src}
        alt={name}
        style={{ height: size, width: size }}
        className="rounded-xl object-contain"
      />
      {showName ? <span className="text-lg font-bold tracking-tight">{name}</span> : null}
    </span>
  );
}
