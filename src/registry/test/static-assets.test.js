import { describe, it, expect } from 'vitest'
import app from '../src/index.ts'

describe('Static Asset Handling', () => {
  const mockEnv = {
    DB: {
      prepare: () => ({
        bind: () => ({
          all: () => [],
          get: () => null,
          run: () => ({ success: true })
        })
      })
    },
    BUCKET: {
      get: () => null,
      put: () => Promise.resolve()
    }
  }

  it('should handle favicon.ico requests gracefully', async () => {
    const response = await app.request('/favicon.ico', {}, mockEnv)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should handle robots.txt requests gracefully', async () => {
    const response = await app.request('/robots.txt', {}, mockEnv)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should allow asset paths to pass through (handled by Wrangler in production)', async () => {
    // Wrangler serves files from src/assets/ at root level, now under /public/ prefix
    // In our test environment, these reach our package handler since Wrangler isn't serving them
    // In production, Wrangler serves these before they reach Hono
    const response = await app.request('/public/styles/styles.css', {}, mockEnv)

    // In test environment, should return 404 from our handler (not blocked by static patterns)
    // This proves our static asset detection is not interfering with asset paths
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should allow image paths to pass through (handled by Wrangler in production)', async () => {
    // Test another asset path that Wrangler would serve
    const response = await app.request('/public/images/logo.png', {}, mockEnv)

    // Should not be blocked by static asset pattern detection
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should reject static assets that slip through to package handler', async () => {
    // Test a file extension that might slip through to the package handler
    const response = await app.request('/some-file.png', {}, mockEnv)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should reject manifest.json requests gracefully', async () => {
    const response = await app.request('/manifest.json', {}, mockEnv)
    expect(response.status).toBe(404)

    const data = await response.json()
    expect(data.error).toBe('Not found')
  })

  it('should still handle legitimate package requests', async () => {
    // Make sure we didn't break legitimate package requests
    const response = await app.request('/lodash', {}, mockEnv)
    expect(response.status).toBe(302) // Should redirect to default upstream
    expect(response.headers.get('location')).toBe('/local/lodash')
  })
})
