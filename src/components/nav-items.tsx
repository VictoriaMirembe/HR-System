import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  Wallet,
  FileText,
  History,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// Single source of truth for both the top nav bar and the icon sidebar
// (see src/app/(app)/layout.tsx) — keeps the two in sync automatically
// instead of maintaining the same list of links twice.
export function getNavItems(canReadAuditLog: boolean): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/employees", label: "Employees", icon: Users },
    { href: "/attendance", label: "Attendance", icon: Clock },
    { href: "/leave", label: "Leave", icon: CalendarDays },
    { href: "/payroll", label: "Payroll", icon: Wallet },
    { href: "/documents", label: "Documents", icon: FileText },
  ];
  if (canReadAuditLog) {
    items.push({ href: "/audit-log", label: "Audit Log", icon: History });
  }
  return items;
}
