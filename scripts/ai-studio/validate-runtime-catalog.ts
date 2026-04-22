import {
  getAiStudioCatalogPaths,
  loadAiStudioMergedUpstreamCatalogFiles,
  loadAiStudioModelOverridesFile,
  loadAiStudioPricingOverridesFile,
  loadAiStudioRuntimeCatalogFile,
  loadAiStudioSchemaOverridesFile,
  validateAiStudioRuntimeBuildInput,
  validateAiStudioRuntimeCatalog,
} from "@/lib/ai-studio/catalog";

async function main() {
  const paths = getAiStudioCatalogPaths();
  const [upstream, modelOverrides, pricingOverrides, schemaOverrides, runtime] = await Promise.all([
    loadAiStudioMergedUpstreamCatalogFiles(paths.upstreamCatalogPath),
    loadAiStudioModelOverridesFile(paths.modelOverridesPath),
    loadAiStudioPricingOverridesFile(paths.pricingOverridesPath),
    loadAiStudioSchemaOverridesFile(paths.schemaOverridesPath),
    loadAiStudioRuntimeCatalogFile(paths.runtimeCatalogPath),
  ]);

  const inputErrors = validateAiStudioRuntimeBuildInput({
    upstream,
    modelOverrides,
    pricingOverrides,
    schemaOverrides,
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
