#!/usr/bin/env node

/**
 * Sync local .env.local environment variables to Cloudflare Workers Secrets
 * Usage: node scripts/sync-env-to-cloudflare.mjs [.env file path] [--concurrency=N]
 */

import { exec, execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { createInterface } from "readline";
import { promisify } from "util";

const execAsync = promisify(exec);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// ANSI colors
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
  secret: (msg) => console.log(`${colors.blue}🔐 ${msg}${colors.reset}`),
  skip: (msg) => console.log(`${colors.yellow}⏭️  ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}   ⚠️  ${msg}${colors.reset}`),
};

// Determine if a variable is a Secret: variables not starting with NEXT_PUBLIC_* are treated as Secrets
function isSecretKey(key) {
  return !key.startsWith("NEXT_PUBLIC_");
}

// Parse .env file - referencing sync-env-to-github.mjs implementation
function parseEnvFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  const entries = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Match KEY=VALUE pattern
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      let [, key, value] = match;

      // First, trim the value and handle \r (Windows line endings)
      value = value.trim().replace(/\r$/, "");

      // Check if value starts with quote
      if (value.startsWith('"') || value.startsWith("'")) {
        const quote = value[0];
        // Find the closing quote
        const endQuoteIndex = value.indexOf(quote, 1);
        if (endQuoteIndex !== -1) {
          // Extract value between quotes
          value = value.substring(1, endQuoteIndex);
        }
      } else {
        // Remove inline comments (unquoted values only)
        // Match: value # comment
        const commentIndex = value.indexOf(" #");
        if (commentIndex !== -1) {
          value = value.substring(0, commentIndex);
        }
        value = value.trim();
      }

      entries.push({ key, value });
    }
  }

  return entries;
}

// Set Secret asynchronously (for concurrent processing)
async function setWranglerSecretAsync(key, value) {
  try {
    const escapedValue = value.replace(/"/g, '\\"');
    await execAsync(
      `echo "${escapedValue}" | pnpm wrangler secret put "${key}"`,
      {
        stdio: "pipe",
        encoding: "utf-8",
      }
    );
    return { success: true, key };
  } catch (error) {
    return { success: false, key, error: error.message };
  }
}

// Set Secret synchronously (for sequential fallback)
function setWranglerSecretSync(key, value) {
  try {
    execSync(
      `echo "${value.replace(/"/g, '\\"')}" | pnpm wrangler secret put "${key}"`,
      {
        stdio: "pipe",
        encoding: "utf-8",
      }
    );
    return true;
  } catch (error) {
    return false;
  }
}

// Process items in batches with concurrency limit - referencing sync-env-to-github.mjs
async function processBatch(items, concurrency, processFn) {
  const results = [];
  const executing = new Set();

  for (const item of items) {
    const promise = processFn(item).then((result) => {
      executing.delete(promise);
      return result;
    });
    executing.add(promise);
    results.push(promise);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}

// Parse command line arguments
function parseArgs(args) {
  const options = {
    envFile: ".env",
    concurrency: 20, // Default concurrency
  };

  for (const arg of args) {
    if (arg.startsWith("--concurrency=")) {
      options.concurrency = parseInt(arg.split("=")[1], 10) || 5;
    } else if (!arg.startsWith("--")) {
      options.envFile = arg;
    }
  }

  return options;
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);
  const envPath = resolve(process.cwd(), options.envFile);

  console.log("🚀 Cloudflare Workers Environment Variables Sync Tool");
  console.log("=====================================\n");

  // Check if file exists
  if (!existsSync(envPath)) {
    log.error(`File not found: ${envPath}`);
    console.log("   Please create .env.local or specify a file path");
    process.exit(1);
  }

  log.info(`📂 Reading from: ${options.envFile}`);
  log.info(`⚡ Concurrency: ${options.concurrency}`);

  // Check wrangler login
  try {
    execSync("pnpm wrangler whoami", { stdio: "pipe" });
    log.success("Wrangler logged in");
  } catch {
    log.error("Please run: pnpm wrangler login");
    process.exit(1);
  }

  console.log("");

  const entries = parseEnvFile(envPath);

  // Filter and prepare tasks
  const tasks = [];
  let skippedCount = 0;
  let notSecretCount = 0;

  for (const { key, value } of entries) {
    if (!value) {
      log.skip(`Skipping ${key} (empty value)`);
      skippedCount++;
      continue;
    }

    if (isSecretKey(key)) {
      tasks.push({ key, value });
    } else {
      notSecretCount++;
    }
  }

  console.log("");

  if (tasks.length === 0) {
    log.warn("No Secrets found to set");
    console.log("");
    console.log("Possible reasons:");
    console.log("  1. Secrets values in .env.local are empty");
    console.log("  2. Variable names do not match");
    console.log("");
    console.log(`Scanned ${entries.length} variables, including:`);
    console.log(`  - ${notSecretCount} are not Secrets (e.g., NEXT_PUBLIC_*)`);
    console.log(`  - ${skippedCount} have empty values`);
    console.log("");
    console.log("All variables not starting with NEXT_PUBLIC_* are recognized as Secrets");
    rl.close();
    return;
  }

  log.info(`Found ${tasks.length} Secrets to set:\n`);
  tasks.forEach(({ key, value }) => {
    const masked =
      value.length > 8
        ? value.substring(0, 4) + "****" + value.substring(value.length - 4)
        : "****";
    console.log(`  🔐 ${key}: ${masked}`);
  });

  console.log("");
  const confirm = await question("Confirm setting the above Secrets? (y/N): ");

  if (confirm.toLowerCase() !== "y") {
    console.log("Cancelled");
    rl.close();
    return;
  }

  console.log("");
  log.info(`Starting to set Secrets (concurrency: ${options.concurrency})...\n`);

  const startTime = Date.now();

  // Use concurrent processing
  const results = await processBatch(
    tasks,
    options.concurrency,
    async (task) => {
      log.secret(`Setting ${task.key}...`);
      const result = await setWranglerSecretAsync(task.key, task.value);

      if (result.success) {
        log.success(`  ${task.key}`);
      } else {
        log.error(`  ${task.key}`);
        if (result.error) {
          log.warn(result.error);
        }
      }

      return result;
    }
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Count results
  let successCount = 0;
  const failedVars = [];

  for (const result of results) {
    if (result.success) {
      successCount++;
    } else {
      failedVars.push(result.key);
    }
  }

  console.log("");
  console.log("=====================================");
  log.success(`Completed! Time elapsed: ${elapsed}s`);
  console.log(`   🔐 Secrets succeeded: ${successCount}`);
  if (failedVars.length > 0) {
    log.error(`   Failed: ${failedVars.length}`);
    console.log("");
    log.error("The following variables failed to set:");
    failedVars.forEach((key) => console.log(`     - ${key}`));
  }
  console.log("");

  // Show public variables reminder
  const publicVars = entries.filter(
    ({ key, value }) => value && key.startsWith("NEXT_PUBLIC_")
  );

  if (publicVars.length > 0) {
    console.log("📋 Reminder: The following public variables need to be set in wrangler.jsonc:");
    publicVars.forEach(({ key, value }) => {
      console.log(`  📦 ${key}=${value}`);
    });
    console.log("");
  }

  console.log("🎉 Done");

  rl.close();
}

main().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
