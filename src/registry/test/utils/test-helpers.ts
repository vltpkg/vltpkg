interface MockRequest {
  method?: string
  headers?: Record<string, string>
  param?: any // Allow flexible param types for testing
  query?: any // Allow flexible query types for testing
  json?: () => Promise<any>
  body?: any
  text?: any
}

interface MockDatabase {
  [key: string]: any
}

interface CreateContextOptions {
  req?: MockRequest
  db?: MockDatabase
  pkg?: string | null
  username?: string | null
}

// More flexible mock context that can be cast to HonoContext
interface MockContext {
  req: {
    method: string
    header: (name: string) => string | null
    param: (name: string) => string | null
    query: (name: string) => string | null
    json: () => Promise<any>
    text?: () => Promise<string>
    body: any
    [key: string]: any
  }
  db: MockDatabase
  pkg: string | null
  username: string | null
  status: (code: number) => MockContext
  json: (
    body: any,
    status?: number,
  ) => {
    status: number
    headers: Map<string, string>
    json: () => Promise<any>
  }
  header: (name: string, value: string) => MockContext
  env?: any
  finalized?: boolean
  error?: any
  event?: any
  // Add other Hono context properties as needed
  [key: string]: any
}

/**
 * Creates a mock Hono context for testing
 * @param {CreateContextOptions} options - Options for creating the context
 * @param {MockRequest} options.req - Request properties
 * @param {MockDatabase} options.db - Mock database client
 * @param {string | null} options.pkg - Optional package name (for packageSpec mock)
 * @param {string | null} options.username - Optional username (for param mock)
 * @returns {MockContext} Mock Hono context
 */
export function createContext(
  options: CreateContextOptions = {},
): MockContext {
  const { req = {}, db = {}, pkg = null, username = null } = options

  // Create a mock response
  let statusCode = 200
  let responseBody: any = null
  const responseHeaders = new Map<string, string>()

  // Helper function to handle param/query that can be Map, Record, or function
  const createAccessor = (
    source: any,
    fallbackName?: string,
    fallbackValue?: string,
  ) => {
    return (name: string): string | null => {
      if (name === fallbackName && fallbackValue) {
        return fallbackValue
      }
      if (source instanceof Map) {
        return source.get(name) || null
      }
      if (typeof source === 'function') {
        return source(name)
      }
      if (source && typeof source === 'object') {
        return source[name] || null
      }
      return null
    }
  }

  // Create the context object
  const context: MockContext = {
    // Request properties
    req: {
      method: req.method || 'GET',
      header: (name: string) => req.headers?.[name] || null,
      param: createAccessor(
        req.param,
        'username',
        username ?? undefined,
      ),
      query: createAccessor(req.query),
      json: req.json ?? (async () => req.body ?? {}),
      text: req.text ?? (async () => ''),
      body: req.body ?? {},
      ...req,
    },

    // Database client
    db,

    // Mock packageSpec if pkg is provided
    pkg,

    // Mock username for parameter access
    username,

    // Response methods
    status: (code: number) => {
      statusCode = code
      return context
    },

    json: (body: any, status?: number) => {
      responseBody = body
      if (status) statusCode = status

      return {
        status: statusCode,
        headers: responseHeaders,
        json: async () => responseBody,
      }
    },

    header: (name: string, value: string) => {
      responseHeaders.set(name, value)
      return context
    },

    // Add minimal Hono context compatibility
    env: {},
    finalized: false,
    error: null,
    event: null,
  }

  return context
}

// Helper to cast mock context to HonoContext for tests
export function asHonoContext(mockContext: MockContext): any {
  return mockContext as any
}
