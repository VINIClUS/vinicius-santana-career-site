// Only these static compatibility routes may redirect. Query values are never targets.
export const legacyRoutes = Object.freeze({
  '/work/': '/explore/',
  '/work/cnesdata/': '/explore/cnesdata/',
  '/work/limnopulse/': '/explore/limnopulse/',
  '/work/infrastructure/': '/explore/infrastructure/'
} as const);

export function resolveLegacyDestination(currentUrl: URL): string | undefined {
  if (!Object.hasOwn(legacyRoutes, currentUrl.pathname)) return undefined;
  const destination = legacyRoutes[currentUrl.pathname as keyof typeof legacyRoutes];
  return destination + currentUrl.search + currentUrl.hash;
}
