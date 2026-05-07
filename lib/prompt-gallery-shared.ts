export const PROMPT_GALLERY_STATUS_VALUES = [
  "draft",
  "online",
  "offline",
] as const;

export type PromptGalleryStatus = (typeof PROMPT_GALLERY_STATUS_VALUES)[number];

export type PromptGalleryAuthor = {
  name: string;
  link: string;
};

export type PromptGalleryItem = {
  id: number;
  language: string;
  categories: string[];
  model: string;
  sourceId: number | null;
  title: string;
  description: string;
  sourceLink: string | null;
  sourcePublishedAt: string | null;
  sourcePlatform: string | null;
  author: PromptGalleryAuthor | null;
  coverUrl: string | null;
  inputVideos: string[];
  inputImages: string[];
  inputAudios: string[];
  results: string[];
  prompt: string;
  note: string | null;
  featured: boolean;
  sort: number;
  searchIndex: string;
  ups: number;
  downs: number;
  status: PromptGalleryStatus;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PromptGalleryAdminListInput = {
  pageIndex?: number;
  pageSize?: number;
  id?: string;
  status?: string;
  language?: string;
  category?: string;
  model?: string;
  author?: string;
  title?: string;
  prompt?: string;
};

export type PromptGalleryAdminData = {
  items: PromptGalleryItem[];
  count: number;
  summary: {
    total: number;
    online: number;
    draft: number;
    offline: number;
    featured: number;
    models: Array<{
      model: string;
      count: number;
    }>;
  };
  filterOptions: {
    languages: string[];
    categories: string[];
    models: string[];
    authors: string[];
  };
};

export function normalizePromptGalleryTextList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function parsePromptGalleryLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function stringifyPromptGalleryJson(value: unknown) {
  return JSON.stringify(Array.isArray(value) ? value : [], null, 2);
}

export function parsePromptGalleryJsonArray(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return [];
  }

  const parsed = JSON.parse(trimmed);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON value must be an array.");
  }

  return parsed
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function parsePromptGalleryCategories(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizePromptGalleryAuthor(
  value: unknown,
): PromptGalleryAuthor | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const link = typeof record.link === "string" ? record.link.trim() : "";

  if (!name && !link) {
    return null;
  }

  return {
    name,
    link,
  };
}

export function buildPromptGallerySearchIndex(input: {
  title: string;
  description: string;
  prompt: string;
  categories: string[];
  model: string;
  authorName: string;
  sourceId: number | null;
}) {
  return [
    input.title,
    input.description,
    input.prompt,
    input.categories.join(" "),
    input.model,
    input.authorName,
    input.sourceId?.toString() ?? "",
  ]
    .join(" ")
    .trim()
    .toLowerCase();
}

export function toPromptGalleryDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

export function toPromptGalleryDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().slice(0, 16);
}
