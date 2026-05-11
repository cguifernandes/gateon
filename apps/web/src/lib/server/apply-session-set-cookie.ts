import { SESSION_COOKIE_NAME } from "@/lib/utils";

/** Mirrors Next.js `cookies().set` options used for session forwarding. */
type CookieStoreSetOptions = {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
};

/**
 * Parses one Set-Cookie value from the Nest API and applies it to Next's cookie store.
 * Only whitelists the session cookie name to avoid unintended cookies.
 */
export function applySessionSetCookieFromUpstream(
  cookieStore: {
    set: (name: string, value: string, options?: CookieStoreSetOptions) => void;
  },
  header: string,
): void {
  const segments = header.split(";").map((s) => s.trim());
  const first = segments[0];
  if (!first) {
    return;
  }

  const eq = first.indexOf("=");
  if (eq === -1) {
    return;
  }

  const name = first.slice(0, eq).trim();
  let value = first.slice(eq + 1).trim();
  if (name !== SESSION_COOKIE_NAME) {
    return;
  }

  try {
    value = decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    /* keep raw */
  }

  const options: CookieStoreSetOptions = {};

  for (let i = 1; i < segments.length; i++) {
    const part = segments[i];
    if (!part) {
      continue;
    }
    const attributeEq = part.indexOf("=");
    const attrKey =
      attributeEq === -1 ? part : part.slice(0, attributeEq).trim();
    const attrVal =
      attributeEq === -1 ? "" : part.slice(attributeEq + 1).trim();
    const lower = attrKey.toLowerCase();

    if (lower === "max-age") {
      const n = Number(attrVal);
      if (!Number.isNaN(n)) {
        options.maxAge = n;
      }
    } else if (lower === "expires") {
      const d = new Date(attrVal);
      if (!Number.isNaN(d.getTime())) {
        options.expires = d;
      }
    } else if (lower === "domain") {
      options.domain = attrVal;
    } else if (lower === "path") {
      options.path = attrVal;
    } else if (lower === "secure") {
      options.secure = true;
    } else if (lower === "httponly") {
      options.httpOnly = true;
    } else if (lower === "samesite") {
      const v = attrVal.toLowerCase();
      if (v === "none") {
        options.sameSite = "none";
      } else if (v === "strict") {
        options.sameSite = "strict";
      } else {
        options.sameSite = "lax";
      }
    }
  }

  cookieStore.set(name, value, options);
}

export function getSetCookieLines(res: Response): string[] {
  const h = res.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof h.getSetCookie === "function") {
    return h.getSetCookie();
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}
