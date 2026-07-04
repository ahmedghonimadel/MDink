import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";

/**
 * Reveal — fade-in + slight upward movement when the wrapped content
 * enters the viewport. Lightweight, no dependencies, respects
 * prefers-reduced-motion automatically via CSS (see styles.css).
 *
 * delay (ms) lets sibling Reveal instances stagger their entrance,
 * e.g. cards inside the same grid.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Component = Tag as any;
  return (
    <Component
      ref={ref}
      className={`reveal-on-scroll ${visible ? "is-visible" : ""} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Component>
  );
}
