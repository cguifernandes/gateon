import { cookies, headers } from "next/headers";
import type { ZodType } from "zod";
import { buildUpstreamApiHeaders } from "@/lib/server/fetch/upstream-api-headers";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import { getSessionUser } from "../data/get-session";

export const UPSTREAM_ERRORS = {
  noApi: "API interna não configurada.",
  noSession: "Sessão não encontrada.",
  invalidResponse: "A resposta da API veio em formato inválido.",
  timeout: "A API demorou para responder. Tente novamente.",
} as const;

const DEFAULT_TIMEOUT_MS = 15_000;

type UpstreamSessionContext = {
  base: string;
  sessionToken: string;
  userId: string;
};

export async function resolveUpstreamSession(): Promise<
  { ok: true; ctx: UpstreamSessionContext } | { ok: false; error: string }
> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return { ok: false, error: UPSTREAM_ERRORS.noApi };
  }

  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: UPSTREAM_ERRORS.noSession };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { ok: false, error: UPSTREAM_ERRORS.noSession };
  }

  return {
    ok: true,
    ctx: { base, sessionToken, userId: user.id },
  };
}

async function buildAuthenticatedFetchHeaders(
  sessionToken: string,
  options?: { includeUpstreamApiHeaders?: boolean },
): Promise<Record<string, string>> {
  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  return {
    Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
    ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    ...(options?.includeUpstreamApiHeaders
      ? buildUpstreamApiHeaders(requestHeaders)
      : {}),
  };
}

type FetchAuthenticatedJsonOptions<T> = {
  path: string;
  schema: ZodType<T>;
  httpErrorMessage: string;
  cacheTags?: string[];
  cache?: RequestCache;
  timeoutMs?: number;
  includeUpstreamApiHeaders?: boolean;
  requireSessionUser?: boolean;
};

export type UpstreamJsonResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function fetchAuthenticatedUpstreamJson<T>(
  options: FetchAuthenticatedJsonOptions<T>,
): Promise<UpstreamJsonResult<T>> {
  if (options.requireSessionUser !== false) {
    const session = await resolveUpstreamSession();

    if (!session.ok) {
      return { ok: false, error: session.error };
    }

    return fetchAuthenticatedUpstreamJsonWithContext({
      ...options,
      ctx: session.ctx,
    });
  }

  const base = getServerApiBaseUrl();
  if (!base) {
    return { ok: false, error: UPSTREAM_ERRORS.noApi };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { ok: false, error: UPSTREAM_ERRORS.noSession };
  }

  return fetchAuthenticatedUpstreamJsonWithContext({
    ...options,
    ctx: { base, sessionToken, userId: "" },
  });
}

async function fetchAuthenticatedUpstreamJsonWithContext<T>({
  ctx,
  path,
  schema,
  httpErrorMessage,
  cacheTags,
  cache,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  includeUpstreamApiHeaders = false,
}: FetchAuthenticatedJsonOptions<T> & {
  ctx: UpstreamSessionContext;
}): Promise<UpstreamJsonResult<T>> {
  try {
    const fetchInit: RequestInit = {
      headers: await buildAuthenticatedFetchHeaders(ctx.sessionToken, {
        includeUpstreamApiHeaders,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (cacheTags) {
      fetchInit.next = { tags: cacheTags };
    } else {
      fetchInit.cache = cache ?? "no-store";
    }

    const response = await fetch(`${ctx.base}${path}`, fetchInit);

    if (!response.ok) {
      return { ok: false, error: httpErrorMessage };
    }

    const raw: unknown = await response.json();
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      return { ok: false, error: UPSTREAM_ERRORS.invalidResponse };
    }

    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, error: UPSTREAM_ERRORS.timeout };
  }
}

export async function fetchAuthenticatedUpstreamRaw(options: {
  path: string;
  cacheTags?: string[];
  cache?: RequestCache;
  timeoutMs?: number;
  includeUpstreamApiHeaders?: boolean;
  requireSessionUser?: boolean;
}): Promise<
  | { ok: true; response: Response; userId: string }
  | { ok: false; error: string; status?: number }
> {
  const session =
    options.requireSessionUser === false
      ? await (async () => {
          const base = getServerApiBaseUrl();
          if (!base) {
            return { ok: false as const, error: UPSTREAM_ERRORS.noApi };
          }
          const cookieStore = await cookies();
          const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
          if (!sessionToken) {
            return { ok: false as const, error: UPSTREAM_ERRORS.noSession };
          }
          return {
            ok: true as const,
            ctx: { base, sessionToken, userId: "" },
          };
        })()
      : await resolveUpstreamSession();

  if (!session.ok) {
    return { ok: false, error: session.error };
  }

  const { ctx } = session;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const fetchInit: RequestInit = {
      headers: await buildAuthenticatedFetchHeaders(ctx.sessionToken, {
        includeUpstreamApiHeaders: options.includeUpstreamApiHeaders,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    };

    if (options.cacheTags) {
      fetchInit.next = { tags: options.cacheTags };
    } else {
      fetchInit.cache = options.cache ?? "no-store";
    }

    const response = await fetch(`${ctx.base}${options.path}`, fetchInit);
    return { ok: true, response, userId: ctx.userId };
  } catch {
    return { ok: false, error: UPSTREAM_ERRORS.timeout };
  }
}
