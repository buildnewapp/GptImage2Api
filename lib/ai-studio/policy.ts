import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AiStudioCatalogEntry, AiStudioDocDetail } from "@/lib/ai-studio/catalog";
import { getAiStudioPublicModelId } from "@/lib/ai-studio/catalog";

export type AiStudioPolicyConfig = {
  allowedModelIds: string[];
  blockedModelIds: string[];
};

const DEFAULT_AI_STUDIO_CONFIG_DIR = path.join(
  process.cwd(),
  "config",
  "ai-studio",
);

const DEFAULT_POLICY: AiStudioPolicyConfig = {
  allowedModelIds: [],
  blockedModelIds: [],
};

export function getAiStudioPolicyPath() {
  return (
    process.env.AI_STUDIO_POLICY_PATH ??
    path.join(DEFAULT_AI_STUDIO_CONFIG_DIR, "policy.json")
  );
}

export async function loadAiStudioPolicyConfig(
  filePath = getAiStudioPolicyPath(),
): Promise<AiStudioPolicyConfig> {
  try {
    const content = await readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as Partial<AiStudioPolicyConfig>;

    return {
      allowedModelIds: Array.isArray(parsed.allowedModelIds)
        ? parsed.allowedModelIds.filter((item): item is string => typeof item === "string")
        : [],
      blockedModelIds: Array.isArray(parsed.blockedModelIds)
        ? parsed.blockedModelIds.filter((item): item is string => typeof item === "string")
        : [],
    };
  } catch {
    return DEFAULT_POLICY;
  }
}

function matchesModelReference(
  entry: Pick<AiStudioCatalogEntry, "id" | "category" | "alias">,
  targetIds: string[],
) {
  if (targetIds.length === 0) {
    return false;
  }

  const publicId = getAiStudioPublicModelId(entry);
  return targetIds.includes(entry.id) || targetIds.includes(publicId);
}

export function canAccessAiStudioModel(
  entry: Pick<AiStudioCatalogEntry, "id" | "category" | "alias" | "pricingRows">,
  options: {
    role?: string | null;
    config: AiStudioPolicyConfig;
  },
) {
  if (matchesModelReference(entry, options.config.blockedModelIds)) {
    return false;
  }

  if (
    options.config.allowedModelIds.length > 0 &&
    !matchesModelReference(entry, options.config.allowedModelIds)
  ) {
    return false;
  }

  if ((entry.pricingRows?.length ?? 0) === 0 && options.role !== "admin") {
    return false;
  }

  return true;
}

export function filterAiStudioCatalogForRole<T extends AiStudioCatalogEntry | AiStudioDocDetail>(
  entries: T[],
  options: {
    role?: string | null;
    config: AiStudioPolicyConfig;
  },
) {
  return entries.filter((entry) => canAccessAiStudioModel(entry, options));
}
