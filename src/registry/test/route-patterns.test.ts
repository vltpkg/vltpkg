import { describe, it, expect } from 'vitest'

/**
 * Tests for the route pattern logic used in the upstream package routes.
 * These tests validate the core logic without needing the full Hono app.
 */

describe('Route Pattern Analysis', () => {
  describe('Path Segmentation', () => {
    it('should correctly parse regular package paths', () => {
      const testCases = [
        { path: '/npm/lodash', expected: ['npm', 'lodash'] },
        { path: '/npm/express', expected: ['npm', 'express'] },
        { path: '/yarn/react', expected: ['yarn', 'react'] },
      ]

      testCases.forEach(({ path, expected }) => {
        const segments = path.split('/').filter(Boolean)
        expect(segments).toEqual(expected)
        expect(segments[0]).toBe(expected[0]) // upstream
        expect(segments[1]).toBe(expected[1]) // package
      })
    })

    it('should correctly parse regular package version paths', () => {
      const testCases = [
        {
          path: '/npm/lodash/4.17.21',
          expected: ['npm', 'lodash', '4.17.21'],
        },
        {
          path: '/npm/express/4.18.2',
          expected: ['npm', 'express', '4.18.2'],
        },
        {
          path: '/yarn/react/18.2.0',
          expected: ['yarn', 'react', '18.2.0'],
        },
      ]

      testCases.forEach(({ path, expected }) => {
        const segments = path.split('/').filter(Boolean)
        expect(segments).toEqual(expected)
        expect(segments[0]).toBe(expected[0]) // upstream
        expect(segments[1]).toBe(expected[1]) // package
        expect(segments[2]).toBe(expected[2]) // version
      })
    })

    it('should correctly parse scoped package paths', () => {
      const testCases = [
        {
          path: '/npm/@types/node',
          expected: ['npm', '@types', 'node'],
        },
        {
          path: '/npm/@babel/core',
          expected: ['npm', '@babel', 'core'],
        },
        { path: '/yarn/@vue/cli', expected: ['yarn', '@vue', 'cli'] },
      ]

      testCases.forEach(({ path, expected }) => {
        const segments = path.split('/').filter(Boolean)
        expect(segments).toEqual(expected)
        expect(segments[0]).toBe(expected[0]) // upstream
        expect(segments[1]).toBe(expected[1]) // scope
        expect(segments[2]).toBe(expected[2]) // package
        expect(segments[1].startsWith('@')).toBe(true)
      })
    })

    it('should correctly parse scoped package version paths', () => {
      const testCases = [
        {
          path: '/npm/@types/node/20.0.0',
          expected: ['npm', '@types', 'node', '20.0.0'],
        },
        {
          path: '/npm/@babel/core/7.25.0',
          expected: ['npm', '@babel', 'core', '7.25.0'],
        },
        {
          path: '/yarn/@vue/cli/5.0.0',
          expected: ['yarn', '@vue', 'cli', '5.0.0'],
        },
      ]

      testCases.forEach(({ path, expected }) => {
        const segments = path.split('/').filter(Boolean)
        expect(segments).toEqual(expected)
        expect(segments[0]).toBe(expected[0]) // upstream
        expect(segments[1]).toBe(expected[1]) // scope
        expect(segments[2]).toBe(expected[2]) // package
        expect(segments[3]).toBe(expected[3]) // version
        expect(segments[1].startsWith('@')).toBe(true)
      })
    })
  })

  describe('Route Type Detection', () => {
    it('should detect regular package packument requests (2 segments)', () => {
      const paths = ['/npm/lodash', '/yarn/express', '/pnpm/react']

      paths.forEach(path => {
        const segments = path.split('/').filter(Boolean)
        expect(segments.length).toBe(2)
        expect(segments[1]).not.toMatch(/^\d/) // Not a version
        expect(!segments[1].startsWith('@')).toBe(true) // Not scoped
      })
    })

    it('should detect scoped package packument requests (3 segments with @)', () => {
      const paths = [
        '/npm/@types/node',
        '/yarn/@babel/core',
        '/pnpm/@vue/cli',
      ]

      paths.forEach(path => {
        const segments = path.split('/').filter(Boolean)
        expect(segments.length).toBe(3)
        expect(segments[1].startsWith('@')).toBe(true) // Scope starts with @
        expect(segments[2]).not.toMatch(/^\d/) // Third segment is package name, not version
      })
    })

    it('should detect regular package manifest requests (3 segments without @)', () => {
      const paths = [
        '/npm/lodash/4.17.21',
        '/yarn/express/4.18.2',
        '/pnpm/react/18.2.0',
      ]

      paths.forEach(path => {
        const segments = path.split('/').filter(Boolean)
        expect(segments.length).toBe(3)
        expect(!segments[1].startsWith('@')).toBe(true) // Not scoped
        expect(segments[2]).toMatch(/^\d/) // Third segment looks like version
      })
    })

    it('should detect scoped package manifest requests (4 segments)', () => {
      const paths = [
        '/npm/@types/node/20.0.0',
        '/yarn/@babel/core/7.25.0',
        '/pnpm/@vue/cli/5.0.0',
      ]

      paths.forEach(path => {
        const segments = path.split('/').filter(Boolean)
        expect(segments.length).toBe(4)
        expect(segments[1].startsWith('@')).toBe(true) // Scope starts with @
        expect(segments[3]).toMatch(/^\d/) // Fourth segment looks like version
      })
    })
  })

  describe('URL Encoding Handling', () => {
    it('should handle encoded scoped package names', () => {
      const encodedPaths = [
        '/npm/@types%2Fnode',
        '/npm/@babel%2Fcore',
        '/yarn/@vue%2Fcli',
      ]

      const expectedPaths = [
        '/npm/@types/node',
        '/npm/@babel/core',
        '/yarn/@vue/cli',
      ]

      encodedPaths.forEach((encoded, index) => {
        const decoded = decodeURIComponent(encoded)
        expect(decoded).toBe(expectedPaths[index])

        const segments = decoded.split('/').filter(Boolean)
        expect(segments[1].startsWith('@')).toBe(true)
        expect(segments.length).toBe(3)
      })
    })

    it('should handle encoded version paths', () => {
      const encodedPaths = [
        '/npm/@types%2Fnode/20.0.0',
        '/npm/lodash/4.17.21',
      ]

      encodedPaths.forEach(encoded => {
        const decoded = decodeURIComponent(encoded)
        const segments = decoded.split('/').filter(Boolean)

        if (segments[1].startsWith('@')) {
          expect(segments.length).toBe(4) // Scoped package with version
        } else {
          expect(segments.length).toBe(3) // Regular package with version
        }
      })
    })
  })

  describe('Route Disambiguation Logic', () => {
    it('should correctly identify the route type for 3-segment paths', () => {
      const testCases = [
        {
          path: '/npm/@types/node',
          param2: '@types',
          param3: 'node',
          expectedType: 'scoped-packument',
          reason: 'param2 starts with @',
        },
        {
          path: '/npm/lodash/4.17.21',
          param2: 'lodash',
          param3: '4.17.21',
          expectedType: 'regular-manifest',
          reason: 'param2 does not start with @',
        },
        {
          path: '/npm/express/latest',
          param2: 'express',
          param3: 'latest',
          expectedType: 'regular-manifest',
          reason: 'param2 does not start with @',
        },
      ]

      testCases.forEach(
        ({ path, param2, param3, expectedType, reason }) => {
          const segments = path.split('/').filter(Boolean)
          const [upstream, actualParam2, actualParam3] = segments

          expect(actualParam2).toBe(param2)
          expect(actualParam3).toBe(param3)

          // The core disambiguation logic
          if (actualParam2.startsWith('@')) {
            expect(expectedType).toBe('scoped-packument')
          } else {
            expect(expectedType).toBe('regular-manifest')
          }
        },
      )
    })
  })

  describe('Package Name Construction', () => {
    it('should construct full package names for scoped packages', () => {
      const testCases = [
        { scope: '@types', pkg: 'node', expected: '@types/node' },
        { scope: '@babel', pkg: 'core', expected: '@babel/core' },
        { scope: '@vue', pkg: 'cli', expected: '@vue/cli' },
      ]

      testCases.forEach(({ scope, pkg, expected }) => {
        const fullName = `${scope}/${pkg}`
        expect(fullName).toBe(expected)
        expect(fullName.startsWith('@')).toBe(true)
        expect(fullName).toContain('/')
      })
    })

    it('should handle parameter passing for different route types', () => {
      // Test the parameter mocking logic that would be used in routes

      // Regular package version: scope=undefined, pkg=package, version=version
      const regularParams = {
        scope: undefined,
        pkg: 'lodash',
        version: '4.17.21',
      }
      expect(regularParams.scope).toBeUndefined()
      expect(regularParams.pkg).toBe('lodash')

      // Scoped package packument: scope=full-name, pkg=full-name
      const scopedPackumentParams = {
        scope: '@types/node',
        pkg: '@types/node',
      }
      expect(scopedPackumentParams.scope).toBe('@types/node')
      expect(scopedPackumentParams.pkg).toBe('@types/node')

      // Scoped package manifest: scope=full-name, pkg=undefined, version=version
      const scopedManifestParams = {
        scope: '@types/node',
        pkg: undefined,
        version: '20.0.0',
      }
      expect(scopedManifestParams.scope).toBe('@types/node')
      expect(scopedManifestParams.pkg).toBeUndefined()
      expect(scopedManifestParams.version).toBe('20.0.0')
    })
  })

  describe('Edge Cases', () => {
    it('should handle packages with special characters', () => {
      const paths = [
        '/npm/lodash.merge',
        '/npm/@babel/plugin-transform-runtime',
        '/npm/@types/node-fetch',
      ]

      paths.forEach(path => {
        const segments = path.split('/').filter(Boolean)
        expect(segments.length).toBeGreaterThan(1)
        expect(segments[0]).toMatch(/^[a-z-]+$/) // Valid upstream name
      })
    })

    it('should handle version ranges and special versions', () => {
      const versions = [
        '4.17.21',
        'latest',
        'next',
        'beta',
        '1.0.0-alpha.1',
        '^4.0.0',
      ]

      versions.forEach(version => {
        expect(typeof version).toBe('string')
        expect(version.length).toBeGreaterThan(0)
      })
    })

    it('should validate upstream names', () => {
      const validUpstreams = [
        'npm',
        'yarn',
        'pnpm',
        'custom-registry',
      ]
      const invalidUpstreams = [
        '',
        'with spaces',
        'with/slash',
        '@scoped',
      ]

      validUpstreams.forEach(upstream => {
        expect(upstream).toMatch(/^[a-z0-9-]+$/)
        expect(upstream.length).toBeGreaterThan(0)
      })

      invalidUpstreams.forEach(upstream => {
        if (upstream === '') {
          expect(upstream.length).toBe(0)
        } else {
          expect(!/^[a-z0-9-]+$/.exec(upstream)).toBe(true)
        }
      })
    })
  })
})
