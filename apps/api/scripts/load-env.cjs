/**
 * Preload before Nest (or any Node entry) so NODE_EXTRA_CA_CERTS is set
 * before the process TLS store is built. Mirrors apps/bot/src/load-env.ts.
 *
 * Usage: node -r ./scripts/load-env.cjs ...
 */
const { existsSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { config: loadDotenv } = require("dotenv");

const apiPackageRoot = join(__dirname, "..");

loadDotenv({ path: resolve(apiPackageRoot, ".env") });

const extraCa = process.env.NODE_EXTRA_CA_CERTS?.trim();
if (extraCa) {
  const pemPath = resolve(apiPackageRoot, extraCa);
  process.env.NODE_EXTRA_CA_CERTS = pemPath;
  if (!existsSync(pemPath)) {
    console.warn(
      `[gateon/api] NODE_EXTRA_CA_CERTS file not found (ignored by Node): ${pemPath}`,
    );
  }
}
