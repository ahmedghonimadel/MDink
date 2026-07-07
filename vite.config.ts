import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// إعداد البناء: TanStack Start (SSR) + React + Tailwind
// مسارات tsconfig (@/) تُحل عبر ميزة Vite الأصلية بدل إضافة خارجية
export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
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
