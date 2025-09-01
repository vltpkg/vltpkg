import { packageSpec } from './packages.ts'
import type {
  HonoContext,
  TokenScope,
  TokenAccess,
  AuthUser,
  DatabaseOperations,
} from '../../types.ts'

// Helper function to get typed database from context
function getDb(c: HonoContext): DatabaseOperations {
  return c.get('db')
}

export function getTokenFromHeader(c: HonoContext): string | null {
  const auth = c.req.header('Authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.substring(7).trim()
  }
  return null
}

export function parseTokenAccess({
  scope,
  pkg,
  uuid,
}: {
  scope: TokenScope[]
  pkg?: string
  uuid: string
}): TokenAccess {
  const read = ['get']
  const write = ['put', 'post', 'delete']
  const temp: TokenAccess = {
    anyUser: false,
    specificUser: false,
    anyPackage: false,
    specificPackage: false,
    readAccess: false,
    writeAccess: false,
    methods: [],
  }

  // TODO: add for multiple package access/aliases in scopes
  const alternates: Record<string, string> = {}

  scope.map(s => {
    if (s.types.pkg) {
      if (s.values.includes('*')) {
        temp.anyPackage = true
      }
      if (
        pkg &&
        (s.values.includes(pkg) ||
          (alternates[pkg] && s.values.includes(alternates[pkg])))
      ) {
        temp.specificPackage = true
      }
      if (
        (temp.anyPackage || temp.specificPackage) &&
        s.types.pkg.read
      ) {
        temp.readAccess = true
      }
      if (
        (temp.anyPackage || temp.specificPackage) &&
        s.types.pkg.write
      ) {
        temp.writeAccess = true
      }
    }
    if (s.types.user) {
      if (s.values.includes('*')) {
        temp.anyUser = true
      }
      if (s.values.includes(`~${uuid}`)) {
        temp.specificUser = true
      }
      if ((temp.anyUser || temp.specificUser) && s.types.user.read) {
        temp.readAccess = true
      }
      if ((temp.anyUser || temp.specificUser) && s.types.user.write) {
        temp.writeAccess = true
      }
    }
  })

  temp.methods = (temp.readAccess ? read : []).concat(
    temp.writeAccess ? write : [],
  )
  return temp
}

export function isUserRoute(path: string): boolean {
  const routes = [
    'ping',
    'whoami',
    'vlt/tokens',
    'npm/v1/user',
    'npm/v1/tokens',
    'org/',
  ]
  return !!routes.filter(r => path.startsWith(`/-/${r}`)).length
}

export async function getUserFromToken({
  c,
  token,
}: {
  c: HonoContext
  token: string
}): Promise<AuthUser> {
  const result = await getDb(c).getToken(token)
  if (!result) return { uuid: null, scope: null, token }

  // Handle the case when scope is already an object (for tests)
  let scope = result.scope
  if (typeof scope === 'string') {
    try {
      scope = JSON.parse(scope) as TokenScope[]
    } catch (_e) {
      // Log error to monitoring system instead of console
      return { uuid: null, scope: null, token }
    }
  }

  return {
    uuid: result.uuid,
    scope,
    token,
  }
}

export async function getAuthedUser({
  c,
  token,
}: {
  c: HonoContext
  token?: string | null
}): Promise<AuthUser | null> {
  const authToken = token || getTokenFromHeader(c)
  if (!authToken) {
    return null
  }
  return await getUserFromToken({ c, token: authToken })
}

export async function verifyToken(
  token: string,
  c: HonoContext,
): Promise<boolean> {
  const method = c.req.method ? c.req.method.toLowerCase() : ''

  if (!token) {
    return false
  }

  const { uuid, scope } = await getUserFromToken({ c, token })

  if (!uuid || !scope?.length) {
    return false
  } else {
    const { path } = c.req
    const { pkg } = packageSpec(c)
    const routeType =
      isUserRoute(path) ? 'user'
      : pkg ? 'pkg'
      : null

    // determine access
    const parseParams: {
      scope: TokenScope[]
      uuid: string
      pkg?: string
    } = { scope, uuid }
    if (pkg) {
      parseParams.pkg = pkg
    }
    const {
      anyUser,
      specificUser,
      anyPackage,
      specificPackage,
      methods,
    } = parseTokenAccess(parseParams)

    const methodAllowed = methods.includes(method)

    // if the route is a user route
    if (routeType === 'user') {
      return methodAllowed && (anyUser || specificUser)
    }

    // handle package routes
    if (routeType === 'pkg') {
      return methodAllowed && (anyPackage || specificPackage)
    }

    // fallback to false (should be unreachable code path)
    return false
  }
}
