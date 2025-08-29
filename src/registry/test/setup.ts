import { beforeAll, afterAll } from 'vitest'

// Test setup and teardown for Cloudflare Workers testing
beforeAll(async () => {
  // Any global setup needed for tests
  console.log('Setting up Cloudflare Workers tests...')
})

afterAll(async () => {
  // Any global cleanup needed after tests
  console.log('Cleaning up Cloudflare Workers tests...')
})
