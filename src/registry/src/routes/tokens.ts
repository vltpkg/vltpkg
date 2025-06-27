// import { v4 as uuidv4 } from 'uuid' // Removed unused import
import { getTokenFromHeader } from '../utils/auth.ts'
import type { HonoContext } from '../../types.ts'
import { createRoute, z } from '@hono/zod-openapi'

export async function getToken(c: HonoContext) {
  const token = c.req.param('token')
  if (!token) {
    return c.json({ error: 'Token parameter required' }, 400)
  }

  const tokenData = await c.db.getToken(token)
  if (!tokenData) {
    return c.json({ error: 'Token not found' }, 404)
  }

  return c.json(tokenData)
}

export async function postToken(c: HonoContext) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await c.req.json()
    const authToken = getTokenFromHeader(c)

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!body.token || !body.uuid || !body.scope) {
      return c.json(
        { error: 'Missing required fields: token, uuid, scope' },
        400,
      )
    }

    // Use the enhanced database operation that includes validation
    await c.db.upsertToken(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      body.token,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      body.uuid,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      body.scope,
      authToken || undefined,
    )
    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    // Handle validation errors
    if (err.message.includes('Invalid uuid')) {
      return c.json({ error: err.message }, 400)
    } else if (err.message.includes('Unauthorized')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Handle other errors - log to monitoring system instead of console
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// scope is optional (only for privileged tokens) - ex. "read:@scope/pkg" or "read+write:@scope/pkg"
export async function putToken(c: HonoContext) {
  try {
    const token = c.req.param('token')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const body = await c.req.json()
    const authToken = getTokenFromHeader(c)

    if (!token) {
      return c.json({ error: 'Token parameter required' }, 400)
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!body.uuid || !body.scope) {
      return c.json(
        { error: 'Missing required fields: uuid, scope' },
        400,
      )
    }

    // Use the enhanced database operation that includes validation
    await c.db.upsertToken(
      token,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      body.uuid,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      body.scope,
      authToken || undefined,
    )
    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    // Handle validation errors
    if (err.message.includes('Invalid uuid')) {
      return c.json({ error: err.message }, 400)
    } else if (err.message.includes('Unauthorized')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Handle other errors - log to monitoring system instead of console
    return c.json({ error: 'Internal server error' }, 500)
  }
}

export async function deleteToken(c: HonoContext) {
  try {
    const token = c.req.param('token')
    const authToken = getTokenFromHeader(c)

    if (!token) {
      return c.json({ error: 'Token parameter required' }, 400)
    }

    // Use the enhanced database operation that includes validation
    await c.db.deleteToken(token, authToken || undefined)
    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    // Handle validation errors
    if (err.message.includes('Unauthorized')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Handle other errors - log to monitoring system instead of console
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// Route definitions for OpenAPI documentation
export const getTokensRoute = createRoute({
  method: 'get',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'List Tokens',
  description: `List all authentication tokens for the authenticated user
\`\`\`bash
$ npm token list
\`\`\``,
  request: {},
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.array(
            z.object({
              token: z.string(),
              key: z.string(),
              cidr_whitelist: z.array(z.string()).optional(),
              readonly: z.boolean(),
              automation: z.boolean(),
              created: z.string(),
              updated: z.string(),
            }),
          ),
        },
      },
      description: 'List of tokens',
    },
  },
})

export const createTokenRoute = createRoute({
  method: 'post',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'Create Token',
  description: `Create a new authentication token
\`\`\`bash
$ npm token create
\`\`\``,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            uuid: z.string(),
            scope: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            key: z.string(),
          }),
        },
      },
      description: 'Token created successfully',
    },
  },
})

export const updateTokenRoute = createRoute({
  method: 'put',
  path: '/-/tokens',
  tags: ['Authentication'],
  summary: 'Update Token',
  description: `Update an existing authentication token`,
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            uuid: z.string(),
            scope: z.string(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: z.object({
            token: z.string(),
            key: z.string(),
          }),
        },
      },
      description: 'Token updated successfully',
    },
  },
})

export const deleteTokenRoute = createRoute({
  method: 'delete',
  path: '/-/tokens/token/{token}',
  tags: ['Authentication'],
  summary: 'Delete Token',
  description: `Delete an authentication token
\`\`\`bash
$ npm token revoke <token>
\`\`\``,
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    204: {
      description: 'Token deleted successfully',
    },
  },
})
