export const SIDEBAR_OPEN_STORAGE_KEY = "gateon.sidebar.open";
export const SIDEBAR_OPEN_CHANGE_EVENT = "gateon:sidebar-open-change";
export const SIDEBAR_STATE_HTML_ATTR = "data-sidebar-state";

function syncSidebarStateHtmlAttribute(open: boolean): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(
    SIDEBAR_STATE_HTML_ATTR,
    open ? "expanded" : "collapsed",
  );
}

const SIDEBAR_OPEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function readStoredSidebarOpen(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(SIDEBAR_OPEN_STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  } catch {
    return null;
  }
}

export function getSidebarOpenSnapshot(): boolean {
  return readStoredSidebarOpen() ?? true;
}

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

export function readSidebarOpenFromCookies(cookieStore: CookieReader): boolean {
  const value = cookieStore.get(SIDEBAR_OPEN_STORAGE_KEY)?.value;
  if (value === "false") return false;
  if (value === "true") return true;
  return true;
}

export function persistSidebarOpen(open: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_OPEN_STORAGE_KEY, String(open));
    // biome-ignore lint/suspicious/noDocumentCookie: mirrors localStorage for SSR on full page load
    document.cookie = `${SIDEBAR_OPEN_STORAGE_KEY}=${open}; path=/; max-age=${SIDEBAR_OPEN_COOKIE_MAX_AGE}; SameSite=Lax`;
    syncSidebarStateHtmlAttribute(open);
    window.dispatchEvent(new Event(SIDEBAR_OPEN_CHANGE_EVENT));
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function subscribeSidebarOpen(onStoreChange: () => void): () => void {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(SIDEBAR_OPEN_CHANGE_EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(SIDEBAR_OPEN_CHANGE_EVENT, handler);
  };
}

/** Runs once on the client to mirror an existing localStorage value into the cookie. */
export function syncSidebarOpenCookieFromStorage(): void {
  const stored = readStoredSidebarOpen();
  if (stored === null) return;
  try {
    // biome-ignore lint/suspicious/noDocumentCookie: mirrors localStorage for SSR on full page load
    document.cookie = `${SIDEBAR_OPEN_STORAGE_KEY}=${stored}; path=/; max-age=${SIDEBAR_OPEN_COOKIE_MAX_AGE}; SameSite=Lax`;
    syncSidebarStateHtmlAttribute(stored);
  } catch {
    // Ignore.
  }
}
