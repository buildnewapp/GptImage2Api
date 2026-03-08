import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAiStudioUpstreamCatalog,
  getAiStudioCatalogPaths,
} from "@/lib/ai-studio/catalog";

async function main() {
  const { upstreamCatalogPath } = getAiStudioCatalogPaths();
  const upstream = await buildAiStudioUpstreamCatalog();

  await mkdir(path.dirname(upstreamCatalogPath), { recursive: true });
  await writeFile(
    upstreamCatalogPath,
    `${JSON.stringify(upstream, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Synced AI Studio upstream catalog: ${upstream.items.length} models -> ${upstreamCatalogPath}`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
