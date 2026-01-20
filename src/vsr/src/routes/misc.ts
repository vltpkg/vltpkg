import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'
import type { Environment } from '../../types.ts'

// Route definitions for miscellaneous endpoints

export const auditRoute = createRoute({
  method: 'post',
  path: '/-/npm/audit',
  tags: ['Security'],
  summary: 'Security Audit (Not Implemented)',
  description: `⚠️ **NOT IMPLEMENTED** - This endpoint is planned for future implementation.

Currently returns a placeholder response indicating the feature is not available.
  
For actual security auditing, use:
- \`npm audit\` with the official npm registry
- Third-party security scanning tools
- Socket.dev integration (planned for v1.x)

\`\`\`bash
$ npm audit  # Will hit this endpoint but get "not implemented" response
\`\`\``,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            version: z.string().optional(),
            requires: z.record(z.string()).optional(),
            dependencies: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    501: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
            message: z.string(),
            feature: z.literal('security_audit'),
            status: z.literal('not_implemented'),
          }),
        },
      },
      description:
        'Feature not implemented - security auditing is planned for future release',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Invalid request format',
    },
  },
})

export const auditQuickRoute = createRoute({
  method: 'post',
  path: '/-/npm/v1/security/audits/quick',
  tags: ['NPM Compatibility'],
  summary: 'Quick Security Audit',
  description: `⚠️ **REDIRECTS TO /-/npm/audit** - This endpoint redirects to the main audit endpoint with a 308 status.

The main audit endpoint is currently not implemented and returns a "not implemented" response.`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            version: z.string().optional(),
            requires: z.record(z.string()).optional(),
            dependencies: z.record(z.any()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    308: {
      description:
        'Permanent redirect to /-/npm/audit (which returns 501 Not Implemented)',
    },
  },
})

export const advisoriesBulkRoute = createRoute({
  method: 'post',
  path: '/-/npm/v1/security/advisories/bulk',
  tags: ['NPM Compatibility'],
  summary: 'Bulk Security Advisories',
  description: `⚠️ **REDIRECTS TO /-/npm/audit** - This endpoint redirects to the main audit endpoint with a 308 status.

The main audit endpoint is currently not implemented and returns a "not implemented" response.`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.record(z.array(z.string())),
        },
      },
    },
  },
  responses: {
    308: {
      description:
        'Permanent redirect to /-/npm/audit (which returns 501 Not Implemented)',
    },
  },
})

// Dashboard/GUI routes
export const dashboardDataRoute = createRoute({
  method: 'get',
  path: '/dashboard.json',
  tags: ['Dashboard'],
  summary: 'Dashboard Data',
  description: `Get dashboard configuration data for the VSR web interface`,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            registry: z.object({
              url: z.string(),
              name: z.string(),
            }),
            features: z.object({
              search: z.boolean(),
              publish: z.boolean(),
              access: z.boolean(),
            }),
          }),
        },
      },
      description: 'Dashboard configuration',
    },
  },
})

export const appDataRoute = createRoute({
  method: 'get',
  path: '/app-data.json',
  tags: ['Dashboard'],
  summary: 'App Data',
  description: `Get application data for the VSR web interface`,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            packages: z.array(
              z.object({
                name: z.string(),
                version: z.string(),
                description: z.string().optional(),
              }),
            ),
            stats: z.object({
              totalPackages: z.number(),
              totalDownloads: z.number(),
            }),
          }),
        },
      },
      description: 'Application data',
    },
  },
})

// npm v1 API compatibility redirects
export const searchRedirectRoute = createRoute({
  method: 'get',
  path: '/-/v1/search',
  tags: ['NPM Compatibility'],
  summary: 'Search',
  description: `Redirect to current search endpoint for npm v1 compatibility`,
  request: {},
  responses: {
    308: {
      description: 'Permanent redirect to /-/search',
    },
  },
})

export const userRedirectRoute = createRoute({
  method: 'get',
  path: '/-/npm/v1/user',
  tags: ['NPM Compatibility'],
  summary: 'User Profile',
  description: `Redirect to current user endpoint for npm v1 compatibility`,
  request: {},
  responses: {
    308: {
      description: 'Permanent redirect to /-/user',
    },
  },
})

export const tokensRedirectRoute = createRoute({
  method: 'get',
  path: '/-/npm/v1/tokens',
  tags: ['NPM Compatibility'],
  summary: 'Get Tokens',
  description: `Redirect to current tokens endpoint for npm v1 compatibility`,
  request: {},
  responses: {
    308: {
      description: 'Permanent redirect to /-/tokens',
    },
  },
})

export const createTokenRedirectRoute = createRoute({
  method: 'post',
  path: '/-/npm/v1/tokens',
  tags: ['NPM Compatibility'],
  summary: 'Create Token',
  description: `Redirect to current create token endpoint for npm v1 compatibility`,
  request: {},
  responses: {
    308: {
      description: 'Permanent redirect to /-/tokens',
    },
  },
})

export const updateTokenRedirectRoute = createRoute({
  method: 'put',
  path: '/-/npm/v1/tokens',
  tags: ['NPM Compatibility'],
  summary: 'Update Token',
  description: `Redirect to current update token endpoint for npm v1 compatibility`,
  request: {},
  responses: {
    308: {
      description: 'Permanent redirect to /-/tokens',
    },
  },
})

export const deleteTokenRedirectRoute = createRoute({
  method: 'delete',
  path: '/-/npm/v1/tokens/token/{token}',
  tags: ['NPM Compatibility'],
  summary: 'Delete Token',
  description: `Redirect to current delete token endpoint for npm v1 compatibility`,
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    308: {
      description: 'Permanent redirect to /-/tokens/:token',
    },
  },
})

// Static asset routes (for documentation purposes)
export const staticAssetsRoute = createRoute({
  method: 'get',
  path: '/public/{path}',
  tags: ['Static Assets'],
  summary: 'Static Assets',
  description: `Serve static assets (CSS, JS, images, etc.)`,
  request: {
    params: z.object({
      path: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        'application/octet-stream': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Static file content',
    },
    404: {
      description: 'File not found',
    },
  },
})

export const faviconRoute = createRoute({
  method: 'get',
  path: '/favicon.ico',
  tags: ['Static Assets'],
  summary: 'Favicon',
  description: `Serve the favicon for the registry`,
  request: {},
  responses: {
    200: {
      content: {
        'image/x-icon': {
          schema: z.string().openapi({ format: 'binary' }),
        },
      },
      description: 'Favicon file',
    },
  },
})

export const robotsRoute = createRoute({
  method: 'get',
  path: '/robots.txt',
  tags: ['Static Assets'],
  summary: 'Robots.txt',
  description: `Serve robots.txt for web crawlers`,
  request: {},
  responses: {
    200: {
      content: {
        'text/plain': {
          schema: z.string(),
        },
      },
      description: 'Robots.txt content',
    },
  },
})

export const webManifestRoute = createRoute({
  method: 'get',
  path: '/manifest.json',
  tags: ['Static Assets'],
  summary: 'Web App Manifest',
  description: `Serve web app manifest for PWA support`,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
            short_name: z.string(),
            description: z.string(),
            start_url: z.string(),
            display: z.string(),
            theme_color: z.string(),
            background_color: z.string(),
            icons: z.array(
              z.object({
                src: z.string(),
                sizes: z.string(),
                type: z.string(),
              }),
            ),
          }),
        },
      },
      description: 'Web app manifest',
    },
  },
})

// Dashboard route handlers
export async function handleDashboardData(
  c: Context,
): Promise<Response> {
  const env = c.env as Environment

  // Standalone mode: provide dashboard data directly
  const dashboardData = {
    registry: {
      url: env.URL || 'http://localhost:1337',
      name: 'vlt serverless registry',
    },
    features: {
      search: true,
      publish: true,
      access: true,
    },
  }

  return c.json(dashboardData)
}

export async function handleAppData(c: Context): Promise<Response> {
  // Standalone mode: provide app data directly from the registry database
  try {
    // For now, return empty data structure - in a full implementation,
    // we would query the database for actual package data
    const packages: {
      name: string
      version: string
      description?: string
    }[] = []

    const appData = {
      packages,
      stats: {
        totalPackages: packages.length,
        totalDownloads: 0, // This would need to be tracked separately
      },
    }

    return c.json(appData)
  } catch (_error) {
    // If database is not available, return empty data
    const appData = {
      packages: [],
      stats: {
        totalPackages: 0,
        totalDownloads: 0,
      },
    }

    return c.json(appData)
  }
}

// Security audit handler (not implemented)
export async function handleSecurityAudit(
  c: Context,
): Promise<Response> {
  return c.json(
    {
      error: 'Security audit not implemented',
      message: 'This feature is not yet available in VSR',
      status: 'not_implemented',
      feature: 'security_audit',
    },
    501,
  )
}
