/**
 * مُبلّغ أخطاء محايد لحدود الأخطاء (Error Boundary).
 * يسجّل الأخطاء في الـ console فقط — بدون أي اعتماد على منصات خارجية.
 * Neutral error reporter for the React error boundary.
 * Logs to console only — no external platform dependency.
 */
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  // يمكن ربطه لاحقًا بخدمة مراقبة (Sentry مثلًا) عند الحاجة
  console.error("[App error]", error, {
    route: window.location.pathname,
    ...context,
  });
}
