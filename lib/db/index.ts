import type { PgDatabase } from 'drizzle-orm/pg-core/db';
import { cache } from 'react';
import { createDatabase, createPoolerDatabase, detectDatabase } from './config';
import type * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, typeof schema>;

const connectionString = process.env.DATABASE_URL || '';
const isCloudflare = process.env.DEPLOYMENT_PLATFORM === 'cloudflare';
const dbProvider = connectionString ? detectDatabase(connectionString) : 'unknown';
const isNeon = dbProvider === 'neon';

// For Cloudflare Workers: Check if Hyperdrive is configured (no need for DATABASE_URL)
// For other platforms: DATABASE_URL is required
const isHyperdriveConfigured = isCloudflare && !isNeon;

if (!connectionString && !isHyperdriveConfigured) {
  console.log('DATABASE_URL is not set');
}

// Database is enabled if either DATABASE_URL is set or Hyperdrive is configured
export const isDatabaseEnabled = !!(connectionString || isHyperdriveConfigured);

// Resolve DB from Cloudflare bindings (Hyperdrive in production, Pooler in local dev)
function resolveDbFromCloudflareEnv(env: any, tag: string): DB | null {
  const hyperdrive = env.HYPERDRIVE;
  if (hyperdrive?.connectionString) {
    console.log(`${tag} Using Hyperdrive connection`);
    return createPoolerDatabase(hyperdrive.connectionString, false);
  }

  const localConn = env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE;
  if (localConn) {
    const isSupabase = localConn.includes('supabase') || localConn.includes('pooler.supabase.com');
    if (isSupabase) {
      console.log(`${tag} Using Supabase Pooler connection (local dev)`);
      return createPoolerDatabase(localConn, 'require', 3);
    }
    console.log(`${tag} Using local connection string`);
    return createDatabase({ connectionString: localConn });
  }

  return null;
}

/**
 * Get database instance within request context.
 *
 * For Cloudflare Workers + Supabase/Hyperdrive:
 * - Production: Uses Hyperdrive binding (env.HYPERDRIVE)
 * - Local dev: Uses Pooler connection
 *
 * For other environments:
 * - Uses DATABASE_URL directly
 *
 * @returns Database instance
 */
export const getDb = cache((): DB => {
  if (!isHyperdriveConfigured) {
    if (!connectionString) throw new Error('[DB] DATABASE_URL is not set');
    return createDatabase({ connectionString });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = getCloudflareContext();
    const db = resolveDbFromCloudflareEnv(env, '[DB]');
    if (db) return db;
    console.error('[DB] HYPERDRIVE binding not found. Ensure hyperdrive is configured in wrangler.jsonc');
  } catch (error) {
    console.error('[DB] Failed to get Cloudflare context:', error);
  }

  if (connectionString) {
    console.log('[DB] Falling back to DATABASE_URL');
    return createDatabase({ connectionString });
  }

  throw new Error(
    '[DB] No database connection available. ' +
    'For Cloudflare Workers, ensure HYPERDRIVE is configured in wrangler.jsonc. ' +
    'For other platforms, ensure DATABASE_URL is set.'
  );
});

/**
 * Get database instance asynchronously for static routes (ISR/SSG).
 *
 * For Cloudflare Workers + Supabase/Hyperdrive:
 * - Production: Uses Hyperdrive binding (env.HYPERDRIVE)
 * - Local dev: Uses Pooler connection
 *
 * For other environments:
 * - Uses DATABASE_URL directly
 *
 * @returns Promise<Database instance>
 */
export const getDbAsync = cache(async (): Promise<DB> => {
  if (!isHyperdriveConfigured) {
    if (!connectionString) throw new Error('[DB Async] DATABASE_URL is not set');
    return createDatabase({ connectionString });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const { env } = await getCloudflareContext({ async: true });
    const db = resolveDbFromCloudflareEnv(env, '[DB Async]');
    if (db) return db;
    console.error('[DB Async] HYPERDRIVE binding not found. Ensure hyperdrive is configured in wrangler.jsonc');
  } catch (error) {
    console.error('[DB Async] Failed to get Cloudflare context:', error);
  }

  if (connectionString) {
    console.log('[DB Async] Falling back to DATABASE_URL');
    return createDatabase({ connectionString });
  }

  throw new Error(
    '[DB Async] No database connection available. ' +
    'For Cloudflare Workers, ensure HYPERDRIVE is configured in wrangler.jsonc. ' +
    'For other platforms, ensure DATABASE_URL is set.'
  );
});

// ============================================================================
// db - Backward-compatible database export (uses Proxy for lazy resolution)
// ============================================================================
//
// WARNING: This export is kept for backward compatibility but has limitations
// in Cloudflare Workers environment:
//
// 1. If accessed outside request context (e.g., module init), it will fall back
//    to DATABASE_URL or throw an error.
// 2. Once resolved via fallback, it won't switch to Hyperdrive even if available.
//
// RECOMMENDATION: Use getDb() in new code, especially for Cloudflare Workers.

export const db: DB = (isHyperdriveConfigured)
  ? createHyperdriveProxy(connectionString)
  : createDatabase({ connectionString });

function createHyperdriveProxy(fallbackUrl: string): DB {
  let _db: DB | null = null;
  let _hyperdriveChecked = false;

  function getOrResolveDb(): DB {
    if (!_hyperdriveChecked) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getCloudflareContext } = require('@opennextjs/cloudflare');
        const { env } = getCloudflareContext();
        _db = resolveDbFromCloudflareEnv(env, '[DB Proxy]');
        if (!_db) {
          console.warn(
            '[DB Proxy] HYPERDRIVE binding not found. ' +
            'Ensure hyperdrive is configured in wrangler.jsonc'
          );
        }
      } catch {
        // Outside request context - will use fallback
      }
      _hyperdriveChecked = true;
    }

    if (_db) return _db;

    if (fallbackUrl) {
      console.log('[DB Proxy] Using fallback DATABASE_URL');
      _db = createDatabase({ connectionString: fallbackUrl });
      return _db;
    }

    throw new Error(
      '[DB Proxy] No database available: HYPERDRIVE binding not found and DATABASE_URL is empty. ' +
      'Configure the hyperdrive binding in wrangler.jsonc for Cloudflare Workers.'
    );
  }

  return new Proxy({} as DB, {
    get(_, prop: string | symbol) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (getOrResolveDb() as any)[prop];
    },
  });
}
