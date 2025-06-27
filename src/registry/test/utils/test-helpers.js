/**
 * Creates a mock Hono context for testing
 *
 * @param {Object} options - Options for creating the context
 * @param {Object} options.req - Request properties
 * @param {Object} options.db - Mock database client
 * @param {string} [options.pkg] - Optional package name (for packageSpec mock)
 * @param {string} [options.username] - Optional username (for param mock)
 * @returns {Object} Mock Hono context
 */
export function createContext(options = {}) {
  const { req = {}, db = {}, pkg = null, username = null } = options;

  // Create a mock response
  let statusCode = 200;
  let responseBody = null;
  let responseHeaders = new Map();

  // Create the context object
  const context = {
    // Request properties
    req: {
      method: req.method || 'GET',
      header: (name) => req.headers?.[name] || null,
      param: (name) => {
        if (name === 'username' && username) {
          return username;
        }
        if (req.param instanceof Map) {
          return req.param.get(name);
        }
        if (typeof req.param === 'function') {
          return req.param(name);
        }
        return req.param?.[name] || null;
      },
      query: (name) => {
        if (req.query instanceof Map) {
          return req.query.get(name);
        }
        if (typeof req.query === 'function') {
          return req.query(name);
        }
        return req.query?.[name] || null;
      },
      json: req.json || (async () => (req.body || {})),
      body: req.body || {},
      ...req
    },

    // Database client
    db,

    // Mock packageSpec if pkg is provided
    pkg,

    // Mock username for parameter access
    username,

    // Response methods
    status: (code) => {
      statusCode = code;
      return context;
    },

    json: (body, status) => {
      responseBody = body;
      if (status) statusCode = status;

      return {
        status: statusCode,
        headers: responseHeaders,
        json: async () => responseBody
      };
    },

    header: (name, value) => {
      responseHeaders.set(name, value);
      return context;
    }
  };

  return context;
}
