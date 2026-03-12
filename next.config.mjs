import withBundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { unstable_readConfig as readWranglerConfig } from "wrangler";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  redirects: async () => [
    {
      source: "/dashboard",
      destination: "/dashboard/settings",
      permanent: true,
    },
    {
      source: "/zh/dashboard",
      destination: "/zh/dashboard/settings",
      permanent: true,
    },
    {
      source: "/ja/dashboard",
      destination: "/ja/dashboard/settings",
      permanent: true,
    },
  ],
  images: {
    unoptimized:
      process.env.NEXT_PUBLIC_OPTIMIZED_IMAGES &&
      process.env.NEXT_PUBLIC_OPTIMIZED_IMAGES === "false",
    remotePatterns: [
      ...(process.env.R2_PUBLIC_URL
        ? [
            {
              hostname: process.env.R2_PUBLIC_URL.replace("https://", ""),
            },
          ]
        : []),
    ],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error"],
          }
        : false,
  },
};

const withBundleAnalyzerWrapper = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

if (
  process.env.NODE_ENV === "development" &&
  !process.env.NEXTY_WELCOME_SHOWN
) {
  // console.log("\n🎉 Welcome to NEXTY.DEV Boilerplate!");
  // console.log("💬 Join our Discord community: https://discord.gg/VRDxBgXUZ8");
  // console.log("📚 Documentation: https://nexty.dev/docs\n\n");
  process.env.NEXTY_WELCOME_SHOWN = "true";
}

function createWranglerDevConfigPath() {
  const config = readWranglerConfig(
      { config: "./wrangler.jsonc" },
      { hideWarnings: true }
  );
  const devConfig = { ...config };

  delete devConfig.durable_objects;
  delete devConfig.migrations;
  delete devConfig.env;
  delete devConfig.unsafe;

  const outputDir = ".wrangler/tmp";
  const outputPath = join(outputDir, "wrangler.next-dev.generated.json");
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(devConfig, null, 2)}\n`);
  return outputPath;
}

// Initialize Cloudflare bindings for local development (next dev).
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev({
    configPath: createWranglerDevConfigPath(),
  });
}

export default withBundleAnalyzerWrapper(withNextIntl(nextConfig));
