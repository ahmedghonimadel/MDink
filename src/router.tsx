import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // البيانات تُعتبر طازجة 5 دقائق → لا إعادة جلب متكررة عند فتح كل صفحة
        staleTime: 5 * 60 * 1000,
        // تُحفظ في الكاش 10 دقائق بعد آخر استخدام
        gcTime: 10 * 60 * 1000,
        // لا تُعِد الجلب لمجرد الرجوع إلى التبويب
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // تجهيز الصفحة عند مرور المؤشر/التركيز على الرابط → تنقّل شبه فوري
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
