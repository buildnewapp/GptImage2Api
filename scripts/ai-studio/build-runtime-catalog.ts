import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  compileAiStudioRuntimeCatalog,
  getAiStudioCatalogPaths,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioModelOverridesFile,
  loadAiStudioPricingOverridesFile,
  validateAiStudioRuntimeBuildInput,
  validateAiStudioRuntimeCatalog,
} from "@/lib/ai-studio/catalog";

async function main() {
  const paths = getAiStudioCatalogPaths();
  const [upstream, modelOverrides, pricingOverrides] = await Promise.all([
    loadAiStudioMergedUpstreamCatalogFiles(paths.upstreamCatalogPath),
    loadAiStudioModelOverridesFile(paths.modelOverridesPath),
    loadAiStudioPricingOverridesFile(paths.pricingOverridesPath),
  ]);

  const inputErrors = validateAiStudioRuntimeBuildInput({
    upstream,
    modelOverrides,
    pricingOverrides,
  });
  if (inputErrors.length > 0) {
    throw new Error(
      `AI Studio runtime build validation failed:\n${inputErrors.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  const runtime = compileAiStudioRuntimeCatalog({
    upstream,
    modelOverrides,
    pricingOverrides,
  });
  const runtimeErrors = validateAiStudioRuntimeCatalog(runtime);
  if (runtimeErrors.length > 0) {
    throw new Error(
      `AI Studio runtime catalog is invalid:\n${runtimeErrors.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  await mkdir(path.dirname(paths.runtimeCatalogPath), { recursive: true });
  await writeFile(
    paths.runtimeCatalogPath,
    `${JSON.stringify(runtime, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Built AI Studio runtime catalog: ${runtime.items.length} models -> ${paths.runtimeCatalogPath}`,
  );
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
