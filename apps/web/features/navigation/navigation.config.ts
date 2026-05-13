import {
  Building2,
  FileSignature,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  Home,
  Users,
  Gauge,
  type LucideIcon,
} from "lucide-react";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  position?: "top" | "bottom";
};

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, position: "top" },
  { label: "Objekte", href: "/objekte", icon: Building2, position: "top" },
  { label: "Mieter", href: "/mieter", icon: Users, position: "top" },
  { label: "Verträge", href: "/vertraege", icon: FileSignature, position: "top" },
  { label: "Finanzen", href: "/finanzen", icon: Landmark, position: "top" },
  { label: "Ablesungen", href: "/ablesungen", icon: Gauge, position: "top" },
  { label: "Dokumente", href: "/dokumente", icon: FolderOpen, position: "top" },
  { label: "Startseite", href: "/", icon: Home, position: "bottom" },
];
