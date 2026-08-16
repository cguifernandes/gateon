export type AnimatedIconKey =
  | "dashboard"
  | "groups"
  | "alerts"
  | "settings"
  | "members"
  | "plug"
  | "user";

export type NavItem = {
  href: string;
  label: string;
  iconKey: AnimatedIconKey;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    label: "Navegação",
    items: [
      {
        href: "/dashboard",
        label: "Dashboard",
        iconKey: "dashboard",
      },
      {
        href: "/groups",
        label: "Grupos",
        iconKey: "groups",
      },
      {
        href: "/members",
        label: "Membros",
        iconKey: "members",
      },
      {
        href: "/alerts",
        label: "Alertas",
        iconKey: "alerts",
      },
      {
        href: "/integrations",
        label: "Integrações",
        iconKey: "plug",
      },
    ],
  },
  {
    label: "Conta",
    items: [
      {
        href: "/settings",
        label: "Configurações",
        iconKey: "settings",
      },
    ],
  },
];

export function isNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
