import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { useSiteConfig, whatsappUrlFrom } from "@/lib/use-site-config";
import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";

export function SiteFooter() {
  const cfg = useSiteConfig();
  const { t, locale } = useLocale();
  const footerText = locale === "en" ? cfg.footer_about_text_en : cfg.footer_about_text;
  return (
    <footer className="mt-24 border-t border-border bg-card" role="contentinfo">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
            {footerText}
          </p>
          <div className="mt-5 flex gap-3">
            {cfg.facebook_url ? (
              <button
                type="button"
                onClick={() => window.open(cfg.facebook_url, "_blank", "noopener,noreferrer")}
                aria-label="Facebook"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent"
              >
                <Facebook className="h-4 w-4" />
              </button>
            ) : null}
            {cfg.instagram_url ? (
              <button
                type="button"
                onClick={() => window.open(cfg.instagram_url, "_blank", "noopener,noreferrer")}
                aria-label="Instagram"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent"
              >
                <Instagram className="h-4 w-4" />
              </button>
            ) : null}
            {cfg.linkedin_url ? (
              <button
                type="button"
                onClick={() => window.open(cfg.linkedin_url, "_blank", "noopener,noreferrer")}
                aria-label="LinkedIn"
                className="rounded-full border border-border p-2 transition-colors hover:bg-accent"
              >
                <Linkedin className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t.quickLinks}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/services" className="hover:text-foreground">
                {t.services}
              </Link>
            </li>
            <li>
              <Link to="/portfolio" className="hover:text-foreground">
                {t.portfolio}
              </Link>
            </li>
            <li>
              <Link to="/reviews" className="hover:text-foreground">
                {t.reviews}
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                {t.about}
              </Link>
            </li>
            <li>
              <Link to="/blog" className="hover:text-foreground">
                {t.blog}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                {t.contact}
              </Link>
            </li>
            <li>
              <Link to="/contact" hash="consultation" className="font-medium text-brand hover:underline">
                {t.join}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t.contactTitle}</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              <button
                type="button"
                onClick={() =>
                  window.open(whatsappUrlFrom(cfg.whatsapp_number), "_blank", "noopener,noreferrer")
                }
                className="hover:text-foreground"
              >
                {t.whatsapp}: {cfg.contact_phone}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MDink Solutions — {t.rights}
      </div>
    </footer>
  );
}
