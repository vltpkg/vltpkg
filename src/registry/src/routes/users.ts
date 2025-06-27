import { getAuthedUser } from '../utils/auth.ts'
import type { HonoContext } from '../../types.ts'

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
