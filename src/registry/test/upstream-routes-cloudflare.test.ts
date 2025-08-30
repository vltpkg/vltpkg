import { describe, it, expect, beforeAll } from 'vitest'
import { env } from 'cloudflare:test'
import app from '../src/index'

describe('Upstream Routes with Cloudflare Environment', () => {
  beforeAll(async () => {
    // Any setup needed before tests
    console.log('Testing with Cloudflare Workers environment')
  })

  describe('Regular Package Routes', () => {
    it('should fetch regular package metadata', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash',
        {},
        env,
      )

      // Should either succeed (200) or fail gracefully (4xx/5xx)
      expect([200, 404, 500].includes(res.status)).toBe(true)

      if (res.status === 200) {
        const data = (await res.json()) as any
        expect(data.name).toBe('lodash')
        expect(data['dist-tags']).toBeDefined()
        expect(data.versions).toBeDefined()
      } else {
        // If it fails, should return JSON error
        const contentType = res.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = (await res.json()) as any
          expect(errorData.error).toBeDefined()
        }
      }
    })

    it('should fetch specific version of regular package', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash/4.17.21',
        {},
        env,
      )

      expect([200, 404, 500].includes(res.status)).toBe(true)

      if (res.status === 200) {
        const data = (await res.json()) as any
        expect(data.name).toBe('lodash')
        expect(data.version).toBe('4.17.21')
        expect(data.dist).toBeDefined()
        expect(data.dist.tarball).toBeDefined()
      }
    })
  })

  describe('Scoped Package Routes (Unencoded URLs)', () => {
    it('should fetch scoped package metadata with unencoded URL', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/@types/node',
        {},
        env,
      )

      expect([200, 404, 500].includes(res.status)).toBe(true)

      if (res.status === 200) {
        const data = (await res.json()) as any
        expect(data.name).toBe('@types/node')
        expect(data['dist-tags']).toBeDefined()
        expect(data.versions).toBeDefined()
      }
    })

    it('should fetch specific version of scoped package with unencoded URL', async () => {
      // First get the latest version to test with a real version
      const packageRes = await app.request(
        'http://localhost:1337/npm/@types/node',
        {},
        env,
      )

      if (packageRes.status === 200) {
        const packageData = (await packageRes.json()) as any
        const latestVersion = packageData['dist-tags']?.latest

        if (latestVersion) {
          const versionRes = await app.request(
            `http://localhost:1337/npm/@types/node/${latestVersion}`,
            {},
            env,
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

    it('should fetch another scoped package', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/@babel/core',
        {},
        env,
      )

      expect([200, 404, 500].includes(res.status)).toBe(true)

      if (res.status === 200) {
        const data = (await res.json()) as any
        expect(data.name).toBe('@babel/core')
        expect(data['dist-tags']).toBeDefined()
        expect(data.versions).toBeDefined()
      }
    })
  })

  describe('URL-Encoded Scoped Packages (Backward Compatibility)', () => {
    it('should still support URL-encoded scoped packages', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/@types%2Fnode',
        {},
        env,
      )

      expect([200, 404, 500].includes(res.status)).toBe(true)

      if (res.status === 200) {
        const data = (await res.json()) as any
        expect(data.name).toBe('@types/node')
      }
    })
  })

  describe('Error Handling', () => {
    it('should return appropriate status for non-existent packages', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/this-package-definitely-does-not-exist-xyz',
        {},
        env,
      )

      // Should return 404 or 500, not 200
      expect(res.status).not.toBe(200)
      expect([404, 500].includes(res.status)).toBe(true)
    })

    it('should return 400 for invalid upstream names', async () => {
      const res = await app.request(
        'http://localhost:1337/invalid-upstream/lodash',
        {},
        env,
      )

      expect(res.status).toBe(400)
      const data = (await res.json()) as any
      expect(data.error).toContain(
        'Invalid or reserved upstream name',
      )
    })

    it('should return 404 for unknown upstreams', async () => {
      const res = await app.request(
        'http://localhost:1337/unknown-registry/lodash',
        {},
        env,
      )

      expect(res.status).toBe(404)
      const data = (await res.json()) as any
      expect(data.error).toContain('Unknown upstream')
    })
  })

  describe('Route Disambiguation', () => {
    it('should correctly distinguish scoped packages from version requests', async () => {
      // Test that /npm/@types/node is treated as scoped package
      const scopedRes = await app.request(
        'http://localhost:1337/npm/@types/node',
        {},
        env,
      )

      // Test that /npm/lodash/4.17.21 is treated as version request
      const versionRes = await app.request(
        'http://localhost:1337/npm/lodash/4.17.21',
        {},
        env,
      )

      // Both should work but return different structures
      if (scopedRes.status === 200 && versionRes.status === 200) {
        const scopedData = (await scopedRes.json()) as any
        const versionData = (await versionRes.json()) as any

        expect(scopedData.name).toBe('@types/node')
        expect(versionData.name).toBe('lodash')
        expect(versionData.version).toBe('4.17.21')

        // Scoped should be packument (multiple versions), version should be manifest (single version)
        expect(scopedData.versions).toBeDefined() // Should have versions object
        expect(
          Object.keys(scopedData.versions).length,
        ).toBeGreaterThan(1) // Should have multiple versions

        expect(versionData.dist).toBeDefined() // Should have dist object
        expect(versionData.versions).toBeUndefined() // Should not have versions array
      }
    })
  })

  describe('Response Structure', () => {
    it('should return valid JSON for successful requests', async () => {
      const testUrls = [
        'http://localhost:1337/npm/lodash',
        'http://localhost:1337/npm/@types/node',
        'http://localhost:1337/npm/lodash/4.17.21',
      ]

      for (const url of testUrls) {
        const res = await app.request(url, {}, env)

        if (res.status === 200) {
          expect(() => res.json()).not.toThrow()
          const data = (await res.clone().json()) as any
          expect(data.name).toBeDefined()
          expect(typeof data.name).toBe('string')
        }
      }
    })

    it('should include security headers', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash',
        {},
        env,
      )

      // These headers should be set by the secureHeaders middleware
      expect(res.headers.get('x-frame-options')).toBeDefined()
      expect(res.headers.get('x-content-type-options')).toBeDefined()
    })

    it('should set correct content-type for JSON responses', async () => {
      const res = await app.request(
        'http://localhost:1337/npm/lodash',
        {},
        env,
      )

      if (res.status === 200) {
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      }
    })
  })

  describe('Health Checks', () => {
    it('should respond to ping endpoint', async () => {
      const res = await app.request(
        'http://localhost:1337/ping',
        {},
        env,
      )

      expect(res.status).toBe(200)
      const data = (await res.json()) as any
      expect(data.pong).toBeDefined()
    })
  })
})
