import type { PostType } from "@/lib/db/schema";

export type SeoPageType = Extract<
  PostType,
  "use_case" | "template" | "alternative" | "compare"
>;

export type SeoPageTypeConfig = {
  postType: SeoPageType;
  routeBase: string;
  priority: number;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
};

export const SEO_PAGE_TYPE_CONFIGS: SeoPageTypeConfig[] = [
  {
    postType: "use_case",
    routeBase: "/use-cases",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    postType: "template",
    routeBase: "/templates",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    postType: "alternative",
    routeBase: "/alternatives",
    priority: 0.82,
    changeFrequency: "weekly",
  },
  {
    postType: "compare",
    routeBase: "/compare",
    priority: 0.82,
    changeFrequency: "weekly",
  },
];

export function getSeoPageTypeConfig(postType: SeoPageType): SeoPageTypeConfig {
  const config = SEO_PAGE_TYPE_CONFIGS.find((item) => item.postType === postType);

  if (!config) {
    throw new Error(`Unknown SEO page type: ${postType}`);
  }

  return config;
}
