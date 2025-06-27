import { serveStatic } from 'hono/cloudflare-workers'
import type { HonoContext } from '../../types.ts'

/**
 * Handles static asset serving
 */
export const handleStaticAssets = serveStatic({
  root: './src/assets/public'
} as any)

/**
 * Handles favicon requests
 */
export const handleFavicon = serveStatic({
  path: './src/assets/public/images/favicon/favicon.ico'
} as any)

/**
 * Handles robots.txt requests
 */
export function handleRobots(c: HonoContext) {
  return c.text(`User-agent: *
Allow: /

Sitemap: ${c.req.url.replace(/\/robots\.txt$/, '/sitemap.xml')}`)
}

/**
 * Handles manifest.json requests for PWA
 */
export function handleManifest(c: HonoContext) {
  return c.json({
    name: 'VLT Serverless Registry',
    short_name: 'VSR',
    description: 'A serverless npm registry',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/public/images/favicon/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/public/images/favicon/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  })
}
