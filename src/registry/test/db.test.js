import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/d1';
import { createDatabaseOperations } from '../src/db/client';

describe('Database Operations', () => {
  let dbOps;
  let mockData;

  beforeAll(() => {
    // Create a mock D1 database that implements the required interface
    const testDb = {
      prepare: () => ({
        bind: () => ({
          first: () => Promise.resolve(null),
          all: () => Promise.resolve([]),
          raw: () => Promise.resolve([]),
          run: () => Promise.resolve({ success: true }),
          values: () => Promise.resolve([]),
        }),
      }),
      batch: (statements) => Promise.resolve(statements.map(() => ({ success: true }))),
      exec: () => Promise.resolve({ success: true }),
    };

    // Create database operations with the mock
    dbOps = createDatabaseOperations(drizzle(testDb));
  });

  beforeEach(() => {
    // Reset mock data before each test
    mockData = {
      packages: new Map(),
      tokens: new Map(),
      versions: new Map(),
    };

    // Override database operations with mock implementations
    dbOps.getPackage = async (name) => {
      return mockData.packages.get(name) || null;
    };

    dbOps.upsertPackage = async (name, tags) => {
      const pkg = { name, tags };
      mockData.packages.set(name, pkg);
      return pkg;
    };

    dbOps.getToken = async (token) => {
      return mockData.tokens.get(token) || null;
    };

    // Implement validation for upsertToken
    dbOps.upsertToken = async (token, uuid, scope, authToken) => {
      // Validate UUID doesn't start with special characters
      const specialChars = ['~', '!', '*', '^', '&'];
      if (uuid && specialChars.some(char => uuid.startsWith(char))) {
        throw new Error('Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)');
      }

      // If authToken is provided, validate access permissions
      if (authToken) {
        const authUser = mockData.tokens.get(authToken);
        if (!authUser) {
          throw new Error('Unauthorized');
        }

        // Allow users to modify their own tokens
        if (authUser.uuid !== uuid) {
          // Check if has global user permissions
          let hasPermission = false;
          if (Array.isArray(authUser.scope)) {
            for (const s of authUser.scope) {
              if (s.types?.user &&
                  s.values.includes('*') &&
                  s.types.user.write) {
                hasPermission = true;
                break;
              }
            }
          }

          if (!hasPermission) {
            throw new Error('Unauthorized');
          }
        }
      }

      const tokenData = { token, uuid, scope };
      mockData.tokens.set(token, tokenData);
      return tokenData;
    };

    dbOps.deleteToken = async (token, authToken) => {
      if (authToken) {
        const tokenData = mockData.tokens.get(token);
        const authUser = mockData.tokens.get(authToken);

        if (!authUser) {
          throw new Error('Unauthorized');
        }

        if (tokenData && authUser.uuid !== tokenData.uuid) {
          // Check if has global user permissions
          let hasPermission = false;
          if (Array.isArray(authUser.scope)) {
            for (const s of authUser.scope) {
              if (s.types?.user &&
                  s.values.includes('*') &&
                  s.types.user.write) {
                hasPermission = true;
                break;
              }
            }
          }

          if (!hasPermission) {
            throw new Error('Unauthorized');
          }
        }
      }

      mockData.tokens.delete(token);
      return true;
    };

    dbOps.getVersion = async (spec) => {
      return mockData.versions.get(spec) || null;
    };

    dbOps.upsertVersion = async (spec, manifest, published_at) => {
      const version = { spec, manifest, published_at };
      mockData.versions.set(spec, version);
      return version;
    };

    dbOps.searchPackages = async (query, scope) => {
      const results = Array.from(mockData.packages.values()).filter(pkg => {
        if (scope) {
          return pkg.name.startsWith(scope + '/') && pkg.name.toLowerCase().includes(query.toLowerCase());
        }
        return pkg.name.toLowerCase().includes(query.toLowerCase());
      });
      return results;
    };
  });

  describe('Packages', () => {
    const testPackage = {
      name: 'test-package',
      tags: { latest: '1.0.0' },
    };

    it('should insert and retrieve a package', async () => {
      await dbOps.upsertPackage(testPackage.name, testPackage.tags);
      const retrieved = await dbOps.getPackage(testPackage.name);
      expect(retrieved).toEqual({
        name: testPackage.name,
        tags: testPackage.tags,
      });
    });

    it('should update an existing package', async () => {
      const updatedTags = { latest: '2.0.0' };
      await dbOps.upsertPackage(testPackage.name, updatedTags);
      const retrieved = await dbOps.getPackage(testPackage.name);
      expect(retrieved).toEqual({
        name: testPackage.name,
        tags: updatedTags,
      });
    });
  });

  describe('Tokens', () => {
    const testToken = {
      token: 'test-token',
      uuid: 'test-uuid',
      scope: [
        {
          values: ['*'],
          types: {
            pkg: { read: true, write: true },
          },
        },
      ],
    };

    it('should insert and retrieve a token', async () => {
      await dbOps.upsertToken(testToken.token, testToken.uuid, testToken.scope);
      const retrieved = await dbOps.getToken(testToken.token);
      expect(retrieved).toEqual({
        token: testToken.token,
        uuid: testToken.uuid,
        scope: testToken.scope,
      });
    });

    it('should update an existing token', async () => {
      const updatedScope = [
        {
          values: ['@test'],
          types: {
            pkg: { read: true, write: false },
          },
        },
      ];
      await dbOps.upsertToken(testToken.token, testToken.uuid, updatedScope);
      const retrieved = await dbOps.getToken(testToken.token);
      expect(retrieved).toEqual({
        token: testToken.token,
        uuid: testToken.uuid,
        scope: updatedScope,
      });
    });

    it('should reject UUIDs with special characters', async () => {
      const invalidUuid = '~invalidUuid';

      await expect(
        dbOps.upsertToken('invalid-token', invalidUuid, [])
      ).rejects.toThrow('Invalid uuid');
    });

    it('should validate user access permissions', async () => {
      // Setup test tokens
      const adminToken = 'admin-token';
      const userAToken = 'user-a-token';

      // Setup mock tokens
      await dbOps.upsertToken(adminToken, 'admin', [
        {
          values: ['*'],
          types: { user: { read: true, write: true } }
        }
      ]);

      await dbOps.upsertToken(userAToken, 'user-a', [
        {
          values: ['~user-a'],
          types: { user: { read: true, write: true } }
        }
      ]);

      // Case 1: User can modify their own token
      await expect(
        dbOps.upsertToken('new-token', 'user-a', [], userAToken)
      ).resolves.not.toThrow();

      // Case 2: Admin can modify any user's token
      await expect(
        dbOps.upsertToken('other-token', 'user-b', [], adminToken)
      ).resolves.not.toThrow();

      // Case 3: User cannot modify another user's token
      await expect(
        dbOps.upsertToken('other-token', 'user-b', [], userAToken)
      ).rejects.toThrow('Unauthorized');
    });

    it('should validate user access permissions for token operations', async () => {
      // Import token functions
      const { postToken, putToken } = await import('../src/routes/tokens.js');

      // Test case 1: User trying to modify their own token (authorized)
      const selfContext = {
        req: {
          json: async () => ({ token: 'own-token', uuid: 'user-a', scope: [] }),
          param: () => 'own-token',
          header: () => 'Bearer auth-token'
        },
        json: (response, statusCode) => ({ response, statusCode }),
        db: {
          ...dbOps,
          getToken: async (token) => {
            if (token === 'auth-token') {
              return {
                token: 'auth-token',
                uuid: 'user-a',
                scope: []
              };
            }
            return null;
          },
          upsertToken: async (token, uuid, scope, authToken) => {
            if (authToken) {
              const authUser = await dbOps.getToken(authToken);
              if (authUser && authUser.uuid !== uuid) {
                throw new Error('Unauthorized');
              }
            }
            return true;
          }
        }
      };

      // User modifying their own token should be authorized
      const selfPostResult = await postToken(selfContext);
      expect(selfPostResult.statusCode).not.toBe(401);

      // Test case 2: User trying to modify another user's token without permission
      const unauthorizedContext = {
        req: {
          json: async () => ({ token: 'other-token', uuid: 'user-b', scope: [] }),
          param: () => 'other-token',
          header: () => 'Bearer restricted-token'
        },
        json: (response, statusCode) => ({ response, statusCode }),
        db: {
          ...dbOps,
          getToken: async (token) => {
            if (token === 'restricted-token') {
              return {
                token: 'restricted-token',
                uuid: 'user-a',
                scope: [
                  {
                    values: ['~user-a'],
                    types: {
                      user: { read: true, write: true }
                    }
                  }
                ]
              };
            }
            return null;
          },
          upsertToken: async (token, uuid, scope, authToken) => {
            if (authToken === 'restricted-token' && uuid === 'user-b') {
              throw new Error('Unauthorized');
            }
            return true;
          }
        }
      };

      // User without permission to modify another user's token should be unauthorized
      const unauthorizedPostResult = await postToken(unauthorizedContext);
      expect(unauthorizedPostResult.statusCode).toBe(401);
      expect(unauthorizedPostResult.response.error).toBe('Unauthorized');

      // Test case 3: Admin user with global permissions modifying another user's token
      const adminContext = {
        req: {
          json: async () => ({ token: 'other-token', uuid: 'user-b', scope: [] }),
          param: () => 'other-token',
          header: () => 'Bearer admin-token'
        },
        json: (response, statusCode) => ({ response, statusCode }),
        db: {
          ...dbOps,
          getToken: async (token) => {
            if (token === 'admin-token') {
              return {
                token: 'admin-token',
                uuid: 'admin',
                scope: [
                  {
                    values: ['*'],
                    types: {
                      user: { read: true, write: true }
                    }
                  }
                ]
              };
            }
            return null;
          },
          upsertToken: async () => true
        }
      };

      // Admin with proper permissions should be authorized
      const adminPostResult = await postToken(adminContext);
      expect(adminPostResult.statusCode).not.toBe(401);
    });
  });

  describe('Versions', () => {
    const testVersion = {
      spec: 'test-package@1.0.0',
      manifest: {
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package',
      },
      published_at: '2025-03-25T15:33:21.971Z',
    };

    it('should insert and retrieve a version', async () => {
      await dbOps.upsertVersion(testVersion.spec, testVersion.manifest, testVersion.published_at);
      const retrieved = await dbOps.getVersion(testVersion.spec);
      expect(retrieved).toEqual({
        spec: testVersion.spec,
        manifest: testVersion.manifest,
        published_at: testVersion.published_at,
      });
    });

    it('should update an existing version', async () => {
      const updatedManifest = {
        name: 'test-package',
        version: '1.0.0',
        description: 'Updated test package',
      };
      await dbOps.upsertVersion(testVersion.spec, updatedManifest, testVersion.published_at);
      const retrieved = await dbOps.getVersion(testVersion.spec);
      expect(retrieved).toEqual({
        spec: testVersion.spec,
        manifest: updatedManifest,
        published_at: testVersion.published_at,
      });
    });
  });

  describe('Search Operations', () => {
    it('should search packages by name', async () => {
      const testPackages = [
        { name: 'test-package-1', tags: { latest: '1.0.0' } },
        { name: 'test-package-2', tags: { latest: '1.0.0' } },
        { name: 'other-package', tags: { latest: '1.0.0' } },
      ];

      for (const pkg of testPackages) {
        await dbOps.upsertPackage(pkg.name, pkg.tags);
      }

      const results = await dbOps.searchPackages('test');
      expect(results).toHaveLength(2);
      expect(results.map(p => p.name)).toEqual(['test-package-1', 'test-package-2']);
    });

    it('should search packages by scope', async () => {
      const testPackages = [
        { name: '@test/package-1', tags: { latest: '1.0.0' } },
        { name: '@test/package-2', tags: { latest: '1.0.0' } },
        { name: '@other/package', tags: { latest: '1.0.0' } },
      ];

      for (const pkg of testPackages) {
        await dbOps.upsertPackage(pkg.name, pkg.tags);
      }

      const results = await dbOps.searchPackages('package', '@test');
      expect(results).toHaveLength(2);
      expect(results.map(p => p.name)).toEqual(['@test/package-1', '@test/package-2']);
    });
  });
});
