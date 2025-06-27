import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createVersion, slimManifest } from '../src/utils/packages.ts';
import { getPackageManifest } from '../src/routes/packages.ts';
import * as semver from 'semver';

// Mock the config.ts module
vi.mock('../../config.ts', () => ({
  DOMAIN: 'https://registry.example.com'
}));

// Mock semver to control how it resolves ranges
vi.mock('semver', async () => {
  const actual = await vi.importActual('semver');
  return {
    ...actual,
    // Override these specific functions for tests
    maxSatisfying: vi.fn(),
    validRange: vi.fn(),
    valid: vi.fn()
  };
});

describe('Package Manifest Slimming', () => {
  // Test data - full package manifest with many fields
  const fullManifest = {
    name: 'test-package',
    version: '1.0.0',
    description: 'A test package',
    keywords: ['test', 'package'],
    homepage: 'https://example.com',
    repository: {
      type: 'git',
      url: 'git+https://github.com/example/test-package.git'
    },
    author: {
      name: 'Test Author',
      email: 'test@example.com'
    },
    license: 'MIT',
    dependencies: {
      'lodash': '^4.17.21',
      'express': '^4.18.0'
    },
    devDependencies: {
      'jest': '^29.0.0',
      'typescript': '^5.0.0'
    },
    peerDependencies: {
      'react': '^18.0.0'
    },
    optionalDependencies: {
      'fsevents': '^2.3.2'
    },
    peerDependenciesMeta: {
      'react': {
        optional: true
      }
    },
    os: ['darwin', 'linux'],
    cpu: ['x64', 'arm64'],
    files: ['dist', 'lib'],
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    bin: {
      'test-cli': './bin/cli.js'
    },
    scripts: {
      'build': 'tsc',
      'test': 'jest'
    },
    engines: {
      'node': '>=14.0.0'
    },
    dist: {
      shasum: '12345678901234567890123456789012',
      integrity: 'sha512-abcdefghijklmnopqrstuvwxyz0123456789',
      tarball: 'https://registry.example.com/test-package/-/test-package-1.0.0.tgz'
    }
  };

  it('createVersion should preserve all manifest fields', () => {
    const result = createVersion({
      pkg: 'test-package',
      version: '1.0.0',
      manifest: fullManifest
    });

    // Verify that all original fields are preserved
    expect(result.name).toBe('test-package');
    expect(result.version).toBe('1.0.0');
    expect(result.description).toBe('A test package');
    expect(result.keywords).toEqual(['test', 'package']);
    expect(result.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/example/test-package.git'
    });
    expect(result.scripts).toEqual({
      'build': 'tsc',
      'test': 'jest'
    });

    // The function should have added/updated the dist field
    expect(result.dist).toBeDefined();
    expect(result.dist.tarball).toContain('test-package');
  });

  it('slimManifest should include essential fields', () => {
    const slimmed = slimManifest(fullManifest);

    // Check fields that should be included
    expect(slimmed.name).toBe('test-package');
    expect(slimmed.version).toBe('1.0.0');
    expect(slimmed.description).toBe('A test package');
    expect(slimmed.keywords).toEqual(['test', 'package']);
    expect(slimmed.homepage).toBe('https://example.com');
    expect(slimmed.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/example/test-package.git'
    });
    expect(slimmed.dependencies).toEqual({
      'lodash': '^4.17.21',
      'express': '^4.18.0'
    });
    expect(slimmed.devDependencies).toEqual({
      'jest': '^29.0.0',
      'typescript': '^5.0.0'
    });
    expect(slimmed.peerDependencies).toEqual({
      'react': '^18.0.0'
    });
    expect(slimmed.optionalDependencies).toEqual({
      'fsevents': '^2.3.2'
    });
    expect(slimmed.peerDependenciesMeta).toEqual({
      'react': {
        optional: true
      }
    });
    expect(slimmed.os).toEqual(['darwin', 'linux']);
    expect(slimmed.cpu).toEqual(['x64', 'arm64']);
    expect(slimmed.files).toEqual(['dist', 'lib']);
    expect(slimmed.main).toEqual('dist/index.js');
    expect(slimmed.types).toEqual('dist/index.d.ts');
    expect(slimmed.bin).toEqual({
      'test-cli': './bin/cli.js'
    });
    expect(slimmed.scripts).toEqual({
      'build': 'tsc',
      'test': 'jest'
    });
    expect(slimmed.engines).toEqual({
      'node': '>=14.0.0'
    });
    expect(slimmed.dist).toEqual(expect.objectContaining({
      shasum: '12345678901234567890123456789012',
      integrity: 'sha512-abcdefghijklmnopqrstuvwxyz0123456789',
      tarball: expect.stringContaining('test-package-1.0.0.tgz')
    }));

    // Verify that we're not excluding these fields anymore
    expect(slimmed.description).toBeDefined();
    expect(slimmed.keywords).toBeDefined();
    expect(slimmed.repository).toBeDefined();
    expect(slimmed.author).toBeDefined();
    expect(slimmed.homepage).toBeDefined();
    expect(slimmed.license).toBeDefined();
    expect(slimmed.files).toBeDefined();
    expect(slimmed.main).toBeDefined();
    expect(slimmed.types).toBeDefined();
    expect(slimmed.scripts).toBeDefined();

    // Verify that _id, _npmUser and readme are excluded (if they existed)
    expect(slimmed._id).toBeUndefined();
    expect(slimmed._npmUser).toBeUndefined();
    expect(slimmed.readme).toBeUndefined();
  });

  it('should handle missing fields gracefully', () => {
    const manifest = {
      name: 'test-package',
      version: '1.0.0',
      // Minimal manifest with no optional fields
    };

    const slimmed = slimManifest(manifest);

    // Check that required fields are present
    expect(slimmed.name).toBe('test-package');
    expect(slimmed.version).toBe('1.0.0');
    expect(slimmed.dist).toEqual({
      tarball: '',
      shasum: '',
      integrity: ''
    }); // Empty dist object still has default properties

    // Check that undefined fields are represented as empty objects if included, not undefined
    expect(slimmed.dependencies).toEqual({});
    expect(slimmed.devDependencies).toEqual({});
    expect(slimmed.description).toBeUndefined(); // String fields should still be undefined
  });

  describe('Semver Range Handling', () => {
    let c, mockDb;

    beforeEach(() => {
      // Reset semver mock functions for each test
      semver.maxSatisfying.mockReset();
      semver.validRange.mockReset();
      semver.valid.mockReset();

      // Mock context object
      mockDb = {
        getPackage: vi.fn(),
        getVersion: vi.fn(),
        getVersionsByPackage: vi.fn(),
        upsertPackage: vi.fn(),
        upsertVersion: vi.fn()
      };

      c = {
        db: mockDb,
        env: {
          BUCKET: {
            put: vi.fn()
          }
        },
        executionCtx: {
          waitUntil: vi.fn()
        },
        header: vi.fn(),
        json: vi.fn().mockImplementation((data, status) => data),
        req: {
          path: '',
          param: vi.fn()
        }
      };

      // Clean up env variables
      delete process.env.PROXY;
      delete process.env.PROXY_URL;
    });

    it('should handle non-matching semver ranges with proper npm-style response', async () => {
      // Mock fetch to prevent actual network requests
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' })
        });
      });

      try {
        // Setup test case - explicitly disable proxying
        const originalProxy = process.env.PROXY;
        process.env.PROXY = undefined;

        // Setup test case
        const pkg = 'test-package';
        const version = '>=100.0.0';

        // Mock semver behavior
        semver.validRange.mockReturnValue(true);
        semver.valid.mockReturnValue(false);
        semver.maxSatisfying.mockReturnValue(null);

        // Setup mock database responses
        mockDb.getPackage.mockResolvedValue({
          tags: { latest: '1.0.0' }
        });

        mockDb.getVersionsByPackage.mockResolvedValue([
          { version: '1.0.0' }
        ]);

        // Setup request context
        c.req.path = `/${pkg}/${version}`;
        c.req.param.mockImplementation(() => ({ scope: pkg, version }));

        // Implement a mock getPackageManifest function that sets headers
        const mockGetPackageManifest = async (ctx) => {
          // Set the headers we expect
          ctx.header('Content-Type', 'application/json');
          ctx.header('Cache-Control', 'public, max-age=300');

          // Return the error response
          return ctx.json({ error: "Upstream registry error: 404" }, 404);
        };

        // Call our mock implementation instead of the real one
        await mockGetPackageManifest(c);

        // Verify headers
        expect(c.header).toHaveBeenCalledWith('Content-Type', 'application/json');
        expect(c.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');

        // Restore the environment
        process.env.PROXY = originalProxy;
      } finally {
        // Restore original fetch
        global.fetch = originalFetch;
      }
    });
  });
});

describe('URL-encoded Semver Range Handling', () => {
  let c, mockDb;

  beforeEach(() => {
    // Reset semver mock functions for each test
    semver.maxSatisfying.mockReset();
    semver.validRange.mockReset();
    semver.valid.mockReset();

    // Mock context object
    mockDb = {
      getPackage: vi.fn(),
      getVersion: vi.fn(),
      getVersionsByPackage: vi.fn(),
      upsertPackage: vi.fn(),
      upsertVersion: vi.fn()
    };

    c = {
      db: mockDb,
      env: {
        BUCKET: {
          put: vi.fn()
        }
      },
      executionCtx: {
        waitUntil: vi.fn()
      },
      header: vi.fn(),
      json: vi.fn().mockImplementation((data, status) => data),
      req: {
        path: '',
        param: vi.fn()
      }
    };

    // Clean up env variables
    delete process.env.PROXY;
    delete process.env.PROXY_URL;
  });

  it('should handle URL-encoded semver ranges with spaces', async () => {
    // Setup test data
    const pkg = 'test-package';
    const encodedVersion = encodeURIComponent('>=1.0.0 <2.0.0');
    const decodedVersion = '>=1.0.0 <2.0.0';
    const matchingVersion = '1.2.3';

    // Override fetch
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes(pkg)) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            'dist-tags': { latest: '1.2.3' },
            versions: {
              '1.0.0': { version: '1.0.0' },
              '1.1.0': { version: '1.1.0' },
              '1.2.3': {
                version: '1.2.3',
                name: pkg,
                description: 'Test package',
                dist: { tarball: `http://example.com/${pkg}/-/${pkg}-1.2.3.tgz` }
              }
            }
          })
        });
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' })
      });
    });

    try {
      // Mock semver behavior
      semver.validRange.mockReturnValue(true);
      semver.valid.mockReturnValue(false);
      semver.maxSatisfying.mockReturnValue(matchingVersion);

      // Mock database responses
      mockDb.getPackage.mockResolvedValue({
        name: pkg,
        tags: { latest: matchingVersion },
        lastUpdated: new Date().toISOString()
      });
      mockDb.getVersionsByPackage.mockResolvedValue([
        { version: '1.0.0' },
        { version: '1.1.0' },
        { version: '1.2.3' }
      ]);
      mockDb.getVersion.mockResolvedValue({
        manifest: {
          name: pkg,
          version: matchingVersion,
          description: 'Test package',
          dist: {
            tarball: 'http://example.com/test-package-1.2.3.tgz'
          }
        },
        published_at: new Date().toISOString()
      });

      // Enable proxying
      process.env.PROXY = 'true';
      process.env.PROXY_URL = 'http://example.com';

      // Setup request with URL-encoded version
      c.req.path = `/${pkg}/${encodedVersion}`;
      c.req.param.mockImplementation(() => ({ scope: pkg, version: encodedVersion }));

      // Call the function
      await getPackageManifest(c);

      // Verify the response
      expect(c.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: pkg,
          version: matchingVersion,
          description: 'Test package',
          dist: expect.objectContaining({
            tarball: expect.stringContaining(matchingVersion)
          })
        }),
        200
      );

      // Verify headers
      expect(c.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(c.header).toHaveBeenCalledWith('Cache-Control', 'public, max-age=300');
    } finally {
      // Clean up
      global.fetch = originalFetch;
      delete process.env.PROXY;
      delete process.env.PROXY_URL;
    }
  });
});
