import {
  Activity,
  ChartNoAxesCombined,
  LayoutDashboard,
  Settings,
  Sprout,
  Store,
} from "lucide-react";

export const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/produce", label: "Produce", icon: Sprout },
  { href: "/markets", label: "Markets", icon: Store },
  {
    href: "/recommendations",
    label: "Recommendations",
    icon: ChartNoAxesCombined,
  },
  { href: "/monitoring", label: "Monitoring", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
