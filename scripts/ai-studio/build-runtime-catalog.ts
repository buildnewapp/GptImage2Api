import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  buildAiStudioKiePricesFile,
  compileAiStudioRuntimeCatalog,
  getAiStudioCatalogPaths,
  loadAiStudioFormUiOverridesFile,
  loadAiStudioKiePricesFile,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioModelOverridesFile,
  loadAiStudioPricingOverridesFile,
  loadAiStudioSchemaOverridesFile,
  validateAiStudioRuntimeBuildInput,
  validateAiStudioRuntimeCatalog,
} from "@/lib/ai-studio/catalog";

async function main() {
  const paths = getAiStudioCatalogPaths();
  const kiePrices = await buildAiStudioKiePricesFile(paths.kieRawPricePath);

  await mkdir(path.dirname(paths.kiePricesPath), { recursive: true });
  await writeFile(
    paths.kiePricesPath,
    `${JSON.stringify(kiePrices, null, 2)}\n`,
    "utf8",
  );

  const [upstream, loadedKiePrices, modelOverrides, pricingOverrides, formUiOverrides, schemaOverrides] = await Promise.all([
    loadAiStudioMergedUpstreamCatalogFiles(paths.upstreamCatalogPath),
    loadAiStudioKiePricesFile(paths.kiePricesPath),
    loadAiStudioModelOverridesFile(paths.modelOverridesPath),
    loadAiStudioPricingOverridesFile(paths.pricingOverridesPath),
    loadAiStudioFormUiOverridesFile(paths.formUiOverridesPath),
    loadAiStudioSchemaOverridesFile(paths.schemaOverridesPath),
  ]);

  const inputErrors = validateAiStudioRuntimeBuildInput({
    upstream,
    kiePrices: loadedKiePrices,
    modelOverrides,
    pricingOverrides,
    formUiOverrides,
    schemaOverrides,
  });
  if (inputErrors.length > 0) {
    throw new Error(
      `AI Studio runtime build validation failed:\n${inputErrors.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  const runtime = compileAiStudioRuntimeCatalog({
    upstream,
    kiePrices: loadedKiePrices,
    modelOverrides,
    pricingOverrides,
    formUiOverrides,
    schemaOverrides,
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
