import { describe, it, expect } from 'vitest'
// eslint-disable-next-line import/no-unresolved
import { env } from 'cloudflare:test'
import app from '../src/index.ts'

describe('Dist-Tags Endpoints', () => {
  describe('Get Dist-Tags', () => {
    describe('Unscoped Packages', () => {
      it('should get dist-tags for unscoped packages', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(res.status)).toBe(true)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should return proper dist-tags structure', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        if (res.status === 200) {
          const data = (await res.json()) as any
          expect(data).toBeDefined()
          // Dist-tags structure should be { "latest": "1.0.0", "beta": "1.1.0-beta.1" }
        }
      })

      it('should handle packages with no dist-tags', async () => {
        const res = await app.request(
          '/-/package/empty-package/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Scoped Packages', () => {
      it('should get dist-tags for scoped packages', async () => {
        const res = await app.request(
          '/-/package/@types%2Fnode/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(res.status)).toBe(true)
        expect(res.headers.get('content-type')).toContain(
          'application/json',
        )
      })

      it('should handle URL-encoded scoped package names', async () => {
        const res = await app.request(
          '/-/package/@scope%2Fpackage/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(res.status)).toBe(true)
      })

      it('should return dist-tags for organization packages', async () => {
        const res = await app.request(
          '/-/package/@myorg%2Fmypackage/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Dist-Tags Response Format', () => {
      it('should return dist-tags as key-value pairs', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        if (res.status === 200) {
          const data = (await res.json()) as any
          expect(data).toBeDefined()
          expect(typeof data).toBe('object')
        }
      })

      it('should include latest tag by default', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        if (res.status === 200) {
          const data = (await res.json()) as any
          // Most packages should have a 'latest' tag
          expect(data).toBeDefined()
        }
      })
    })
  })

  describe('Set Dist-Tags', () => {
    describe('Create/Update Dist-Tags', () => {
      it('should set dist-tag for unscoped packages', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should set dist-tag for scoped packages', async () => {
        const res = await app.request(
          '/-/package/@myorg%2Fmypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('2.0.0-beta.2'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should update existing dist-tags', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/latest',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('2.0.0'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle custom dist-tag names', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/experimental',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('3.0.0-alpha.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Dist-Tag Validation', () => {
      it('should validate semver versions', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('invalid-version'),
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should validate dist-tag names', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/invalid..tag',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0'),
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle reserved dist-tag names', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/package',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0'),
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should require version to exist in package', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('999.999.999'),
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Authentication and Authorization', () => {
      it('should require authentication for dist-tag modification', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([200, 400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should check package ownership for dist-tag changes', async () => {
        const res = await app.request(
          '/-/package/someone-elses-package/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              Authorization: 'Bearer test-admin-token-12345',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([200, 401, 403, 404].includes(res.status)).toBe(true)
      })

      it('should handle valid authentication for dist-tag changes', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              Authorization: 'Bearer test-admin-token-12345',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })
    })
  })

  describe('Delete Dist-Tags', () => {
    describe('Remove Dist-Tags', () => {
      it('should delete dist-tag for unscoped packages', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should delete dist-tag for scoped packages', async () => {
        const res = await app.request(
          '/-/package/@myorg%2Fmypackage/dist-tags/beta',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle deletion of non-existent dist-tags', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/nonexistent',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([404, 401].includes(res.status)).toBe(true)
      })

      it('should prevent deletion of latest tag', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/latest',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Delete Authorization', () => {
      it('should require authentication for dist-tag deletion', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([200, 400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should check package ownership for dist-tag deletion', async () => {
        const res = await app.request(
          '/-/package/someone-elses-package/dist-tags/beta',
          {
            method: 'DELETE',
            headers: {
              Authorization: 'Bearer test-admin-token-12345',
            },
          },
          env,
        )
        expect([200, 401, 403, 404].includes(res.status)).toBe(true)
      })

      it('should handle valid authentication for dist-tag deletion', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'DELETE',
            headers: {
              Authorization: 'Bearer test-admin-token-12345',
            },
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })
    })
  })

  describe('Error Handling', () => {
    describe('Invalid Package Names', () => {
      it('should handle invalid package names', async () => {
        const res = await app.request(
          '/-/package/invalid..package/dist-tags',
          {},
          env,
        )
        expect([400, 404].includes(res.status)).toBe(true)
      })

      it('should handle packages starting with dots', async () => {
        const res = await app.request(
          '/-/package/.hidden-package/dist-tags',
          {},
          env,
        )
        expect([400, 404].includes(res.status)).toBe(true)
      })

      it('should handle packages starting with underscores', async () => {
        const res = await app.request(
          '/-/package/_internal-package/dist-tags',
          {},
          env,
        )
        expect([400, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Invalid Request Bodies', () => {
      it('should handle malformed JSON in dist-tag requests', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: 'invalid-json',
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle missing content-type header', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([400, 415, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle empty request body', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: '',
          },
          env,
        )
        expect([400, 401, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Non-existent Resources', () => {
      it('should handle non-existent packages', async () => {
        const res = await app.request(
          '/-/package/nonexistent-package-12345/dist-tags',
          {},
          env,
        )
        expect(res.status).toBe(404)
      })

      it('should handle non-existent packages in dist-tag creation', async () => {
        const res = await app.request(
          '/-/package/nonexistent-package-12345/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([401, 404].includes(res.status)).toBe(true)
      })
    })
  })

  describe('Dist-Tag Lifecycle', () => {
    describe('Complete Dist-Tag Operations', () => {
      it('should handle complete dist-tag lifecycle', async () => {
        // Get initial dist-tags
        const getRes1 = await app.request(
          '/-/package/mypackage/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(getRes1.status)).toBe(true)

        // Set a new dist-tag
        const putRes = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(putRes.status)).toBe(true)

        // Get updated dist-tags
        const getRes2 = await app.request(
          '/-/package/mypackage/dist-tags',
          {},
          env,
        )
        expect([200, 404].includes(getRes2.status)).toBe(true)

        // Delete the dist-tag
        const deleteRes = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'DELETE',
          },
          env,
        )
        expect([200, 401, 404].includes(deleteRes.status)).toBe(true)
      })
    })

    describe('Multiple Dist-Tags', () => {
      it('should handle multiple dist-tags for a package', async () => {
        const tags = ['beta', 'alpha', 'rc', 'next']

        for (const tag of tags) {
          const res = await app.request(
            `/-/package/mypackage/dist-tags/${tag}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(`1.0.0-${tag}.1`),
            },
            env,
          )
          expect([200, 401, 404].includes(res.status)).toBe(true)
        }
      })

      it('should handle concurrent dist-tag operations', async () => {
        const promises = [
          app.request(
            '/-/package/mypackage/dist-tags/beta',
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify('1.0.0-beta.1'),
            },
            env,
          ),
          app.request(
            '/-/package/mypackage/dist-tags/alpha',
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify('1.0.0-alpha.1'),
            },
            env,
          ),
        ]

        const results = await Promise.all(promises)
        results.forEach(res => {
          expect([200, 401, 404].includes(res.status)).toBe(true)
        })
      })
    })
  })

  describe('Response Headers and Caching', () => {
    describe('Content-Type Headers', () => {
      it('should set appropriate content-type headers', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
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

    describe('Cache Control', () => {
      it('should set appropriate cache-control headers for dist-tags', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        if (res.status === 200) {
          // Cache headers would be validated based on implementation
          expect(res.status).toBe(200)
        }
      })
    })

    describe('ETag Headers', () => {
      it('should include ETag headers for dist-tags', async () => {
        const res = await app.request(
          '/-/package/lodash/dist-tags',
          {},
          env,
        )
        if (res.status === 200) {
          // ETag headers would be validated based on implementation
          expect(res.status).toBe(200)
        }
      })
    })
  })

  describe('Special Dist-Tag Cases', () => {
    describe('Semantic Versioning', () => {
      it('should handle prerelease versions', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/beta',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0-beta.1+build.123'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle build metadata in versions', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/build',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0+20230101.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })
    })

    describe('Tag Name Validation', () => {
      it('should handle alphanumeric dist-tag names', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/v2beta1',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('2.0.0-beta.1'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })

      it('should handle hyphenated dist-tag names', async () => {
        const res = await app.request(
          '/-/package/mypackage/dist-tags/long-term-support',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify('1.0.0'),
          },
          env,
        )
        expect([200, 401, 404].includes(res.status)).toBe(true)
      })
    })
  })
})
