import { useLocale } from "@/lib/i18n";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, toggleLocale } = useLocale();
  return (
    <button
      type="button"
      onClick={toggleLocale}
      aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-[11px] font-bold tracking-tight text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${className}`}
    >
      {locale === "ar" ? "AR" : "EN"}
    </button>
  );
}
