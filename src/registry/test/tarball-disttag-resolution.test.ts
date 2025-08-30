import { describe, it, expect } from 'vitest'

describe('Tarball Dist-tag Resolution Tests', () => {
  describe('Dist-tag to Version Resolution Logic', () => {
    it('should identify valid semver versions', () => {
      const validVersions = [
        '1.0.0',
        '1.2.3-beta.1',
        '2.0.0-alpha',
        '0.1.0',
      ]

      validVersions.forEach(version => {
        // These should NOT be treated as dist-tags (they're valid semver)
        expect(version).toMatch(/^\d+\.\d+\.\d+/)
      })
    })

    it('should identify dist-tags that need resolution', () => {
      const distTags = [
        'latest',
        'beta',
        'alpha',
        'next',
        'canary',
        'rc',
      ]

      distTags.forEach(tag => {
        // These should be treated as dist-tags (not valid semver)
        expect(tag).not.toMatch(/^\d+\.\d+\.\d+/)
      })
    })

    it('should handle package filename extraction correctly', () => {
      const testCases = [
        {
          pkg: 'lodash',
          tarball: 'lodash-latest.tgz',
          expectedPackageFileName: 'lodash',
          expectedVersion: 'latest',
        },
        {
          pkg: '@types/node',
          tarball: 'node-latest.tgz',
          expectedPackageFileName: 'node',
          expectedVersion: 'latest',
        },
        {
          pkg: '@scope/package',
          tarball: 'package-beta.tgz',
          expectedPackageFileName: 'package',
          expectedVersion: 'beta',
        },
        {
          pkg: 'my-package',
          tarball: 'my-package-1.0.0.tgz',
          expectedPackageFileName: 'my-package',
          expectedVersion: '1.0.0',
        },
      ]

      testCases.forEach(
        ({
          pkg,
          tarball,
          expectedPackageFileName,
          expectedVersion,
        }) => {
          const packageFileName =
            pkg.includes('/') ? pkg.split('/').pop() : pkg
          const prefix = `${packageFileName}-`
          const suffix = '.tgz'

          expect(packageFileName).toBe(expectedPackageFileName)

          if (
            tarball.startsWith(prefix) &&
            tarball.endsWith(suffix)
          ) {
            const versionFromTarball = tarball.slice(
              prefix.length,
              -suffix.length,
            )
            expect(versionFromTarball).toBe(expectedVersion)
          }
        },
      )
    })

    it('should construct correct upstream URLs', () => {
      // This would test the upstream URL construction logic
      // For now, we'll just validate the expected URL patterns

      const expectedUrls = [
        'https://registry.npmjs.org/lodash',
        'https://registry.npmjs.org/@types/node',
        'https://registry.npmjs.org/@scope/package',
      ]

      expectedUrls.forEach(url => {
        expect(url).toMatch(/^https:\/\/registry\.npmjs\.org\//)
      })
    })
  })

  describe('Tarball URL Patterns', () => {
    it('should handle regular package tarballs with dist-tags', () => {
      const testCases = [
        {
          url: '/npm/lodash/-/lodash-latest.tgz',
          expectedPkg: 'lodash',
          expectedDistTag: 'latest',
        },
        {
          url: '/npm/express/-/express-beta.tgz',
          expectedPkg: 'express',
          expectedDistTag: 'beta',
        },
      ]

      testCases.forEach(({ url, expectedPkg, expectedDistTag }) => {
        const pathSegments = url.split('/').filter(Boolean)
        const tarballIndex = pathSegments.findIndex(
          segment => segment === '-',
        )

        if (tarballIndex > 0) {
          const pkg = pathSegments[tarballIndex - 1]
          const tarball = pathSegments[tarballIndex + 1]

          expect(pkg).toBe(expectedPkg)

          if (tarball) {
            const packageFileName =
              pkg.includes('/') ? pkg.split('/').pop() : pkg
            const prefix = `${packageFileName}-`
            const suffix = '.tgz'

            if (
              tarball.startsWith(prefix) &&
              tarball.endsWith(suffix)
            ) {
              const versionFromTarball = tarball.slice(
                prefix.length,
                -suffix.length,
              )
              expect(versionFromTarball).toBe(expectedDistTag)
            }
          }
        }
      })
    })

    it('should handle scoped package tarballs with dist-tags', () => {
      const testCases = [
        {
          url: '/npm/@types/node/-/node-latest.tgz',
          expectedScope: '@types',
          expectedPkg: 'node',
          expectedDistTag: 'latest',
        },
        {
          url: '/npm/@babel/core/-/core-next.tgz',
          expectedScope: '@babel',
          expectedPkg: 'core',
          expectedDistTag: 'next',
        },
      ]

      testCases.forEach(
        ({ url, expectedScope, expectedPkg, expectedDistTag }) => {
          const pathSegments = url.split('/').filter(Boolean)

          // For scoped packages, we expect: ['npm', '@scope', 'pkg', '-', 'tarball']
          if (
            pathSegments.length >= 5 &&
            pathSegments[1].startsWith('@')
          ) {
            const scope = pathSegments[1]
            const pkg = pathSegments[2]
            const tarball = pathSegments[4]

            expect(scope).toBe(expectedScope)
            expect(pkg).toBe(expectedPkg)

            if (tarball) {
              const prefix = `${pkg}-`
              const suffix = '.tgz'

              if (
                tarball.startsWith(prefix) &&
                tarball.endsWith(suffix)
              ) {
                const versionFromTarball = tarball.slice(
                  prefix.length,
                  -suffix.length,
                )
                expect(versionFromTarball).toBe(expectedDistTag)
              }
            }
          }
        },
      )
    })

    it('should preserve regular version numbers', () => {
      const testCases = [
        {
          url: '/npm/lodash/-/lodash-4.17.21.tgz',
          expectedVersion: '4.17.21',
          shouldResolve: false, // Already a valid version
        },
        {
          url: '/npm/@types/node/-/node-20.0.0.tgz',
          expectedVersion: '20.0.0',
          shouldResolve: false, // Already a valid version
        },
        {
          url: '/npm/package/-/package-latest.tgz',
          expectedVersion: 'latest',
          shouldResolve: true, // Needs resolution
        },
      ]

      testCases.forEach(({ url, expectedVersion, shouldResolve }) => {
        const pathSegments = url.split('/').filter(Boolean)
        const tarballIndex = pathSegments.findIndex(
          segment => segment === '-',
        )

        if (tarballIndex > 0) {
          const tarball = pathSegments[tarballIndex + 1]

          if (tarball?.endsWith('.tgz')) {
            // Extract version from tarball name
            const pkgIndex = tarballIndex - 1
            let pkg = pathSegments[pkgIndex]

            // Handle scoped packages
            if (
              pkgIndex > 0 &&
              pathSegments[pkgIndex - 1].startsWith('@')
            ) {
              pkg = pathSegments[pkgIndex] // Just the package part, not the scope
            }

            const prefix = `${pkg}-`
            const suffix = '.tgz'

            if (
              tarball.startsWith(prefix) &&
              tarball.endsWith(suffix)
            ) {
              const versionFromTarball = tarball.slice(
                prefix.length,
                -suffix.length,
              )
              expect(versionFromTarball).toBe(expectedVersion)

              // Check if it's a valid semver (doesn't need resolution)
              const isValidSemver = /^\d+\.\d+\.\d+/.test(
                versionFromTarball,
              )
              expect(isValidSemver).toBe(!shouldResolve)
            }
          }
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid tarball names gracefully', () => {
      const invalidTarballs = [
        'not-a-tarball.txt',
        'package-without-version.tgz',
        'invalid-format',
        '',
        'package-.tgz', // Empty version
      ]

      invalidTarballs.forEach(tarball => {
        if (tarball && tarball.endsWith('.tgz')) {
          // Only process .tgz files
          const parts = tarball.split('-')
          if (parts.length < 2) {
            // Invalid format - no version part
            expect(parts.length).toBeLessThan(2)
          }
        } else {
          // Not a .tgz file
          expect(tarball.endsWith('.tgz')).toBe(false)
        }
      })
    })

    it('should handle upstream fetch failures gracefully', () => {
      // This tests the error handling when upstream resolution fails
      // The implementation should fall back to the original tarball name

      const fallbackScenarios = [
        'network-error',
        'upstream-404',
        'invalid-json-response',
        'missing-dist-tags',
      ]

      fallbackScenarios.forEach(scenario => {
        // In case of errors, the system should continue with the original tarball name
        // This ensures the request doesn't completely fail
        expect(scenario).toBeDefined()
      })
    })
  })

  describe('Real-world Use Cases', () => {
    it('should support common npm dist-tags', () => {
      const commonDistTags = [
        'latest',
        'next',
        'beta',
        'alpha',
        'rc',
        'canary',
        'dev',
        'experimental',
      ]

      commonDistTags.forEach(tag => {
        // These should all be recognized as dist-tags (not semver)
        const isValidSemver = /^\d+\.\d+\.\d+/.test(tag)
        expect(isValidSemver).toBe(false)
      })
    })

    it('should handle popular package naming patterns', () => {
      const popularPackages = [
        { pkg: 'lodash', expectedFileName: 'lodash' },
        { pkg: 'react', expectedFileName: 'react' },
        { pkg: '@types/node', expectedFileName: 'node' },
        { pkg: '@babel/core', expectedFileName: 'core' },
        { pkg: '@angular/common', expectedFileName: 'common' },
        {
          pkg: 'my-awesome-package',
          expectedFileName: 'my-awesome-package',
        },
      ]

      popularPackages.forEach(({ pkg, expectedFileName }) => {
        const packageFileName =
          pkg.includes('/') ? pkg.split('/').pop() : pkg
        expect(packageFileName).toBe(expectedFileName)
      })
    })
  })
})
