import {
  Camera,
  CalendarCheck,
  Facebook,
  Globe,
  Instagram,
  LayoutDashboard,
  Linkedin,
  Megaphone,
  MessageCircle,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
  Youtube,
  BarChart3,
  LifeBuoy,
  FileText,
  type LucideIcon,
} from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function localized(row: Record<string, any>, base: string, locale: Locale, fallback = "") {
  const preferred = row[`${base}_${locale}`];
  const alternate = locale === "en" ? row[`${base}_ar`] : row[`${base}_en`];
  return preferred || alternate || row[base] || fallback;
}

export function localizedStrict(row: Record<string, any>, base: string, locale: Locale) {
  return row[`${base}_${locale}`] || "";
}

export function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function joinLines(value: unknown) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export const iconMap: Record<string, LucideIcon> = {
  Camera,
  CalendarCheck,
  Facebook,
  Globe,
  Instagram,
  LayoutDashboard,
  Linkedin,
  Megaphone,
  MessageCircle,
  Palette,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingUp,
  Users,
  Video,
  Youtube,
  BarChart3,
  LifeBuoy,
  FileText,
};

export function pickIcon(name?: string | null) {
  return iconMap[name || "Globe"] ?? Globe;
}
