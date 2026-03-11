export type AdminMenu = {
  name: string;
  href: string;
  icon: string;
  target?: string;
};

export type AdminContentTab = {
  key:
    | "blogs"
    | "glossary"
    | "compare"
    | "templates"
    | "alternatives"
    | "useCases";
  labelKey:
    | "blogs"
    | "glossary"
    | "compare"
    | "templates"
    | "alternatives"
    | "useCases";
  label: string;
  href: string;
};

export const ADMIN_CONTENT_TABS: AdminContentTab[] = [
  { key: "blogs", labelKey: "blogs", label: "Blogs", href: "/dashboard/blogs" },
  {
    key: "glossary",
    labelKey: "glossary",
    label: "Glossary",
    href: "/dashboard/glossary",
  },
  {
    key: "compare",
    labelKey: "compare",
    label: "Compare",
    href: "/dashboard/compare",
  },
  {
    key: "templates",
    labelKey: "templates",
    label: "Templates",
    href: "/dashboard/templates",
  },
  {
    key: "alternatives",
    labelKey: "alternatives",
    label: "Alternatives",
    href: "/dashboard/alternatives",
  },
  {
    key: "useCases",
    labelKey: "useCases",
    label: "Use Cases",
    href: "/dashboard/use-cases",
  },
];

export function getAdminContentTabByHref(href: string): AdminContentTab | null {
  return ADMIN_CONTENT_TABS.find((tab) => tab.href === href) ?? null;
}
