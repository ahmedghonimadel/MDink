import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";
import { useLocale } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "MDink Solutions Team Login — MDink Solutions" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  const t =
    locale === "en"
      ? {
          title: "MDink Solutions Team Login",
          subtitle: "Private access for MDink Solutions team members to manage content, requests, and website pages.",
          email: "Email", password: "Password", login: "Login", forgot: "Forgot password?",
          loading: "Signing in...", invalid: "Invalid login details. Please try again.",
          vEmail: "Invalid email", vPw: "Password is too short",
          brandLine: "The medical sector's trusted digital partner.",
          secure: "Secure team area",
        }
      : {
          title: "تسجيل دخول فريق MDink Solutions",
          subtitle: "منطقة خاصة لأعضاء وفريق MDink Solutions لإدارة المحتوى، الطلبات، والصفحات.",
          email: "البريد الإلكتروني", password: "كلمة المرور", login: "تسجيل الدخول",
          forgot: "نسيت كلمة المرور؟", loading: "جاري الدخول...",
          invalid: "بيانات الدخول غير صحيحة. برجاء المحاولة مرة أخرى.",
          vEmail: "بريد غير صحيح", vPw: "كلمة المرور قصيرة",
          brandLine: "الشريك الرقمي الموثوق للقطاع الطبي.",
          secure: "منطقة آمنة للفريق",
        };

  const schema = z.object({
    email: z.string().trim().email(t.vEmail).max(160),
    password: z.string().min(6, t.vPw).max(72),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const raw = Object.fromEntries(form.entries());
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword(parsed.data);
      if (authErr) {
        setError(t.invalid);
        return;
      }
      navigate({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col lg:flex-row">
      {/* Toggles */}
      <div className="absolute top-4 z-20 flex items-center gap-2 ltr:right-4 rtl:left-4">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Brand panel */}
      <div className="relative hidden overflow-hidden gradient-hero lg:flex lg:w-1/2 lg:flex-col lg:justify-between lg:p-12 text-brand-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -left-10 -top-10 h-72 w-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white blur-3xl" />
        </div>
        <Link to="/" className="relative flex items-center gap-2">
          <Logo size={44} />
        </Link>
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" /> {t.secure}
          </div>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight">MDink Solutions</h2>
          <p className="mt-2 max-w-sm text-sm opacity-90">{t.brandLine}</p>
        </div>
        <div className="relative text-xs opacity-70">© {new Date().getFullYear()} MDink Solutions</div>
      </div>

      {/* Login card */}
      <div className="flex flex-1 items-center justify-center gradient-soft px-4 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <Logo size={44} />
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8 shadow-brand">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.subtitle}</p>

            <form onSubmit={handleEmail} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">{t.email}</Label>
                <div className="relative mt-1.5">
                  <Mail className="absolute top-2.5 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    maxLength={160}
                    dir="ltr"
                    className="ltr:pl-9 rtl:pr-9"
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">{t.password}</Label>
                <div className="relative mt-1.5">
                  <Lock className="absolute top-2.5 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="password"
                    name="password"
                    type={showPw ? "text" : "password"}
                    required
                    minLength={6}
                    maxLength={72}
                    className="ltr:pl-9 rtl:pr-9 ltr:pr-10 rtl:pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    className="absolute top-2 text-muted-foreground hover:text-foreground ltr:right-2.5 rtl:left-2.5"
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-hero text-brand-foreground shadow-brand"
              >
                {loading ? t.loading : t.login}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button type="button" className="text-xs text-muted-foreground hover:text-brand">
                {t.forgot}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
