import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

import {
  assertAiStudioCatalogCanReplaceExisting,
  buildAiStudioFalCatalog,
  buildAiStudioUpstreamCatalog,
  getAiStudioCatalogPaths,
  type AiStudioUpstreamCatalogFile,
  loadAiStudioFalModelsFile,
} from "@/lib/ai-studio/catalog";

loadEnvConfig(process.cwd());

async function readExistingCatalog(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as AiStudioUpstreamCatalogFile;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function main() {
  const { upstreamCatalogPath, apimartCatalogPath, falCatalogPath, falModelsPath } =
    getAiStudioCatalogPaths();
  const upstream = await buildAiStudioUpstreamCatalog();
  const falModels = await loadAiStudioFalModelsFile(falModelsPath);
  const existingUpstream = await readExistingCatalog(upstreamCatalogPath);

  if (existingUpstream && process.env.AI_STUDIO_ALLOW_CATALOG_SHRINK !== "1") {
    assertAiStudioCatalogCanReplaceExisting(
      upstream,
      existingUpstream,
      upstreamCatalogPath,
    );
  }

  await mkdir(path.dirname(upstreamCatalogPath), { recursive: true });
  await writeFile(
    upstreamCatalogPath,
    `${JSON.stringify(upstream, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Synced AI Studio upstream catalog: ${upstream.items.length} models -> ${upstreamCatalogPath}`,
  );

  const shouldSyncFal = process.env.AI_STUDIO_SYNC_FAL !== "0";

  if (
    !falModels.models.some((model) =>
      typeof model === "string" || model.enabled !== false,
    )
  ) {
    console.log(
      `Skipped AI Studio fal catalog sync: no enabled models -> ${falModelsPath}`,
    );
  } else if (!shouldSyncFal) {
    console.log(
      `Skipped AI Studio fal catalog sync: AI_STUDIO_SYNC_FAL=0 -> ${falCatalogPath}`,
    );
  } else {
    console.log(
      `Skipped AI Studio fal model price sync: using existing prices -> ${falModelsPath}`,
    );
    const fal = await buildAiStudioFalCatalog(falModels);
    await mkdir(path.dirname(falCatalogPath), { recursive: true });
    await writeFile(
      falCatalogPath,
      `${JSON.stringify(fal, null, 2)}\n`,
      "utf8",
    );
    console.log(
      `Synced AI Studio fal catalog: ${fal.items.length} models -> ${falCatalogPath}`,
    );
  }

  console.log(
    `Skipped AI Studio APIMart catalog sync -> ${apimartCatalogPath}`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
