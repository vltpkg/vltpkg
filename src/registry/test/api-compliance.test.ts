import { describe, it, expect } from 'vitest'
import app from '../src/index'

describe('API Compliance Tests', () => {
  describe('Core API Endpoints', () => {
    it('should respond to ping endpoint', async () => {
      const res = await app.request('http://localhost:1337/-/ping')

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data).toBeDefined()
    })

    it('should respond to search endpoint with query parameter', async () => {
      const res = await app.request(
        'http://localhost:1337/-/search?text=lodash',
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(Array.isArray(data)).toBe(true)
    })

    it('should return 400 for search endpoint without text parameter', async () => {
      const res = await app.request('http://localhost:1337/-/search')

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain(
        'Missing required parameter "text"',
      )
    })

    it('should respond to whoami endpoint (requires auth)', async () => {
      const res = await app.request('http://localhost:1337/-/whoami')

      // Should return 401 without auth or 200 with valid auth
      expect([200, 401].includes(res.status)).toBe(true)
    })

    it('should respond to user profile endpoint (requires auth)', async () => {
      const res = await app.request('http://localhost:1337/-/user')

      // Should return 401 without auth or 200 with valid auth
      expect([200, 401].includes(res.status)).toBe(true)
    })
  })

  describe('Package API Endpoints', () => {
    it('should handle package packument requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash',
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.name).toBe('lodash')
      expect(data['dist-tags']).toBeDefined()
      expect(data.versions).toBeDefined()
    })

    it('should handle scoped package packument requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/@types/node',
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.name).toBe('@types/node')
      expect(data['dist-tags']).toBeDefined()
      expect(data.versions).toBeDefined()
    })

    it('should handle package version manifest requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash/4.17.21',
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.name).toBe('lodash')
      expect(data.version).toBe('4.17.21')
      expect(data.dist).toBeDefined()
    })

    it('should handle scoped package version manifest requests', async () => {
      // Get a real version first
      const packageRes = await app.request(
        'http://localhost:1337/npm/@types/node',
      )
      if (packageRes.status === 200) {
        const packageData = (await packageRes.json()) as any
        const latestVersion = packageData['dist-tags']?.latest

        if (latestVersion) {
          const versionRes = await app.request(
            `http://localhost:1337/npm/@types/node/${latestVersion}`,
          )
          if (versionRes.status === 200) {
            const versionData = (await versionRes.json()) as any
            expect(versionData.name).toBe('@types/node')
            expect(versionData.version).toBe(latestVersion)
            expect(versionData.dist).toBeDefined()
          }
        }
      }
    })

    it('should handle tarball requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash/-/lodash-4.17.21.tgz',
      )

      // Should return either the tarball (200) or not found (404)
      expect([200, 404, 502].includes(res.status)).toBe(true)

      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain(
          'application/octet-stream',
        )
      }
    })

    it('should handle scoped package tarball requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/@types/node/-/node-20.0.0.tgz',
      )

      // Should return either the tarball (200) or not found (404)
      expect([200, 404, 502].includes(res.status)).toBe(true)

      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain(
          'application/octet-stream',
        )
      }
    })
  })

  describe('Local Package Endpoints', () => {
    it('should handle local package requests with fallback to upstream', async () => {
      const res = await app.request(
        'http://localhost:1337/some-nonexistent-package',
      )

      // Should either redirect to upstream (302) or return package data (200)
      expect([200, 302, 404].includes(res.status)).toBe(true)

      if (res.status === 302) {
        const location = res.headers.get('location')
        expect(location).toContain('/npm/some-nonexistent-package')
      }
    })

    it('should handle local package version requests with fallback', async () => {
      const res = await app.request(
        'http://localhost:1337/some-nonexistent-package/1.0.0',
      )

      // Should either redirect to upstream (302) or return package data (200)
      expect([200, 302, 404].includes(res.status)).toBe(true)

      if (res.status === 302) {
        const location = res.headers.get('location')
        expect(location).toContain(
          '/npm/some-nonexistent-package/1.0.0',
        )
      }
    })
  })

  describe('Dist-tag Management', () => {
    it('should handle dist-tags requests', async () => {
      const res = await app.request(
        'http://localhost:1337/-/package/lodash/dist-tags',
      )

      // Will require valid package or return 404
      expect([200, 404].includes(res.status)).toBe(true)
    })

    it('should handle scoped package dist-tags requests', async () => {
      const res = await app.request(
        'http://localhost:1337/-/package/@types%2Fnode/dist-tags',
      )

      // Will require valid package or return 404
      expect([200, 404].includes(res.status)).toBe(true)
    })
  })

  describe('Authentication & Authorization', () => {
    it('should require authentication for token operations', async () => {
      const res = await app.request(
        'http://localhost:1337/-/tokens',
        { method: 'POST' },
      )

      // Should require authentication
      expect([400, 401].includes(res.status)).toBe(true)
    })

    it('should require authentication for package publishing', async () => {
      const res = await app.request(
        'http://localhost:1337/test-package',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'test-package',
            version: '1.0.0',
          }),
        },
      )

      // Should require authentication
      expect(res.status).toBe(401)
      const data = (await res.json()) as any
      expect(data.error).toContain('Authentication required')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const res = await app.request(
        'http://localhost:1337/non-existent-endpoint',
      )

      expect(res.status).toBe(404)
    })

    it('should return 400 for invalid upstream names', async () => {
      const res = await app.request(
        'http://localhost:1337/invalid-upstream/package',
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain(
        'Invalid or reserved upstream name',
      )
    })

    it('should return 404 for unknown upstreams', async () => {
      const res = await app.request(
        'http://localhost:1337/unknown-registry/package',
      )

      expect(res.status).toBe(404)
      const data = (await res.json()) as any
      expect(data.error).toContain('Unknown upstream')
    })
  })

  describe('Security Audit Endpoints', () => {
    it('should handle security audit requests', async () => {
      const res = await app.request(
        'http://localhost:1337/-/npm/v1/security/advisories/bulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data).toEqual({}) // Empty audit results
    })

    it('should handle upstream-specific audit requests', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/-/npm/v1/security/advisories/bulk',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data).toEqual({}) // Empty audit results
    })
  })

  describe('Legacy Route Redirects', () => {
    it('should redirect legacy search route', async () => {
      const res = await app.request(
        'http://localhost:1337/-/v1/search?text=lodash',
      )

      expect(res.status).toBe(308)
      const location = res.headers.get('location')
      expect(location).toBe('/-/search')
    })

    it('should redirect legacy user routes', async () => {
      const res = await app.request(
        'http://localhost:1337/-/npm/v1/user',
      )

      expect(res.status).toBe(308)
      const location = res.headers.get('location')
      expect(location).toBe('/-/user')
    })

    it('should redirect legacy token routes', async () => {
      const res = await app.request(
        'http://localhost:1337/-/npm/v1/tokens',
      )

      expect(res.status).toBe(308)
      const location = res.headers.get('location')
      expect(location).toBe('/-/tokens')
    })
  })

  describe('Content Type Headers', () => {
    it('should return correct content-type for JSON responses', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash',
      )

      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      }
    })

    it('should return correct content-type for search results', async () => {
      const res = await app.request(
        'http://localhost:1337/-/search?text=lodash',
      )

      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain(
        'application/json',
      )
    })
  })
})
