import { getRuntimeConfig } from '../utils/config.ts'
import { createRoute, z } from '@hono/zod-openapi'
import type { Context } from 'hono'

export const pingRoute = createRoute({
  method: 'get',
  path: '/-/ping',
  tags: ['Health Check'],
  summary: 'Ping',
  description: `Check if the server is alive
\`\`\`bash
$ npm ping
npm notice PING ${getRuntimeConfig().URL}
npm notice PONG 13ms
\`\`\``,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({}),
        },
      },
      headers: z.object({
        'npm-notice': z.string().openapi({
          description: 'Contains "PONG" for npm client compatibility',
          example: 'PONG',
        }),
      }),
      description: 'Server is alive',
    },
  },
})

// Ping route handler
export function handlePing(c: Context): Response {
  c.header('npm-notice', 'PONG')
  return c.json({}, 200)
}
