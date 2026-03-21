import {
  Building2,
  FolderOpen,
  Landmark,
  LayoutDashboard,
  Mail,
  Users,
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
  { label: "Finanzen", href: "/finanzen", icon: Landmark, position: "top" },
  { label: "Dokumente", href: "/dokumente", icon: FolderOpen, position: "top" },
  { label: "Nachrichten", href: "/nachrichten", icon: Mail, position: "top" },
  { label: "Kontakte", href: "/kontakte", icon: Users, position: "bottom" },
];