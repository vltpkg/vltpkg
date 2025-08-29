import { URL } from '../../config.ts'
import { createRoute, z } from '@hono/zod-openapi'

export const pingRoute = createRoute({
  method: 'get',
  path: '/-/ping',
  tags: ['Misc.'],
  summary: 'Ping',
  description: `Check if the server is alive
\`\`\`bash
$ npm ping
npm notice PING ${URL}
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
      description: 'Server is alive',
    },
  },
})
