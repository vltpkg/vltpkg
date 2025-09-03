import { Scalar } from '@scalar/hono-api-reference'
import { SCALAR_API_CONFIG } from '../../config.ts'

export const getDocs = Scalar(async c => {
  try {
    // Use the current request's origin instead of hardcoded localhost URL
    const origin = new URL(c.req.url).origin
    const api = await fetch(`${origin}/-/api`)

    if (!api.ok) {
      throw new Error(
        `API fetch failed: ${api.status} ${api.statusText}`,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const result = (await api.json()) as Record<string, any>

    // Merge dynamic API spec with static config, with static config taking precedence
    const {
      authentication,
      defaultHttpClient,
      ...configWithoutAuth
    } = SCALAR_API_CONFIG

    // Fix hardcoded localhost URLs in static config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const staticContent = {
      ...SCALAR_API_CONFIG.spec.content,
      servers: [
        {
          url: origin,
          description: 'Current deployment',
        },
      ],
    }

    const options = {
      // Start with static config to preserve ALL your settings
      ...configWithoutAuth,
      spec: {
        ...SCALAR_API_CONFIG.spec,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        content: {
          // Dynamic API content first
          ...result,
          // Static config overrides any conflicts (info, servers, security, etc.)
          ...staticContent,
        },
      },
      // Fix custom CSS URL to use current origin
      customCss: `@import '${origin}/public/styles/styles.css';`,
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return options as any
  } catch (error) {
    // Fallback to static config if API fetch fails
    // eslint-disable-next-line no-console
    console.error('Failed to fetch API spec:', error)
    return SCALAR_API_CONFIG
  }
})
