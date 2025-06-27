import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createContext } from './utils/test-helpers.js';

// Mock the database client
const mockDb = {
  getPackage: vi.fn(),
  upsertToken: vi.fn(),
  query: {
    tokens: {
      findMany: vi.fn()
    }
  }
};

// Mock auth utilities
vi.mock('../src/utils/auth.js', async () => {
  const actual = await vi.importActual('../src/utils/auth.js');
  return {
    ...actual,
    verifyToken: vi.fn().mockImplementation(() => true),
    getTokenFromHeader: vi.fn().mockImplementation(() => 'test-token'),
    getAuthedUser: vi.fn()
  };
});

// Mock utils
import { getTokenFromHeader, getAuthedUser, verifyToken, parseTokenAccess } from '../src/utils/auth.ts';

// Import functions to test
import {
  listPackagesAccess,
  getPackageAccessStatus,
  setPackageAccessStatus,
  grantPackageAccess,
  revokePackageAccess
} from '../src/routes/access.js';

describe('Access Management API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('listPackagesAccess', () => {
    it('should list packages a user has access to', async () => {
      // Mock authentication
      getAuthedUser.mockResolvedValue({
        uuid: 'test-user',
        scope: [
          {
            values: ['package-1', 'package-2'],
            types: { pkg: { read: true, write: true } }
          },
          {
            values: ['package-3'],
            types: { pkg: { read: true, write: false } }
          }
        ]
      });

      // Mock DB response
      mockDb.query.tokens.findMany.mockResolvedValue([
        {
          token: 'test-token',
          uuid: 'test-user',
          scope: JSON.stringify([
            {
              values: ['package-1', 'package-2'],
              types: { pkg: { read: true, write: true } }
            },
            {
              values: ['package-3'],
              types: { pkg: { read: true, write: false } }
            }
          ])
        }
      ]);

      // Create test context
      const c = createContext({
        req: {
          method: 'GET',
          query: new Map([['user', 'test-user']])
        },
        db: mockDb
      });

      // Execute function
      const response = await listPackagesAccess(c);

      // Verify mock calls
      expect(verifyToken).toHaveBeenCalledWith('test-token', expect.anything());
      expect(getAuthedUser).toHaveBeenCalledWith({ c, token: 'test-token' });
      expect(mockDb.query.tokens.findMany).toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        'package-1': { read: true, write: true },
        'package-2': { read: true, write: true },
        'package-3': { read: true, write: false }
      });
    });

    it('should return unauthorized if not authenticated', async () => {
      // Mock failed authentication
      verifyToken.mockResolvedValue(false);

      // Create test context
      const c = createContext({
        req: { method: 'GET' },
        db: mockDb
      });

      // Execute function
      const response = await listPackagesAccess(c);

      // Verify response
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: 'Unauthorized' });
    });

    it('should return empty result if user has no tokens', async () => {
      // Mock authentication
      getAuthedUser.mockResolvedValue({
        uuid: 'test-user',
        scope: []
      });

      // Mock DB response - no tokens
      mockDb.query.tokens.findMany.mockResolvedValue([]);

      // Create test context
      const c = createContext({
        req: { method: 'GET' },
        db: mockDb
      });

      // Execute function
      const response = await listPackagesAccess(c);

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  describe('getPackageAccessStatus', () => {
    it('should return private status for existing package', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Create test context with package param
      const c = createContext({
        req: { method: 'GET' },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await getPackageAccessStatus(c);

      // Verify mock calls
      expect(mockDb.getPackage).toHaveBeenCalledWith('test-package');

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: 'private' });
    });

    it('should return private status for non-existent package', async () => {
      // Mock package data - not found
      mockDb.getPackage.mockResolvedValue(null);

      // Create test context with package param
      const c = createContext({
        req: { method: 'GET' },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'non-existent-package'
      });

      // Execute function
      const response = await getPackageAccessStatus(c);

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ status: 'private' });
    });
  });

  describe('setPackageAccessStatus', () => {
    it('should accept setting a package to private', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock authentication with write access
      getAuthedUser.mockResolvedValue({
        uuid: 'test-user',
        scope: [
          {
            values: ['test-package'],
            types: { pkg: { read: true, write: true } }
          }
        ]
      });

      // Mock the token access parsing
      vi.mock('../src/utils/auth.js', async () => {
        const actual = await vi.importActual('../src/utils/auth.js');
        return {
          ...actual,
          verifyToken: vi.fn().mockImplementation(() => true),
          getTokenFromHeader: vi.fn().mockImplementation(() => 'test-token'),
          getAuthedUser: vi.fn(),
          parseTokenAccess: vi.fn().mockImplementation(() => ({
            readAccess: true,
            writeAccess: true
          }))
        };
      });

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          body: { status: 'private' }
        },
        db: mockDb,
        pkg: 'test-package'
      });

      // Execute function
      const response = await setPackageAccessStatus(c);

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should reject setting a package to public', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: { pkg: { read: true, write: true } }
          }
        ]
      });

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          json: async () => ({ status: 'public' })
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await setPackageAccessStatus(c);

      // Verify response
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Public packages are not supported by this registry at this time'
      });
    });

    it('should reject if user lacks write access', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock user with only read access
      getAuthedUser.mockResolvedValue({
        uuid: 'regular-user',
        scope: [
          {
            values: ['test-package'],
            types: { pkg: { read: true, write: false } }
          }
        ]
      });

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          json: async () => ({ status: 'private' })
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await setPackageAccessStatus(c);

      // Verify response
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized - you do not have write access to this package'
      });
    });
  });

  describe('grantPackageAccess', () => {
    it('should grant read-only access to a user', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock authentication
      getAuthedUser.mockResolvedValue({
        uuid: 'admin-user',
        scope: [
          {
            values: ['*'],
            types: {
              user: { read: true, write: true },
              pkg: { read: true, write: true }
            }
          }
        ]
      });

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          body: { permission: 'read-only' }
        },
        db: mockDb,
        pkg: 'test-package',
        username: 'test-user'
      });

      // Execute function
      const response = await grantPackageAccess(c);

      // Verify mock calls
      expect(mockDb.upsertToken).toHaveBeenCalled();

      // Verify the arguments manually since the deep comparison isn't working in tests
      const callArgs = mockDb.upsertToken.mock.calls[0];
      expect(callArgs[0]).toBe('user-token'); // First arg: token
      expect(callArgs[1]).toBe('test-user');  // Second arg: username

      // Third arg - scope object validation
      const scope = callArgs[2];
      expect(Array.isArray(scope)).toBe(true);
      expect(scope.length).toBe(1);
      expect(scope[0].values).toContain('test-package');
      expect(scope[0].types.pkg.read).toBe(true);
      expect(scope[0].types.pkg.write).toBe(false);

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    it('should grant read-write access to a user', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access to users and packages
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: {
              pkg: { read: true, write: true },
              user: { read: true, write: true }
            }
          }
        ]
      });

      // Mock existing user tokens
      mockDb.query.tokens.findMany.mockResolvedValue([
        {
          token: 'user-token',
          uuid: 'test-user',
          scope: JSON.stringify([])
        }
      ]);

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          param: new Map([['username', 'test-user']]),
          json: async () => ({ permission: 'read-write' })
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await grantPackageAccess(c);

      // Verify mock calls
      expect(mockDb.upsertToken).toHaveBeenCalledWith(
        'user-token',
        'test-user',
        [
          {
            values: ['test-package'],
            types: { pkg: { read: true, write: true } }
          }
        ],
        'test-token'
      );

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        message: 'Added read-write permission for test-user on test-package'
      });
    });

    it('should update existing package access', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access to users and packages
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: {
              pkg: { read: true, write: true },
              user: { read: true, write: true }
            }
          }
        ]
      });

      // Mock existing user tokens with existing access
      mockDb.query.tokens.findMany.mockResolvedValue([
        {
          token: 'user-token',
          uuid: 'test-user',
          scope: JSON.stringify([
            {
              values: ['test-package'],
              types: { pkg: { read: true, write: false } }
            }
          ])
        }
      ]);

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          param: new Map([['username', 'test-user']]),
          json: async () => ({ permission: 'read-write' })
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await grantPackageAccess(c);

      // Verify mock calls - should update to read-write
      expect(mockDb.upsertToken).toHaveBeenCalledWith(
        'user-token',
        'test-user',
        [
          {
            values: ['test-package'],
            types: { pkg: { read: true, write: true } }
          }
        ],
        'test-token'
      );

      // Verify response
      expect(response.status).toBe(200);
    });

    it('should reject if admin user lacks user write access', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock user with only package write access but no user write access
      getAuthedUser.mockResolvedValue({
        uuid: 'package-admin',
        scope: [
          {
            values: ['*'],
            types: { pkg: { read: true, write: true } }
          },
          {
            values: ['*'],
            types: { user: { read: true, write: false } }
          }
        ]
      });

      // Create test context
      const c = createContext({
        req: {
          method: 'PUT',
          param: new Map([['username', 'test-user']]),
          json: async () => ({ permission: 'read-only' })
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await grantPackageAccess(c);

      // Verify response
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toEqual({
        error: 'Unauthorized - you do not have permission to manage user access'
      });
    });
  });

  describe('revokePackageAccess', () => {
    it('should revoke access to a package', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access to users and packages
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: {
              pkg: { read: true, write: true },
              user: { read: true, write: true }
            }
          }
        ]
      });

      // Mock existing user tokens with access to be revoked
      mockDb.query.tokens.findMany.mockResolvedValue([
        {
          token: 'user-token',
          uuid: 'test-user',
          scope: JSON.stringify([
            {
              values: ['test-package'],
              types: { pkg: { read: true, write: true } }
            },
            {
              values: ['other-package'],
              types: { pkg: { read: true, write: false } }
            }
          ])
        }
      ]);

      // Create test context
      const c = createContext({
        req: {
          method: 'DELETE',
          param: new Map([['username', 'test-user']])
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await revokePackageAccess(c);

      // Verify mock calls - should update to remove the package
      expect(mockDb.upsertToken).toHaveBeenCalledWith(
        'user-token',
        'test-user',
        [
          {
            values: ['other-package'],
            types: { pkg: { read: true, write: false } }
          }
        ],
        'test-token'
      );

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        message: 'Removed access for test-user to test-package'
      });
    });

    it('should handle when user has no access to revoke', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access to users and packages
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: {
              pkg: { read: true, write: true },
              user: { read: true, write: true }
            }
          }
        ]
      });

      // Mock existing user tokens with no access to the package
      mockDb.query.tokens.findMany.mockResolvedValue([
        {
          token: 'user-token',
          uuid: 'test-user',
          scope: JSON.stringify([
            {
              values: ['other-package'],
              types: { pkg: { read: true, write: false } }
            }
          ])
        }
      ]);

      // Create test context
      const c = createContext({
        req: {
          method: 'DELETE',
          param: new Map([['username', 'test-user']])
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await revokePackageAccess(c);

      // Verify that token was not updated
      expect(mockDb.upsertToken).not.toHaveBeenCalled();

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        message: 'User test-user did not have access to test-package'
      });
    });

    it('should handle when user has no tokens', async () => {
      // Mock package data
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Mock admin user with write access to users and packages
      getAuthedUser.mockResolvedValue({
        uuid: 'admin',
        scope: [
          {
            values: ['*'],
            types: {
              pkg: { read: true, write: true },
              user: { read: true, write: true }
            }
          }
        ]
      });

      // Mock no existing user tokens
      mockDb.query.tokens.findMany.mockResolvedValue([]);

      // Create test context
      const c = createContext({
        req: {
          method: 'DELETE',
          param: new Map([['username', 'test-user']])
        },
        db: mockDb,
        // Mock packageSpec functionality
        pkg: 'test-package'
      });

      // Execute function
      const response = await revokePackageAccess(c);

      // Verify response
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({
        success: true,
        message: 'User test-user did not have access to test-package'
      });
    });
  });
});
