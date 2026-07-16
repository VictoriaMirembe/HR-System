import type { LucideIcon } from "lucide-react";

// Shared page-header treatment: colored icon badge + heading, matching each
// section's color from nav-items.tsx so a page visually ties back to its
// nav icon. Used across the top-level pages instead of each one rolling
// its own <h1> + underline bar.
const COLOR_STYLES = {
  sky: { bg: "bg-sky-50", ring: "ring-sky-100", icon: "text-sky-600", accent: "bg-sky-400" },
  amber: {
    bg: "bg-amber-50",
    ring: "ring-amber-100",
    icon: "text-amber-600",
    accent: "bg-amber-400",
  },
  emerald: {
    bg: "bg-emerald-50",
    ring: "ring-emerald-100",
    icon: "text-emerald-600",
    accent: "bg-emerald-400",
  },
  violet: {
    bg: "bg-violet-50",
    ring: "ring-violet-100",
    icon: "text-violet-600",
    accent: "bg-violet-400",
  },
  rose: { bg: "bg-rose-50", ring: "ring-rose-100", icon: "text-rose-600", accent: "bg-rose-400" },
  slate: {
    bg: "bg-slate-100",
    ring: "ring-slate-200",
    icon: "text-slate-600",
    accent: "bg-slate-400",
  },
} as const;

export type PageHeaderColor = keyof typeof COLOR_STYLES;

export function PageHeader({
  icon: Icon,
  color,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  color: PageHeaderColor;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const styles = COLOR_STYLES[color];
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.bg} ring-1 ${styles.ring}`}
        >
          <Icon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
          <span className={`mt-1 block h-0.5 w-8 rounded-full ${styles.accent}`} />
          {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
