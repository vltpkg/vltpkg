// import { v4 as uuidv4 } from 'uuid' // Removed unused import
import { getAuthedUser, getTokenFromHeader } from '../utils/auth.ts'
import type { HonoContext, TokenCreateRequest, TokenScope } from '../../types.ts'

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
    const body = await c.req.json() as TokenCreateRequest & { token: string }
    const authToken = getTokenFromHeader(c)

    if (!body.token || !body.uuid || !body.scope) {
      return c.json({ error: 'Missing required fields: token, uuid, scope' }, 400)
    }

    // Use the enhanced database operation that includes validation
    await c.db.upsertToken(body.token, body.uuid, body.scope, authToken || undefined)
    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    // Handle validation errors
    if (err.message.includes('Invalid uuid')) {
      return c.json({ error: err.message }, 400)
    } else if (err.message.includes('Unauthorized')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Handle other errors
    console.error('Error in postToken:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}

// scope is optional (only for privileged tokens) - ex. "read:@scope/pkg" or "read+write:@scope/pkg"
export async function putToken(c: HonoContext) {
  try {
    const token = c.req.param('token')
    const body = await c.req.json() as { uuid: string; scope: TokenScope[] }
    const authToken = getTokenFromHeader(c)

    if (!token) {
      return c.json({ error: 'Token parameter required' }, 400)
    }

    if (!body.uuid || !body.scope) {
      return c.json({ error: 'Missing required fields: uuid, scope' }, 400)
    }

    // Use the enhanced database operation that includes validation
    await c.db.upsertToken(token, body.uuid, body.scope, authToken || undefined)
    return c.json({ success: true })
  } catch (error) {
    const err = error as Error
    // Handle validation errors
    if (err.message.includes('Invalid uuid')) {
      return c.json({ error: err.message }, 400)
    } else if (err.message.includes('Unauthorized')) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Handle other errors
    console.error('Error in putToken:', error)
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

    // Handle other errors
    console.error('Error in deleteToken:', error)
    return c.json({ error: 'Internal server error' }, 500)
  }
}
