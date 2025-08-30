import type { HonoContext } from '../../types.ts'

/**
 * Handles static asset serving
 */
export const handleStaticAssets = async (c: HonoContext) => {
  try {
    const response = await c.env.ASSETS.fetch(c.req.raw)

    // If the ASSETS binding returns a 404, return a proper 404 response
    // with mutable headers to avoid the secure headers middleware conflict
    if (response.status === 404) {
      return c.notFound()
    }

    // For other non-200 responses, create a new response to avoid header conflicts
    if (!response.ok) {
      return c.text('Asset not available', response.status)
    }

    return response
  } catch (error) {
    console.error('Error serving static asset:', error)
    return c.text('Internal Server Error', 500)
  }
}

/**
 * Handles favicon requests
 */
export const handleFavicon = async (c: HonoContext) => {
  // Redirect to the correct favicon path
  return c.redirect('/public/images/favicon/favicon.ico', 301)
}

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
        type: 'image/png',
      },
      {
        src: '/public/images/favicon/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  })
}
