import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";

const links = [
  { to: "/", key: "home" },
  { to: "/services", key: "services" },
  { to: "/portfolio", key: "portfolio" },
  { to: "/reviews", key: "reviews" },
  { to: "/about", key: "about" },
  { to: "/blog", key: "blog" },
  { to: "/contact", key: "contact" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { t } = useLocale();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              activeProps={{ className: "text-foreground bg-accent" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {t[l.key]}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageToggle />
          <ThemeToggle />
          {signedIn ? (
            <Button asChild size="sm">
              <Link to="/dashboard">{t.dashboard}</Link>
            </Button>
          ) : (
            <Button
              asChild
              size="default"
              className="gradient-hero text-brand-foreground shadow-brand font-semibold"
            >
              <Link to="/contact" hash="consultation">{t.join}</Link>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LanguageToggle />
          <ThemeToggle />
          <button onClick={() => setOpen((v) => !v)} aria-label={t.menu}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                {t[l.key]}
              </Link>
            ))}
            <Link
              to={signedIn ? "/dashboard" : "/contact"}
              hash={signedIn ? undefined : "consultation"}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md gradient-hero px-3 py-2 text-center text-sm font-medium text-brand-foreground"
            >
              {signedIn ? t.dashboard : t.join}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
