/** Production alias only. Preview hosts such as *-mmirani-4641s-projects.vercel.app do not match. */
export const VERCEL_APP_HOST = "qurandeck.vercel.app";

/**
 * Edge redirect for the production *.vercel.app alias.
 * `redirects()` runs before static pages. `/api` stays on this host for OAuth callbacks.
 * The negative lookahead excludes `/api` and `/api/*`, and still matches `/`.
 */
export function apexAliasRedirects() {
  return [
    {
      source: "/:path((?!api(?:/|$)).*)",
      has: [{ type: "host" as const, value: VERCEL_APP_HOST }],
      destination: "https://qurandeck.com/:path",
      permanent: true as const,
    },
  ];
}
