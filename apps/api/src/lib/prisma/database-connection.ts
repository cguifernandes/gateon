import type { PoolConfig } from 'pg';

const PRODUCTION_SSL_MODES = new Set(['require', 'verify-ca', 'verify-full']);

/**
 * Runtime pool config for PrismaPg (@prisma/adapter-pg).
 * In production, enforces TLS to Supabase (or any remote Postgres).
 */
export function resolvePrismaRuntimePoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const securedUrl = ensureProductionDatabaseSsl(connectionString);
  assertProductionDatabaseSecurity(securedUrl);

  return {
    connectionString: securedUrl,
    ssl: resolvePgSslOption(securedUrl),
  };
}

/** URL for Prisma CLI (migrate deploy / migrate dev). Prefer DIRECT_URL when set. */
export function resolvePrismaMigrationDatabaseUrl(): string {
  const url =
    process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error('DIRECT_URL or DATABASE_URL is not set');
  }

  const securedUrl = ensureProductionDatabaseSsl(url);
  assertProductionDatabaseSecurity(securedUrl);
  return securedUrl;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function readSslMode(connectionString: string): string | null {
  try {
    const parsed = new URL(connectionString);
    return parsed.searchParams.get('sslmode')?.toLowerCase() ?? null;
  } catch {
    const match = connectionString.match(/[?&]sslmode=([^&]+)/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

/** Appends sslmode=require in production when missing (Supabase-safe default). */
export function ensureProductionDatabaseSsl(connectionString: string): string {
  if (!isProduction() || readSslMode(connectionString)) {
    return connectionString;
  }

  const separator = connectionString.includes('?') ? '&' : '?';
  return `${connectionString}${separator}sslmode=require`;
}

/** Fails fast in production if the URL would connect without TLS. */
export function assertProductionDatabaseSecurity(
  connectionString: string,
): void {
  if (!isProduction()) {
    return;
  }

  const sslMode = readSslMode(connectionString);
  if (!sslMode || !PRODUCTION_SSL_MODES.has(sslMode)) {
    throw new Error(
      'DATABASE_URL must include sslmode=require (or verify-full) in production',
    );
  }
}

function isLocalDatabaseHost(connectionString: string): boolean {
  try {
    const hostname = new URL(connectionString).hostname;
    return (
      hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
    );
  } catch {
    return /localhost|127\.0\.0\.1/i.test(connectionString);
  }
}

function resolvePgSslOption(
  connectionString: string,
): PoolConfig['ssl'] | undefined {
  const sslMode = readSslMode(connectionString);
  if (!sslMode || sslMode === 'disable' || sslMode === 'allow') {
    return undefined;
  }

  if (isLocalDatabaseHost(connectionString) && !isProduction()) {
    return undefined;
  }

  // Supabase uses a public CA; rejectUnauthorized must stay true in production.
  return { rejectUnauthorized: true };
}
