import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  const en = typeof window !== "undefined" && window.localStorage.getItem("mdink-locale") === "en";
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      dir={en ? "ltr" : "rtl"}
    >
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">
          {en ? "Page not found" : "الصفحة غير موجودة"}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {en
            ? "The page you are looking for does not exist or has been moved."
            : "الصفحة التي تبحث عنها غير موجودة أو تم نقلها."}
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md gradient-hero px-4 py-2 text-sm font-medium text-brand-foreground"
          >
            {en ? "Back to home" : "العودة للرئيسية"}
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const en = typeof window !== "undefined" && window.localStorage.getItem("mdink-locale") === "en";
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background px-4"
      dir={en ? "ltr" : "rtl"}
    >
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">
          {en ? "Something went wrong" : "حدث خطأ غير متوقع"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {en ? "Please try again or go back home." : "حاول مرة أخرى أو ارجع للرئيسية."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md gradient-hero px-4 py-2 text-sm font-medium text-brand-foreground"
          >
            {en ? "Try again" : "إعادة المحاولة"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium"
          >
            {en ? "Home" : "الرئيسية"}
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "MDink Solutions" },
      {
        name: "description",
        content:
          "MDink Solutions: مواقع طبية احترافية، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية للأطباء والعيادات والمراكز الطبية في مصر والشرق الأوسط.",
      },
      { name: "author", content: "MDink Solutions" },
      { property: "og:title", content: "MDink Solutions — حلول رقمية احترافية للأطباء" },
      {
        property: "og:description",
        content:
          "MDink Solutions: مواقع طبية احترافية، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية للأطباء والعيادات والمراكز الطبية في مصر والشرق الأوسط.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "MDink Solutions — حلول رقمية احترافية للأطباء" },
      {
        name: "twitter:description",
        content:
          "MDink Solutions: مواقع طبية احترافية، إدارة سوشيال ميديا، سيو طبي، وحملات إعلانية للأطباء والعيادات والمراكز الطبية في مصر والشرق الأوسط.",
      },
      { property: "og:image", content: "/icons/icon-512.png" },
      { name: "twitter:image", content: "/icons/icon-512.png" },
      { name: "theme-color", content: "#1d3fb3" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { rel: "icon", href: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "MDink for Digital Solutions",
          url: "/",
          logo: "/icons/icon-512.png",
          description:
            "وكالة تسويق رقمي متخصصة في القطاع الطبي — مواقع مملوكة للأطباء، سيو طبي، حملات إعلانية، وإدارة سوشيال ميديا.",
          sameAs: [
            "https://www.facebook.com/MDinksolutions",
            "https://www.linkedin.com/company/mdink/",
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var l=localStorage.getItem('mdink-locale')==='en'?'en':'ar';document.documentElement.lang=l;document.documentElement.dir=l==='ar'?'rtl':'ltr'}catch(e){}",
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[PWA] Service worker registration failed", error);
      });
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  );
}
