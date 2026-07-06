import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// إعداد البناء: TanStack Start (SSR) + React + Tailwind + مسارات tsconfig
// Build setup: TanStack Start (SSR) + React + Tailwind + tsconfig paths
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({
      // إعادة توجيه نقطة دخول السيرفر إلى src/server.ts (غلاف معالجة أخطاء SSR)
      server: { entry: "server" },
      // وضع SPA: يبني index.html ثابت يعمل على استضافة ثابتة (Vercel)
      // كل البيانات تُجلب من Supabase في المتصفح، فلا حاجة لسيرفر SSR
      spa: { enabled: true },
    }),
    viteReact(),
  ],
});
