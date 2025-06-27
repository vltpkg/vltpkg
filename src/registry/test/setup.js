import { beforeAll, afterAll } from 'vitest'
import { execSync } from 'child_process'

// Mock environment variables needed for testing
beforeAll(() => {
  process.env.DOMAIN = 'http://localhost:0'
  process.env.PROXY = 'true'
  process.env.PROXY_URL = 'https://registry.npmjs.org'

  // Setup test database
  try {
    execSync('npm run test:setup', { stdio: 'inherit' })
  } catch (err) {
    console.error('Failed to setup test database:', err)
    process.exit(1)
  }

  // Mock the Cloudflare Workers environment
  globalThis.env = {
    DB: {
      prepare: async (query) => ({
        bind: async (...args) => ({
          run: async () => {
            // For token validation
            if (query.includes('SELECT * FROM tokens')) {
              return {
                results: [{
                  token: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
                  uuid: 'admin',
                  scope: JSON.stringify([
                    {
                      values: ['*'],
                      types: {
                        pkg: { read: true, write: true },
                        user: { read: true, write: true }
                      }
                    }
                  ])
                }]
              }
            }
            return { results: [] }
          }
        })
      })
    },
    BUCKET: {
      get: async () => null,
      put: async () => {}
    },
    executionCtx: {
      waitUntil: (promise) => promise
    }
  }
})

afterAll(() => {
  // Cleanup test database
  try {
    execSync('npm run test:cleanup', { stdio: 'inherit' })
  } catch (err) {
    console.error('Failed to cleanup test database:', err)
  }
})
