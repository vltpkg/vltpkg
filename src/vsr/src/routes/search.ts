import type { HonoContext } from '../../types.ts'
import { createRoute, z } from '@hono/zod-openapi'

/**
 * Search for packages by text query
 */
export async function searchPackages(c: HonoContext) {
  try {
    const text = c.req.query('text')

    if (!text) {
      return c.json(
        {
          error: 'Missing required parameter "text"',
        },
        400,
      )
    }

    // Use the existing database search function
    const results = await c.get('db').searchPackages(text)

    return c.json(results)
  } catch (error) {
    // TODO: Replace with proper logging system
    // eslint-disable-next-line no-console
    console.error('Search error:', error)
    return c.json(
      {
        error: 'Internal server error',
      },
      500,
    )
  }
}

// Route definition for OpenAPI documentation
export const searchPackagesRoute = createRoute({
  method: 'get',
  path: '/-/search',
  tags: ['Search'],
  summary: 'Search Packages',
  description: `Search for packages by text query
\`\`\`bash
$ npm search react
\`\`\``,
  request: {
    query: z.object({
      text: z.string().describe('Search query string'),
      size: z
        .string()
        .optional()
        .describe('Number of results to return (default: 20)'),
      from: z
        .string()
        .optional()
        .describe('Offset for pagination (default: 0)'),
    }),
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            objects: z.array(
              z.object({
                package: z.object({
                  name: z.string(),
                  version: z.string(),
                  description: z.string().optional(),
                  keywords: z.array(z.string()).optional(),
                  date: z.string().optional(),
                  links: z
                    .object({
                      npm: z.string().optional(),
                      homepage: z.string().optional(),
                      repository: z.string().optional(),
                      bugs: z.string().optional(),
                    })
                    .optional(),
                  author: z
                    .object({
                      name: z.string(),
                      email: z.string().optional(),
                    })
                    .optional(),
                  publisher: z
                    .object({
                      username: z.string(),
                      email: z.string().optional(),
                    })
                    .optional(),
                  maintainers: z
                    .array(
                      z.object({
                        username: z.string(),
                        email: z.string().optional(),
                      }),
                    )
                    .optional(),
                }),
                score: z.object({
                  final: z.number(),
                  detail: z.object({
                    quality: z.number(),
                    popularity: z.number(),
                    maintenance: z.number(),
                  }),
                }),
                searchScore: z.number(),
              }),
            ),
            total: z.number(),
            time: z.string(),
          }),
        },
      },
      description: 'Search results',
    },
    400: {
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
      description: 'Bad request - missing text parameter',
    },
  },
})
