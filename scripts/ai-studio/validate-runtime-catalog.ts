import {
  getAiStudioCatalogPaths,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioModelOverridesFile,
  loadAiStudioPricingOverridesFile,
  loadAiStudioRuntimeCatalogFile,
  validateAiStudioRuntimeBuildInput,
  validateAiStudioRuntimeCatalog,
} from "@/lib/ai-studio/catalog";

async function main() {
  const paths = getAiStudioCatalogPaths();
  const [upstream, modelOverrides, pricingOverrides, runtime] = await Promise.all([
    loadAiStudioMergedUpstreamCatalogFiles(paths.upstreamCatalogPath),
    loadAiStudioModelOverridesFile(paths.modelOverridesPath),
    loadAiStudioPricingOverridesFile(paths.pricingOverridesPath),
    loadAiStudioRuntimeCatalogFile(paths.runtimeCatalogPath),
  ]);

  const inputErrors = validateAiStudioRuntimeBuildInput({
    upstream,
    modelOverrides,
    pricingOverrides,
  });
  const runtimeErrors = validateAiStudioRuntimeCatalog(runtime);
  const errors = [...inputErrors, ...runtimeErrors];

  if (errors.length > 0) {
    throw new Error(
      `AI Studio runtime validation failed:\n${errors.map((item) => `- ${item}`).join("\n")}`,
    );
  }

  console.log(`Validated AI Studio runtime catalog: ${runtime.items.length} models`);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
