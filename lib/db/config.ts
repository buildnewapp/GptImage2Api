import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { PgDatabase } from 'drizzle-orm/pg-core/db';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Define the database type based on the schema
type Schema = typeof schema;
// Use the base PgDatabase type with any for the query result type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = PgDatabase<any, Schema>;

interface DBConfig {
  connectionString: string;
  maxConnections?: number;
  enablePrepare?: boolean;
  enableSSL?: boolean | 'require';
  debug?: boolean;
}

// detect deployment platform
function detectPlatform() {
  // Cloudflare Workers: set via wrangler.jsonc vars
  if (process.env.DEPLOYMENT_PLATFORM === 'cloudflare') return 'cloudflare';
  if (process.env.VERCEL_ENV) return 'vercel';
  if (process.env.NETLIFY) return 'netlify';
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'lambda';
  return 'server';
}

// detect database provider
export function detectDatabase(connectionString: string) {
  if (connectionString.includes('supabase')) return 'supabase';
  if (connectionString.includes('neon')) return 'neon';
  if (connectionString.includes('amazonaws.com')) return 'aws-rds';
  if (connectionString.includes('googleapis.com')) return 'gcp-sql';
  return 'self-hosted';
}

// generate database configuration for postgres-js (Node.js only)
export function createDatabaseConfig(config: DBConfig) {
  const platform = detectPlatform();
  const database = detectDatabase(config.connectionString);

  // base configuration template
  const platformConfigs = {
    cloudflare: {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 15,
    },
    vercel: {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 15,
    },
    netlify: {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 15,
    },
    lambda: {
      max: 3,
      prepare: false,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
      connect_timeout: 30,
    },
    // long running server
    server: {
      max: 30,
      prepare: true,
      idle_timeout: 300,
      max_lifetime: 3600,
      connect_timeout: 30,
    },
  };

  // database specific configuration
  const databaseConfigs = {
    supabase: {
      ssl: 'require' as const,
      application_name: 'drizzle-supabase',
      connection: {
        statement_timeout: 30000,
      },
    },
    neon: {
      ssl: 'require' as const,
      application_name: 'drizzle-neon',
      prepare: false,
      connect_timeout: 20,
    },
    'aws-rds': {
      ssl: 'require' as const,
      application_name: 'drizzle-aws',
      keepalive: true,
      idle_timeout: 60,
    },
    'gcp-sql': {
      ssl: 'require' as const,
      application_name: 'drizzle-gcp',
      keepalive: true,
    },
    'self-hosted': {
      ssl: false,
      application_name: 'drizzle-app',
    },
  };

  const platformConfig = platformConfigs[platform];
  const databaseConfig = databaseConfigs[database];

  const finalConfig = {
    ...platformConfig,
    ...databaseConfig,

    ...(config.maxConnections && { max: config.maxConnections }),
    ...(config.enablePrepare !== undefined && { prepare: config.enablePrepare }),
    ...(config.enableSSL !== undefined && { ssl: config.enableSSL }),

    transform: {
      undefined: null,
      date: true,
    },

    debug: config.debug ?? (process.env.NODE_ENV === 'development'),
    onnotice: process.env.NODE_ENV === 'development' ? console.log : undefined,
  };

  return finalConfig;
}

// create database connection
export function createDatabase(config: DBConfig): DB {
  const platform = detectPlatform();

  // Cloudflare Workers + Neon: use HTTP-based neon driver (no TCP needed)
  if (platform === 'cloudflare' && detectDatabase(config.connectionString) === 'neon') {
    const { neon } = require('@neondatabase/serverless');
    const sql = neon(config.connectionString);
    return drizzleNeon(sql, { schema });
  }

  // Node.js environments: use postgres (TCP)
  const connectionConfig = createDatabaseConfig(config);
  const client = postgres(config.connectionString, connectionConfig);
  return drizzle(client, { schema });
}

// create database connection for Cloudflare Hyperdrive or Supabase Pooler
// ssl: false     → Hyperdrive (terminates SSL internally; Worker → Hyperdrive is internal)
// ssl: 'require' → Supabase Pooler (direct connection requires SSL)
export function createPoolerDatabase(connectionString: string, ssl: boolean | 'require' = false, max = 1): DB {
  const client = postgres(connectionString, {
    max,
    prepare: false,   // Hyperdrive/Pooler do not support prepared statements
    ssl,
    fetch_types: false, // CRITICAL: Required for Cloudflare Workers compatibility
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 15,
    transform: { undefined: null },
  });
  return drizzle(client, { schema });
}

export function previewConfig(config: DBConfig) {
  const finalConfig = createDatabaseConfig(config);
  const platform = detectPlatform();
  const database = detectDatabase(config.connectionString);

  return {
    platform,
    database,
    config: finalConfig,
    summary: {
      isServerless: ['vercel', 'netlify', 'lambda', 'cloudflare'].includes(platform),
      requiresSSL: finalConfig.ssl !== false,
      connectionPooling: finalConfig.max > 1,
      preparedStatements: finalConfig.prepare,
      // Hyperdrive is used on CF Workers for non-Neon databases
      isHyperdrive: platform === 'cloudflare' && database !== 'neon',
    }
  };
}
