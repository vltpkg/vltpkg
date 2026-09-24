// the deployment's own origin, mirroring next's social-image fallback (next/dist/lib/metadata/resolvers/resolve-url):
// dev → localhost, preview deploys → the preview url, production → the project's primary domain
// (docs.vlt.sh / docs.vlt.io both serve that deployment, so either host's pages point at the primary).
// SITE_URL overrides it for any other host.
const https = (host?: string) =>
  host ? `https://${host}` : undefined

export const siteUrl = new URL(
  process.env.SITE_URL ??
    (process.env.NODE_ENV === 'development' ?
      `http://localhost:${process.env.PORT ?? 3000}`
    : process.env.VERCEL_ENV === 'preview' ?
      https(process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL)
    : https(process.env.VERCEL_PROJECT_PRODUCTION_URL)) ??
    `http://localhost:${process.env.PORT ?? 3000}`,
)
