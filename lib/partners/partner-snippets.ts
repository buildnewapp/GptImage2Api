import { actionResponse, type ActionResult } from "@/lib/action-response";
import { getDb, isDatabaseEnabled } from "@/lib/db";
import { cacheDb } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/error-utils";
import { and, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import "server-only";

export type PartnerSnippet = {
  key: string;
  html: string;
  sort: number;
  home: boolean;
  partners: boolean;
  enabled: boolean;
};

export type PartnerSnippetsConfig = {
  version: 1;
  items: PartnerSnippet[];
};

export type PartnerSnippetPlacement = "home" | "partners";

export const PARTNER_SNIPPETS_NAMESPACE = "site_settings";
export const PARTNER_SNIPPETS_CACHE_KEY = "partner_snippets";
export const PARTNER_SNIPPETS_CACHE_TAG = "partner-snippets";

export const defaultPartnerSnippets: PartnerSnippet[] = [
  // {
  //   key: "product-hunt",
  //   html: `<a href="https://www.producthunt.com/" target="_blank" rel="nofollow sponsored noopener noreferrer" aria-label="Visit Product Hunt" style="display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:inherit;font-weight:600;font-size:14px;line-height:1;"><img src="https://cdn.simpleicons.org/producthunt/da552f" alt="Product Hunt" width="20" height="20" /><span>Product Hunt</span></a>`,
  //   sort: 10,
  //   home: true,
  //   partners: true,
  //   enabled: true,
  // },
];

const SETTINGS_EXPIRES_AT = new Date("2099-01-01T00:00:00.000Z");

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeSort(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizePartnerSnippets(value: unknown): PartnerSnippet[] {
  const items = Array.isArray(value)
    ? value
    : value &&
        typeof value === "object" &&
        Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: unknown[] }).items
      : [];

  return items
    .map((item): PartnerSnippet | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const raw = item as Record<string, unknown>;
      const key = typeof raw.key === "string" ? raw.key.trim() : "";
      const html = typeof raw.html === "string" ? raw.html.trim() : "";

      if (!key || !html) {
        return null;
      }

      return {
        key,
        html,
        sort: normalizeSort(raw.sort),
        home: normalizeBoolean(raw.home, true),
        partners: normalizeBoolean(raw.partners, true),
        enabled: normalizeBoolean(raw.enabled, true),
      };
    })
    .filter((item): item is PartnerSnippet => Boolean(item))
    .sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));
}

function toConfig(items: PartnerSnippet[]): PartnerSnippetsConfig {
  return {
    version: 1,
    items: normalizePartnerSnippets(items),
  };
}

async function upsertPartnerSnippetsConfig(items: PartnerSnippet[]) {
  await getDb()
    .insert(cacheDb)
    .values({
      namespace: PARTNER_SNIPPETS_NAMESPACE,
      cacheKey: PARTNER_SNIPPETS_CACHE_KEY,
      valueJsonb: toConfig(items),
      expiresAt: SETTINGS_EXPIRES_AT,
      consumedAt: null,
    })
    .onConflictDoUpdate({
      target: [cacheDb.namespace, cacheDb.cacheKey],
      set: {
        valueJsonb: toConfig(items),
        expiresAt: SETTINGS_EXPIRES_AT,
        consumedAt: null,
        updatedAt: new Date(),
      },
    });
}

async function fetchPartnerSnippets(): Promise<PartnerSnippet[]> {
  if (!isDatabaseEnabled) {
    return defaultPartnerSnippets;
  }

  const rows = await getDb()
    .select({ valueJsonb: cacheDb.valueJsonb })
    .from(cacheDb)
    .where(
      and(
        eq(cacheDb.namespace, PARTNER_SNIPPETS_NAMESPACE),
        eq(cacheDb.cacheKey, PARTNER_SNIPPETS_CACHE_KEY),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) {
    await upsertPartnerSnippetsConfig(defaultPartnerSnippets);
    return defaultPartnerSnippets;
  }

  const items = normalizePartnerSnippets(row.valueJsonb);
  return items;
}

const getCachedPartnerSnippets = unstable_cache(
  fetchPartnerSnippets,
  [PARTNER_SNIPPETS_CACHE_KEY],
  {
    revalidate: 300,
    tags: [PARTNER_SNIPPETS_CACHE_TAG],
  },
);

export async function getPartnerSnippets(): Promise<PartnerSnippet[]> {
  try {
    return await getCachedPartnerSnippets();
  } catch (error) {
    console.error("Failed to load partner snippets:", error);
    return defaultPartnerSnippets;
  }
}

export async function getPartnerSnippetsForPlacement(
  placement: PartnerSnippetPlacement,
): Promise<PartnerSnippet[]> {
  const items = await getPartnerSnippets();
  return items.filter((item) => item.enabled && item[placement]);
}

export async function getAdminPartnerSnippets(): Promise<
  ActionResult<PartnerSnippet[]>
> {
  try {
    if (!isDatabaseEnabled) {
      return actionResponse.success(defaultPartnerSnippets);
    }

    const rows = await getDb()
      .select({ valueJsonb: cacheDb.valueJsonb })
      .from(cacheDb)
      .where(
        and(
          eq(cacheDb.namespace, PARTNER_SNIPPETS_NAMESPACE),
          eq(cacheDb.cacheKey, PARTNER_SNIPPETS_CACHE_KEY),
        ),
      )
      .limit(1);

    if (!rows[0]) {
      await upsertPartnerSnippetsConfig(defaultPartnerSnippets);
      return actionResponse.success(defaultPartnerSnippets);
    }

    const items = normalizePartnerSnippets(rows[0].valueJsonb);
    return actionResponse.success(items);
  } catch (error) {
    console.error("Failed to load admin partner snippets:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}

export async function savePartnerSnippets(
  items: PartnerSnippet[],
): Promise<ActionResult<PartnerSnippet[]>> {
  if (!isDatabaseEnabled) {
    return actionResponse.error("Database is not enabled.");
  }

  try {
    const normalized = normalizePartnerSnippets(items);
    await upsertPartnerSnippetsConfig(normalized);
    return actionResponse.success(normalized);
  } catch (error) {
    console.error("Failed to save partner snippets:", error);
    return actionResponse.error(getErrorMessage(error));
  }
}
