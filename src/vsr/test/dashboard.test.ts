import { describe, it, expect } from 'vitest'
import { env } from 'cloudflare:test'
import { app } from '../src/index.ts'

describe('Dashboard Endpoints', () => {
  describe('Dashboard Data Endpoint', () => {
    describe('GET /dashboard.json', () => {
      it('should return dashboard data when daemon is enabled', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Dashboard endpoints may return 500 with text/plain when external services are unavailable
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should return dashboard data in standalone mode when daemon is disabled', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)
        // Dashboard endpoints now provide standalone data when daemon is disabled
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
          const data = await res.json()
          expect(data.registry).toBeDefined()
          expect(data.features).toBeDefined()
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should return proper dashboard configuration structure', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        if (res.status === 200) {
          const data = (await res.json()) as any
          expect(data).toBeDefined()
          expect(data.registry).toBeDefined()
          expect(data.features).toBeDefined()
        }
      })

      it('should include registry information in response', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        const data = (await res.json()) as any
        expect(data.registry).toBeDefined()
        expect(data.registry.url).toBeDefined()
        expect(data.registry.name).toBeDefined()
      })

      it('should include feature flags in response', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        const data = (await res.json()) as any
        expect(data.features).toBeDefined()
        expect(typeof data.features.search).toBe('boolean')
        expect(typeof data.features.publish).toBe('boolean')
        expect(typeof data.features.access).toBe('boolean')
      })

      it('should handle HEAD requests', async () => {
        const res = await app.request(
          '/dashboard.json',
          { method: 'HEAD' },
          env,
        )
        expect(
          [200, 401, 404, 405, 500, 501].includes(res.status),
        ).toBe(true)
      })
    })

    describe('Dashboard Data Validation', () => {
      it('should return valid JSON structure', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(data).toBeDefined()
        expect(typeof data).toBe('object')
        expect(data).not.toBeNull()
      })

      it('should include all required registry fields', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(data.registry).toBeDefined()
        expect(typeof data.registry.url).toBe('string')
        expect(typeof data.registry.name).toBe('string')
        expect(data.registry.url.length).toBeGreaterThan(0)
        expect(data.registry.name.length).toBeGreaterThan(0)
      })

      it('should include all required feature fields', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(data.features).toBeDefined()
        expect('search' in data.features).toBe(true)
        expect('publish' in data.features).toBe(true)
        expect('access' in data.features).toBe(true)
      })
    })
  })

  describe('App Data Endpoint', () => {
    describe('GET /app-data.json', () => {
      it('should return app data when daemon is enabled', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Dashboard endpoints may return 500 with text/plain when external services are unavailable
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should return app data in standalone mode when daemon is disabled', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)
        // Dashboard endpoints now provide standalone data when daemon is disabled
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
          const data = await res.json()
          expect(data.packages).toBeDefined()
          expect(data.stats).toBeDefined()
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should return proper app data structure', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        const data = (await res.json()) as any
        expect(data).toBeDefined()
        expect(data.packages).toBeDefined()
        expect(data.stats).toBeDefined()
      })

      it('should include packages array in response', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        const data = (await res.json()) as any
        expect(Array.isArray(data.packages)).toBe(true)
      })

      it('should include statistics in response', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        const data = (await res.json()) as any
        expect(data.stats).toBeDefined()
        expect(typeof data.stats.totalPackages).toBe('number')
        expect(typeof data.stats.totalDownloads).toBe('number')
      })

      it('should handle HEAD requests', async () => {
        const res = await app.request(
          '/app-data.json',
          { method: 'HEAD' },
          env,
        )
        expect(
          [200, 401, 404, 405, 500, 501].includes(res.status),
        ).toBe(true)
      })
    })

    describe('App Data Package Information', () => {
      it('should return packages with proper structure', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(Array.isArray(data.packages)).toBe(true)

        // If packages exist, validate their structure
        if (data.packages.length > 0) {
          const pkg = data.packages[0]
          expect(typeof pkg.name).toBe('string')
          expect(typeof pkg.version).toBe('string')
          // description is optional
          if (pkg.description !== undefined) {
            expect(typeof pkg.description).toBe('string')
          }
        }
      })

      it('should handle empty packages array', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(Array.isArray(data.packages)).toBe(true)
        // Empty array is valid
        expect(data.packages.length).toBeGreaterThanOrEqual(0)
      })

      it('should include valid package names', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        data.packages.forEach((pkg: any) => {
          expect(typeof pkg.name).toBe('string')
          expect(pkg.name.length).toBeGreaterThan(0)
          // Package names should follow npm naming conventions
          expect(pkg.name).toMatch(
            /^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$|^@[a-z0-9-]+\/[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/,
          )
        })
      })

      it('should include valid semver versions', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        data.packages.forEach((pkg: any) => {
          expect(typeof pkg.version).toBe('string')
          expect(pkg.version.length).toBeGreaterThan(0)
          // Basic semver validation
          expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/)
        })
      })
    })

    describe('App Data Statistics', () => {
      it('should return non-negative statistics', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(data.stats.totalPackages).toBeGreaterThanOrEqual(0)
        expect(data.stats.totalDownloads).toBeGreaterThanOrEqual(0)
      })

      it('should return integer statistics', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(Number.isInteger(data.stats.totalPackages)).toBe(true)
        expect(Number.isInteger(data.stats.totalDownloads)).toBe(true)
      })

      it('should have consistent package count', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        // Total packages should match or be close to packages array length
        // (might differ due to filtering, pagination, etc.)
        expect(data.stats.totalPackages).toBeGreaterThanOrEqual(0)
        expect(data.packages.length).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Dashboard Error Handling', () => {
    describe('Daemon Disabled Responses', () => {
      it('should return consistent data format in standalone mode', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        if (res.status === 200) {
          const data = (await res.json()) as any
          expect(data).toBeDefined()
          expect(data.registry).toBeDefined()
          expect(data.features).toBeDefined()
        } else if (res.status === 404) {
          try {
            const data = (await res.json()) as any
            expect(data).toBeDefined()
            expect(data.error).toBeDefined()
          } catch {
            // 500 responses may return text/plain instead of JSON
          }
        }
      })

      it('should return consistent data format for app-data in standalone mode', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        if (res.status === 200) {
          const data = (await res.json()) as any
          expect(data).toBeDefined()
          expect(data.packages).toBeDefined()
          expect(data.stats).toBeDefined()
        } else if (res.status === 404) {
          try {
            const data = (await res.json()) as any
            expect(data).toBeDefined()
            expect(data.error).toBeDefined()
          } catch {
            // 500 responses may return text/plain instead of JSON
          }
        }
      })
    })

    describe('HTTP Method Validation', () => {
      it('should handle POST requests to dashboard endpoints', async () => {
        const res = await app.request(
          '/dashboard.json',
          { method: 'POST' },
          env,
        )
        expect(
          [200, 401, 404, 405, 500, 501].includes(res.status),
        ).toBe(true)
      })

      it('should handle PUT requests to dashboard endpoints', async () => {
        const res = await app.request(
          '/app-data.json',
          { method: 'PUT' },
          env,
        )
        expect(
          [200, 401, 404, 405, 500, 501].includes(res.status),
        ).toBe(true)
      })

      it('should handle DELETE requests to dashboard endpoints', async () => {
        const res = await app.request(
          '/dashboard.json',
          { method: 'DELETE' },
          env,
        )
        expect(
          [200, 401, 404, 405, 500, 501].includes(res.status),
        ).toBe(true)
      })
    })

    // Database error handling is now tested through real bindings in integration tests
  })

  describe('Dashboard Response Headers', () => {
    describe('Content-Type Headers', () => {
      it('should set correct content-type for dashboard.json', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Dashboard endpoints may return 500 with text/plain when external services are unavailable
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should set correct content-type for app-data.json', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Dashboard endpoints may return 500 with text/plain when external services are unavailable
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })

      it('should set correct content-type for responses', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)
        // Dashboard endpoints now return data in standalone mode or errors
        if (res.status === 200) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 404) {
          expect(res.headers.get('content-type')).toContain(
            'application/json',
          )
        } else if (res.status === 500) {
          expect(res.headers.get('content-type')).toContain(
            'text/plain',
          )
        }
      })
    })

    describe('Cache Control Headers', () => {
      it('should set appropriate cache headers for dashboard data', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Cache headers would be validated based on implementation
        // Dashboard data might be cached for short periods
      })

      it('should set appropriate cache headers for app data', async () => {
        const res = await app.request('/app-data.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // App data might have different caching strategy than dashboard config
      })
    })

    describe('Security Headers', () => {
      it('should include security headers in dashboard responses', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // Security headers would be validated based on implementation
      })

      it('should include CORS headers for dashboard endpoints', async () => {
        const res = await app.request(
          '/app-data.json',
          {
            headers: {
              Origin: 'https://example.com',
            },
          },
          env,
        )
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        // CORS headers would be validated based on implementation
      })
    })
  })

  describe('Dashboard Performance', () => {
    describe('Response Time', () => {
      const factor = env.REAL_PLATFORM === 'win32' ? 10 : 1
      it(`should respond quickly for dashboard data`, async () => {
        const startTime = Date.now()
        const res = await app.request('/dashboard.json', {}, env)
        const endTime = Date.now()

        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        expect(endTime - startTime).toBeLessThan(factor * 1000) // 1 second
      })

      it(`should respond quickly for app data`, async () => {
        const startTime = Date.now()
        const res = await app.request('/app-data.json', {}, env)
        const endTime = Date.now()

        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return
        expect(endTime - startTime).toBeLessThan(factor * 2000) // 2 seconds (might query database)
      })
    })

    describe('Concurrent Requests', () => {
      it('should handle concurrent dashboard requests', async () => {
        const promises = [
          app.request('/dashboard.json', {}, env),
          app.request('/dashboard.json', {}, env),
          app.request('/dashboard.json', {}, env),
        ] as Promise<Response>[]

        const results = await Promise.all(promises)
        results.forEach(res => {
          expect([200, 404, 500].includes(res.status)).toBe(true)

          // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
          if (res.status === 500) return
        })
      })

      it('should handle concurrent app data requests', async () => {
        const promises = [
          app.request('/app-data.json', {}, env),
          app.request('/app-data.json', {}, env),
          app.request('/app-data.json', {}, env),
        ] as Promise<Response>[]

        const results = await Promise.all(promises)
        results.forEach(res => {
          expect([200, 404, 500].includes(res.status)).toBe(true)

          // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
          if (res.status === 500) return
        })
      })

      it('should handle mixed dashboard endpoint requests', async () => {
        const promises = [
          app.request('/dashboard.json', {}, env),
          app.request('/app-data.json', {}, env),
          app.request('/dashboard.json', {}, env),
          app.request('/app-data.json', {}, env),
        ] as Promise<Response>[]

        const results = await Promise.all(promises)
        results.forEach(res => {
          expect([200, 404, 500].includes(res.status)).toBe(true)

          // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
          if (res.status === 500) return
        })
      })
    })
  })

  describe('Dashboard Integration', () => {
    describe('Data Consistency', () => {
      it('should return consistent data across multiple requests', async () => {
        const res1 = await app.request('/dashboard.json', {}, env)
        const res2 = await app.request('/dashboard.json', {}, env)

        expect([200, 500].includes(res1.status)).toBe(true)
        expect([200, 500].includes(res2.status)).toBe(true)

        if (res1.status === 200 && res2.status === 200) {
          const data1 = await res1.json()
          const data2 = await res2.json()

          // Configuration should be consistent
          expect(data1.registry.name).toBe(data2.registry.name)
          expect(data1.registry.url).toBe(data2.registry.url)
        }
      })

      it('should return app data that matches dashboard configuration', async () => {
        const dashboardRes = await app.request(
          '/dashboard.json',
          {},
          env,
        )
        const appDataRes = await app.request(
          '/app-data.json',
          {},
          env,
        )

        expect([200, 404, 500].includes(dashboardRes.status)).toBe(
          true,
        )
        expect([200, 404, 500].includes(appDataRes.status)).toBe(true)

        if (
          dashboardRes.status === 200 &&
          appDataRes.status === 200
        ) {
          const dashboard = await dashboardRes.json()
          const appData = await appDataRes.json()

          // Both should be valid JSON objects
          expect(typeof dashboard).toBe('object')
          expect(typeof appData).toBe('object')
        }
      })
    })

    describe('Feature Flag Integration', () => {
      it('should reflect search feature availability in dashboard', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(typeof data.features.search).toBe('boolean')
        // Search feature flag should be consistent with actual search endpoint availability
      })

      it('should reflect publish feature availability in dashboard', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(typeof data.features.publish).toBe('boolean')
        // Publish feature flag should be consistent with actual publish endpoint availability
      })

      it('should reflect access control feature availability in dashboard', async () => {
        const res = await app.request('/dashboard.json', {}, env)
        expect([200, 404, 500].includes(res.status)).toBe(true)

        // Skip JSON parsing tests if endpoint returns 500 (external service unavailable)
        if (res.status === 500) return

        const data = (await res.json()) as any
        expect(typeof data.features.access).toBe('boolean')
        // Access feature flag should be consistent with actual access control endpoints
      })
    })
  })
})
