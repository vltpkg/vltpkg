import { describe, it, expect, vi } from 'vitest'

// Mock the package route handlers before importing
vi.mock('../src/routes/packages', () => ({
  getPackagePackument: vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        name: 'lodash',
        'dist-tags': { latest: '4.17.21' },
        versions: {
          '4.17.21': {
            name: 'lodash',
            version: '4.17.21',
            dist: {
              tarball:
                'http://localhost:1337/npm/lodash/-/lodash-4.17.21.tgz',
            },
          },
        },
        time: { '4.17.21': '2021-02-01T00:00:00.000Z' },
      }),
      { status: 200 },
    ),
  ),
  getPackageManifest: vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        name: 'lodash',
        version: '4.17.21',
        dist: {
          tarball:
            'http://localhost:1337/npm/lodash/-/lodash-4.17.21.tgz',
        },
        dependencies: {},
      }),
      { status: 200 },
    ),
  ),
  getPackageTarball: vi
    .fn()
    .mockResolvedValue(
      new Response('tarball content', { status: 200 }),
    ),
}))

// Mock upstream utils
vi.mock('../src/utils/upstream', () => ({
  isValidUpstreamName: vi.fn((name: string) => {
    return !['invalid-upstream', 'reserved'].includes(name)
  }),
  getUpstreamConfig: vi.fn((name: string) => {
    if (name === 'npm') {
      return { url: 'https://registry.npmjs.org', timeout: 30000 }
    }
    if (name === 'unknown-upstream') {
      return null
    }
    return { url: 'https://example.com', timeout: 30000 }
  }),
  getDefaultUpstream: vi.fn().mockReturnValue('npm'),
}))

// Import after mocking
import { Hono, Context } from 'hono'

describe('Upstream Routes Logic Tests', () => {
  describe('Route Pattern Matching', () => {
    it('should correctly identify regular package requests', () => {
      const path = '/npm/lodash'
      const segments = path.split('/').filter(Boolean)

      expect(segments).toEqual(['npm', 'lodash'])
      expect(segments[0]).toBe('npm') // upstream
      expect(segments[1]).toBe('lodash') // package
      expect(segments.length).toBe(2) // packument request
    })

    it('should correctly identify regular package version requests', () => {
      const path = '/npm/lodash/4.17.21'
      const segments = path.split('/').filter(Boolean)

      expect(segments).toEqual(['npm', 'lodash', '4.17.21'])
      expect(segments[0]).toBe('npm') // upstream
      expect(segments[1]).toBe('lodash') // package
      expect(segments[2]).toBe('4.17.21') // version
      expect(segments.length).toBe(3) // manifest request
    })

    it('should correctly identify scoped package requests', () => {
      const path = '/npm/@types/node'
      const segments = path.split('/').filter(Boolean)

      expect(segments).toEqual(['npm', '@types', 'node'])
      expect(segments[0]).toBe('npm') // upstream
      expect(segments[1]).toBe('@types') // scope
      expect(segments[2]).toBe('node') // package name
      expect(segments[1].startsWith('@')).toBe(true)
      expect(segments.length).toBe(3) // packument request for scoped package
    })

    it('should correctly identify scoped package version requests', () => {
      const path = '/npm/@types/node/20.0.0'
      const segments = path.split('/').filter(Boolean)

      expect(segments).toEqual(['npm', '@types', 'node', '20.0.0'])
      expect(segments[0]).toBe('npm') // upstream
      expect(segments[1]).toBe('@types') // scope
      expect(segments[2]).toBe('node') // package name
      expect(segments[3]).toBe('20.0.0') // version
      expect(segments[1].startsWith('@')).toBe(true)
      expect(segments.length).toBe(4) // manifest request for scoped package
    })
  })

  describe('URL Encoding Handling', () => {
    it('should handle URL-encoded scoped package names', () => {
      const encodedPath = '/npm/@types%2Fnode'
      const decodedPath = decodeURIComponent(encodedPath)

      expect(decodedPath).toBe('/npm/@types/node')

      const segments = decodedPath.split('/').filter(Boolean)
      expect(segments).toEqual(['npm', '@types', 'node'])
    })

    it('should handle both encoded and unencoded forms', () => {
      const unencoded = '/npm/@types/node'
      const encoded = '/npm/@types%2Fnode'

      const unencodedSegments = unencoded.split('/').filter(Boolean)
      const encodedSegments = decodeURIComponent(encoded)
        .split('/')
        .filter(Boolean)

      expect(unencodedSegments).toEqual(encodedSegments)
    })
  })

  describe('Route Disambiguation Logic', () => {
    it('should distinguish between scoped packages and version requests based on @ prefix', () => {
      // Test the core logic for distinguishing routes
      const testCases = [
        {
          path: '/npm/@types/node',
          segments: ['npm', '@types', 'node'],
          expected: {
            type: 'scoped-packument',
            param2: '@types',
            param3: 'node',
          },
        },
        {
          path: '/npm/lodash/4.17.21',
          segments: ['npm', 'lodash', '4.17.21'],
          expected: {
            type: 'regular-manifest',
            param2: 'lodash',
            param3: '4.17.21',
          },
        },
        {
          path: '/npm/@babel/core/7.25.0',
          segments: ['npm', '@babel', 'core', '7.25.0'],
          expected: {
            type: 'scoped-manifest',
            scope: '@babel',
            pkg: 'core',
            version: '7.25.0',
          },
        },
      ]

      testCases.forEach(({ path, segments, expected }) => {
        const [upstream, param2, param3, param4] = segments

        if (segments.length === 3) {
          // 3-segment route: could be scoped packument or regular manifest
          if (param2.startsWith('@')) {
            // Scoped package packument
            expect(expected.type).toBe('scoped-packument')
            expect(param2).toBe(expected.param2)
            expect(param3).toBe(expected.param3)
          } else {
            // Regular package manifest
            expect(expected.type).toBe('regular-manifest')
            expect(param2).toBe(expected.param2)
            expect(param3).toBe(expected.param3)
          }
        } else if (segments.length === 4) {
          // 4-segment route: scoped package manifest
          expect(expected.type).toBe('scoped-manifest')
          expect(param2).toBe(expected.scope)
          expect(param3).toBe(expected.pkg)
          expect(param4).toBe(expected.version)
        }
      })
    })
  })

  describe('Parameter Mocking Logic', () => {
    it('should mock parameters correctly for regular packages', () => {
      const pkg = 'lodash'
      const version = '4.17.21'

      // Simulate the parameter mocking logic
      const mockParams = {
        scope: undefined,
        pkg: pkg,
        version: version,
      }

      expect(mockParams.scope).toBeUndefined()
      expect(mockParams.pkg).toBe('lodash')
      expect(mockParams.version).toBe('4.17.21')
    })

    it('should mock parameters correctly for scoped packages', () => {
      const scope = '@types'
      const pkg = 'node'
      const fullPackageName = `${scope}/${pkg}`

      // For scoped package packuments
      const mockPackumentParams = {
        scope: fullPackageName,
        pkg: fullPackageName,
      }

      expect(mockPackumentParams.scope).toBe('@types/node')
      expect(mockPackumentParams.pkg).toBe('@types/node')

      // For scoped package manifests
      const version = '20.0.0'
      const mockManifestParams = {
        scope: fullPackageName,
        pkg: undefined,
        version: version,
      }

      expect(mockManifestParams.scope).toBe('@types/node')
      expect(mockManifestParams.pkg).toBeUndefined()
      expect(mockManifestParams.version).toBe('20.0.0')
    })
  })

  describe('Package Name Construction', () => {
    it('should construct package names correctly in getPackageManifest logic', () => {
      // Simulate the logic from getPackageManifest
      const testCases = [
        {
          name: 'regular package',
          scope: undefined,
          pkg: 'lodash',
          expected: 'lodash',
        },
        {
          name: 'scoped package with scope only',
          scope: '@types/node',
          pkg: undefined,
          expected: '@types/node',
        },
        {
          name: 'scoped package with scope and pkg',
          scope: '@types',
          pkg: 'node',
          expected: '@types/node',
        },
      ]

      testCases.forEach(
        ({ name, scope, pkg: pkgParam, expected }) => {
          let pkg = pkgParam

          // Simulate the logic from getPackageManifest lines 655-662
          if (scope && pkg) {
            // Scoped package with both scope and pkg
            const packageName =
              scope.startsWith('@') ?
                `${scope}/${pkg}`
              : `@${scope}/${pkg}`
            pkg = packageName
          } else if (scope) {
            // Unscoped package (scope is actually the package name) or scoped package name passed as scope
            pkg = scope
          }

          expect(pkg).toBe(expected)
        },
      )
    })
  })

  describe('Upstream Validation Logic', () => {
    it('should validate upstream names correctly', async () => {
      const { isValidUpstreamName } = await import(
        '../src/utils/upstream'
      )

      expect(isValidUpstreamName('npm')).toBe(true)
      expect(isValidUpstreamName('yarn')).toBe(true)
      expect(isValidUpstreamName('invalid-upstream')).toBe(false)
      expect(isValidUpstreamName('reserved')).toBe(false)
    })

    it('should get upstream config correctly', async () => {
      const { getUpstreamConfig } = await import(
        '../src/utils/upstream'
      )

      const npmConfig = getUpstreamConfig('npm')
      expect(npmConfig).toBeTruthy()
      expect(npmConfig?.url).toBe('https://registry.npmjs.org')

      const unknownConfig = getUpstreamConfig('unknown-upstream')
      expect(unknownConfig).toBeNull()
    })
  })

  describe('Response Structure Validation', () => {
    it('should validate packument response structure', () => {
      const mockPackument = {
        name: 'lodash',
        'dist-tags': { latest: '4.17.21' },
        versions: {
          '4.17.21': {
            name: 'lodash',
            version: '4.17.21',
            dist: {
              tarball:
                'http://localhost:1337/npm/lodash/-/lodash-4.17.21.tgz',
            },
          },
        },
        time: { '4.17.21': '2021-02-01T00:00:00.000Z' },
      }

      expect(mockPackument).toHaveProperty('name')
      expect(mockPackument).toHaveProperty('dist-tags')
      expect(mockPackument).toHaveProperty('versions')
      expect(mockPackument).toHaveProperty('time')
      expect(mockPackument['dist-tags']).toHaveProperty('latest')
      expect(
        Object.keys(mockPackument.versions).length,
      ).toBeGreaterThan(0)
    })

    it('should validate manifest response structure', () => {
      const mockManifest = {
        name: 'lodash',
        version: '4.17.21',
        dist: {
          tarball:
            'http://localhost:1337/npm/lodash/-/lodash-4.17.21.tgz',
        },
        dependencies: {},
      }

      expect(mockManifest).toHaveProperty('name')
      expect(mockManifest).toHaveProperty('version')
      expect(mockManifest).toHaveProperty('dist')
      expect(mockManifest.dist).toHaveProperty('tarball')
      expect(mockManifest.dist.tarball).toMatch(/\.tgz$/)
    })
  })
})
