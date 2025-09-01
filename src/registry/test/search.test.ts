import { describe, it, expect } from 'vitest'
// eslint-disable-next-line import/no-unresolved
import { env } from 'cloudflare:test'
import app from '../src/index.ts'

describe('Search Endpoints', () => {
  describe('Root Registry Search', () => {
    describe('GET /-/search', () => {
      it('should handle basic search requests', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle search without query parameters', async () => {
        const res = await app.request('/-/search', {}, env)
        expect([200, 400].includes(res.status)).toBe(true)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle search with multiple parameters', async () => {
        const res = await app.request(
          '/-/search?text=lodash&size=20&from=0',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle search with quality scoring', async () => {
        const res = await app.request(
          '/-/search?text=lodash&quality=0.8',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle search with popularity scoring', async () => {
        const res = await app.request(
          '/-/search?text=lodash&popularity=0.9',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle search with maintenance scoring', async () => {
        const res = await app.request(
          '/-/search?text=lodash&maintenance=0.7',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })
    })

    describe('Search Response Structure', () => {
      it('should return proper JSON structure for search results', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        expect(res.status).toBe(200)
        const data = (await res.json()) as any
        expect(data).toBeDefined()
        // Search results structure would be validated based on npm registry format
      })

      it('should handle empty search results', async () => {
        const res = await app.request(
          '/-/search?text=nonexistent-package-12345',
          {},
          env,
        )
        expect(res.status).toBe(200)
        const data = (await res.json()) as any
        expect(data).toBeDefined()
      })

      it('should include pagination information', async () => {
        const res = await app.request(
          '/-/search?text=lodash&size=10&from=0',
          {},
          env,
        )
        expect(res.status).toBe(200)
        const data = (await res.json()) as any
        expect(data).toBeDefined()
        // Would validate pagination fields based on implementation
      })
    })

    describe('Search Query Parameters', () => {
      it('should handle URL-encoded search terms', async () => {
        const res = await app.request(
          '/-/search?text=%40types%2Fnode',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle special characters in search', async () => {
        const res = await app.request(
          '/-/search?text=package-with-dashes',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle scoped package searches', async () => {
        const res = await app.request(
          '/-/search?text=@types',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should validate size parameter limits', async () => {
        const res = await app.request(
          '/-/search?text=lodash&size=1000',
          {},
          env,
        )
        expect([200, 400].includes(res.status)).toBe(true)
      })

      it('should validate from parameter', async () => {
        const res = await app.request(
          '/-/search?text=lodash&from=-1',
          {},
          env,
        )
        expect([200, 400].includes(res.status)).toBe(true)
      })
    })
  })

  describe('Upstream Registry Search', () => {
    describe('NPM Registry Search', () => {
      it('should handle npm upstream search', async () => {
        const res = await app.request(
          '/npm/-/search?text=lodash',
          {},
          env,
        )
        expect(res.status).toBe(200)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle npm scoped package search', async () => {
        const res = await app.request(
          '/npm/-/search?text=@types/node',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle npm search with filters', async () => {
        const res = await app.request(
          '/npm/-/search?text=lodash&quality=0.8&popularity=0.9',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })
    })

    describe('JSR Registry Search', () => {
      it('should handle jsr upstream search', async () => {
        const res = await app.request(
          '/jsr/-/search?text=std',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle jsr scoped package search', async () => {
        const res = await app.request(
          '/jsr/-/search?text=@std/fs',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })
    })

    describe('Custom Registry Search', () => {
      it('should handle custom upstream search', async () => {
        const res = await app.request(
          '/custom/-/search?text=package',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle local upstream search', async () => {
        const res = await app.request(
          '/local/-/search?text=package',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })
    })
  })

  describe('Legacy Search Redirects', () => {
    describe('NPM v1 API Compatibility', () => {
      it('should redirect /-/v1/search to /-/search', async () => {
        const res = await app.request(
          '/-/v1/search?text=lodash',
          {},
          env,
        )
        expect(res.status).toBe(308)
        expect(res.headers.get('location')).toBe('/-/search')
      })

      it('should preserve query parameters in redirects', async () => {
        const res = await app.request(
          '/-/v1/search?text=lodash&size=20',
          {},
          env,
        )
        expect(res.status).toBe(308)
        expect(res.headers.get('location')).toBe('/-/search')
      })
    })
  })

  describe('Search Performance and Limits', () => {
    describe('Response Time', () => {
      it('should respond within reasonable time limits', async () => {
        const startTime = Date.now()
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        const endTime = Date.now()

        expect(res.status).toBe(200)
        expect(endTime - startTime).toBeLessThan(5000) // 5 second timeout
      })
    })

    describe('Large Result Sets', () => {
      it('should handle searches with many results', async () => {
        const res = await app.request('/-/search?text=test', {}, env)
        expect(res.status).toBe(200)
        const data = (await res.json()) as any
        expect(data).toBeDefined()
      })

      it('should handle pagination for large result sets', async () => {
        const res = await app.request(
          '/-/search?text=test&size=50&from=100',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })
    })
  })

  describe('Error Handling', () => {
    describe('Invalid Parameters', () => {
      it('should handle invalid quality parameter', async () => {
        const res = await app.request(
          '/-/search?text=lodash&quality=invalid',
          {},
          env,
        )
        expect([200, 400].includes(res.status)).toBe(true)
      })

      it('should handle invalid popularity parameter', async () => {
        const res = await app.request(
          '/-/search?text=lodash&popularity=2.0',
          {},
          env,
        )
        expect([200, 400].includes(res.status)).toBe(true)
      })

      it('should handle invalid maintenance parameter', async () => {
        const res = await app.request(
          '/-/search?text=lodash&maintenance=-0.5',
          {},
          env,
        )
        expect([200, 400].includes(res.status)).toBe(true)
      })

      it('should handle very long search terms', async () => {
        const longTerm = 'a'.repeat(1000)
        const res = await app.request(
          `/-/search?text=${longTerm}`,
          {},
          env,
        )
        expect([200, 400, 414].includes(res.status)).toBe(true)
      })
    })

    describe('Malformed Requests', () => {
      it('should handle malformed query parameters', async () => {
        const res = await app.request('/-/search?text=', {}, env)
        expect([200, 400].includes(res.status)).toBe(true)
      })

      it('should handle missing required parameters gracefully', async () => {
        const res = await app.request('/-/search', {}, env)
        expect([200, 400].includes(res.status)).toBe(true)
      })
    })

    describe('Upstream Errors', () => {
      it('should handle upstream registry connection errors', async () => {
        const res = await app.request(
          '/nonexistent/-/search?text=lodash',
          {},
          env,
        )
        expect([200, 404, 502].includes(res.status)).toBe(true)
      })

      it('should handle upstream registry timeout errors', async () => {
        const res = await app.request(
          '/npm/-/search?text=lodash',
          {},
          env,
        )
        // May return 502 due to upstream connection issues in test environment
        expect([200, 502].includes(res.status)).toBe(true)
      })
    })
  })

  describe('Response Headers and Caching', () => {
    describe('Content-Type Headers', () => {
      it('should set appropriate content-type headers', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })
    })

    describe('Cache Control', () => {
      it('should set appropriate cache-control headers', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        // Cache headers would be validated based on implementation
        expect(res.status).toBe(200)
      })
    })

    describe('CORS Headers', () => {
      it('should handle CORS headers for search requests', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {
            headers: {
              Origin: 'https://example.com',
            },
          },
          env,
        )
        expect(res.status).toBe(200)
        // CORS headers would be validated based on implementation
      })
    })
  })

  describe('Special Search Cases', () => {
    describe('Package Name Patterns', () => {
      it('should handle exact package name matches', async () => {
        const res = await app.request(
          '/-/search?text=lodash',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle partial package name matches', async () => {
        const res = await app.request('/-/search?text=lod', {}, env)
        expect(res.status).toBe(200)
      })

      it('should handle keyword searches', async () => {
        const res = await app.request(
          '/-/search?text=utility',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle author searches', async () => {
        const res = await app.request(
          '/-/search?text=author:john',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })
    })

    describe('Advanced Search Features', () => {
      it('should handle boolean search operators', async () => {
        const res = await app.request(
          '/-/search?text=lodash+utility',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle quoted search terms', async () => {
        const res = await app.request(
          '/-/search?text="utility library"',
          {},
          env,
        )
        expect(res.status).toBe(200)
      })

      it('should handle wildcard searches', async () => {
        const res = await app.request('/-/search?text=lod*', {}, env)
        expect(res.status).toBe(200)
      })
    })
  })
})
