export type BlogDataSource = "cms" | "geo";

export function getBlogDataSource(): BlogDataSource {
  return process.env.BLOG_DATA_SOURCE?.trim().toLowerCase() === "geo"
    ? "geo"
    : "cms";
}
