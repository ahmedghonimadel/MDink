import { useEffect, useRef, useState } from "react";

/**
 * CountUp — animates a stat value (e.g. "+50", "98%", "18,500") from 0
 * up to its numeric value once it scrolls into view, preserving any
 * non-numeric prefix/suffix (+, %, commas, ...).
 */
export function CountUp({ value, duration = 1200 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState<string>(zeroed(value));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const numeric = parseFloat(value.replace(/[^0-9.]/g, ""));
    if (Number.isNaN(numeric)) {
      setDisplay(value);
      return;
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }

    const prefix = value.match(/^[^\d]*/)?.[0] ?? "";
    const suffix = value.match(/[^\d]*$/)?.[0] ?? "";
    const hasComma = value.includes(",");

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const progress = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(numeric * eased);
          const formatted = hasComma ? current.toLocaleString("en-US") : String(current);
          setDisplay(`${prefix}${formatted}${suffix}`);
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return <span ref={ref}>{display}</span>;
}

function zeroed(value: string): string {
  const prefix = value.match(/^[^\d]*/)?.[0] ?? "";
  const suffix = value.match(/[^\d]*$/)?.[0] ?? "";
  return /\d/.test(value) ? `${prefix}0${suffix}` : value;
}
