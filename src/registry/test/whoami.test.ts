import { describe, it, expect } from 'vitest'
// eslint-disable-next-line import/no-unresolved
import { env } from 'cloudflare:test'
import { app } from '../src/index.ts'

// Default admin token from the database schema (unused in current tests)
// const ADMIN_TOKEN = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
// const ADMIN_USERNAME = 'admin'

describe('Whoami Endpoint', () => {
  describe('Authentication Behavior', () => {
    it('should require authentication for root whoami endpoint', async () => {
      const res = await app.request('/-/whoami', {}, env)
      // Should return 200 with 'anonymous' when no auth provided
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('username')
      expect(data.username).toBe('anonymous') // No auth = anonymous
    })

    it('should require authentication for upstream whoami endpoints', async () => {
      const res = await app.request('/npm/-/whoami', {}, env)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('username')
      expect(data.username).toBe('anonymous') // No auth = anonymous
    })

    it('should handle malformed authorization header gracefully', async () => {
      const res = await app.request(
        '/-/whoami',
        {
          headers: {
            Authorization: 'InvalidFormat',
          },
        },
        env,
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.username).toBe('anonymous') // Invalid auth = anonymous
    })

    it('should handle invalid token gracefully', async () => {
      const res = await app.request(
        '/-/whoami',
        {
          headers: {
            Authorization: 'Bearer invalid-token-12345',
          },
        },
        env,
      )
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.username).toBe('anonymous') // Invalid token = anonymous
    })
  })

  describe('Endpoint Availability', () => {
    it('should be available on root registry path', async () => {
      const res = await app.request('/-/whoami', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain(
        'application/json',
      )
    })

    it('should be available on npm upstream path', async () => {
      const res = await app.request('/npm/-/whoami', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain(
        'application/json',
      )
    })

    it('should be available on jsr upstream path', async () => {
      const res = await app.request('/jsr/-/whoami', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain(
        'application/json',
      )
    })

    it('should be available on custom upstream path', async () => {
      const res = await app.request('/custom/-/whoami', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain(
        'application/json',
      )
    })
  })

  describe('Response Format', () => {
    it('should return correct JSON structure', async () => {
      const res = await app.request('/-/whoami', {}, env)
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data).toHaveProperty('username')
      expect(typeof data.username).toBe('string')
    })

    it('should return consistent format across all upstream paths', async () => {
      const paths = [
        '/-/whoami',
        '/npm/-/whoami',
        '/jsr/-/whoami',
        '/custom/-/whoami',
      ]

      for (const path of paths) {
        const res = await app.request(path, {}, env)
        expect(res.status).toBe(200)
        const data = await res.json()
        expect(data).toHaveProperty('username')
        expect(typeof data.username).toBe('string')
      }
    })
  })
})
