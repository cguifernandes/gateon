/** URL prefixes for routes that allow dashboard theme switching. */
export const PRIVATE_THEME_ROUTE_PREFIXES = [
  "/dashboard",
  "/groups",
  "/members",
] as const;

export function isPrivateThemeRoute(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return PRIVATE_THEME_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
