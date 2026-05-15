import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAiStudioApimartCatalog,
  buildAiStudioUpstreamCatalog,
  getAiStudioCatalogPaths,
} from "@/lib/ai-studio/catalog";

async function main() {
  const { upstreamCatalogPath, apimartCatalogPath } = getAiStudioCatalogPaths();
  const [upstream, apimart] = await Promise.all([
    buildAiStudioUpstreamCatalog(),
    buildAiStudioApimartCatalog(),
  ]);

  await mkdir(path.dirname(upstreamCatalogPath), { recursive: true });
  await writeFile(
    upstreamCatalogPath,
    `${JSON.stringify(upstream, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    apimartCatalogPath,
    `${JSON.stringify(apimart, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Synced AI Studio upstream catalog: ${upstream.items.length} models -> ${upstreamCatalogPath}`,
  );
  console.log(
    `Synced AI Studio APIMart catalog: ${apimart.items.length} models -> ${apimartCatalogPath}`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
