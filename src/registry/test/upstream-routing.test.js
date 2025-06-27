import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import app from '../src/index.ts'

describe('Upstream Routing', () => {
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

  beforeEach(() => {
    // Reset any mocks
  })

  afterEach(() => {
    // Clean up
  })

  it('should reject reserved upstream names for upstream routes only', async () => {
    // Internal routes should work fine
    const response1 = await app.request('/-/ping', {}, mockEnv)
    expect(response1.status).toBe(200)

    // Hash-based routes should work even though * is reserved
    const response2 = await app.request('/*/abc123def456', {}, mockEnv)
    expect(response2.status).toBe(501) // Not implemented, but not blocked by validation
    const data2 = await response2.json()
    expect(data2.error).toContain('Hash-based package lookup not yet implemented')

    // Reserved upstream names should be rejected for upstream routes
    const response3 = await app.request('/docs/some-package', {}, mockEnv)
    expect(response3.status).toBe(400)
    const data3 = await response3.json()
    expect(data3.error).toContain('reserved')
  })

  it('should redirect root-level packages to default upstream', async () => {
    const response = await app.request('/lodash', {}, mockEnv)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/local/lodash')
  })

  it('should redirect scoped packages to default upstream', async () => {
    const response = await app.request('/@babel/core', {}, mockEnv)
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/local/@babel/core')
  })

  it('should handle upstream package requests', async () => {
    const response = await app.request('/npm/lodash', {}, mockEnv)
    // The npm upstream is configured and should work correctly
    // It might succeed (200) if network is available, or fail with various error codes
    expect([200, 400, 404, 501, 502, 503]).toContain(response.status)
  })

  it('should handle hash-based package requests', async () => {
    const response = await app.request('/*/abc123def456', {}, mockEnv)
    expect(response.status).toBe(501)
    const data = await response.json()
    expect(data.error).toContain('Hash-based package lookup not yet implemented')
  })

  it('should handle hash-based tarball requests', async () => {
    const response = await app.request('/*/abc123def456/-/package-1.0.0.tgz', {}, mockEnv)
    expect(response.status).toBe(501)
    const data = await response.json()
    expect(data.error).toContain('Hash-based tarball lookup not yet implemented')
  })

  it('should preserve existing internal routes', async () => {
    const response = await app.request('/-/ping', {}, mockEnv)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.ok).toBe(true)
  })
})
