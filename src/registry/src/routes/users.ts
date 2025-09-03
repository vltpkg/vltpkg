import { getAuthedUser } from '../utils/auth.ts'
import type { HonoContext } from '../../types.ts'
import { createRoute, z } from '@hono/zod-openapi'

export async function getUsername(c: HonoContext) {
  const user = await getAuthedUser({ c })
  const uuid = user?.uuid || 'anonymous'
  return c.json({ username: uuid }, 200)
}

export async function getUserProfile(c: HonoContext) {
  const user = await getAuthedUser({ c })
  const uuid = user?.uuid || 'anonymous'
  return c.json({ name: uuid }, 200)
}

// Route definitions for OpenAPI documentation
export const userProfileRoute = createRoute({
  method: 'get',
  path: '/-/user',
  tags: ['Authentication'],
  summary: 'Get User Profile',
  description: `Returns profile object associated with auth token
\`\`\`bash
$ npm profile
name: johnsmith
created: 2015-02-26T01:26:01.124Z
updated: 2023-01-10T21:55:32.118Z
\`\`\``,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string(),
          }),
        },
      },
      description: 'User Profile',
    },
  },
})

export const whoamiRoute = createRoute({
  method: 'get',
  path: '/-/whoami',
  tags: ['Authentication'],
  summary: 'Who Am I',
  description: `Returns the username of the authenticated user
\`\`\`bash
$ npm whoami
johnsmith
\`\`\``,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            username: z.string(),
          }),
        },
      },
      description: 'Username',
    },
  },
})
