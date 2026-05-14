import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvFile } from "dotenv";

const botPackageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

loadEnvFile({ path: resolve(botPackageRoot, ".env") });

const extraCa = process.env.NODE_EXTRA_CA_CERTS?.trim();
if (extraCa) {
  const pemPath = resolve(botPackageRoot, extraCa);
  process.env.NODE_EXTRA_CA_CERTS = pemPath;
  if (!existsSync(pemPath)) {
    console.warn(
      `[gateon/bot] NODE_EXTRA_CA_CERTS file not found (ignored by Node): ${pemPath}`,
    );
  }
}
