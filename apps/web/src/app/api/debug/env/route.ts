import { NextResponse } from "next/server";
import {
  buildEnvConfigSnapshot,
  isEnvDebugEnabled,
} from "@/lib/env-config-snapshot";

export function GET() {
  if (!isEnvDebugEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    app: "web",
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    enabled: true,
    masked: true,
    variables: buildEnvConfigSnapshot(),
  });
}
