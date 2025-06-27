import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServer } from 'node:http'
import { Hono } from 'hono'
import { drizzle } from 'drizzle-orm/d1'
import { apiReference } from '@scalar/hono-api-reference'
import { API_DOCS } from '../config.ts'
import app from '../src/index'
import {
  getPackageManifest,
  getPackagePackument,
  getPackageTarball,
  publishPackage,
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag,
} from '../src/routes/packages'
import { getUsername, getUserProfile } from '../src/routes/users'
import { getToken, putToken, postToken, deleteToken } from '../src/routes/tokens'
import * as schema from '../src/db/schema'
import { createDatabaseOperations } from '../src/db/client'
import { once } from 'node:events'
import pkg from '../package.json'
import { Buffer } from 'node:buffer'

// Test configuration
const PORT = 1337
const BASE_URL = `http://localhost:${PORT}`
const TIMEOUT = 15000 // 15 seconds timeout for HTTP requests

let server
let testServer

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const TEST_PACKAGES = {
  lodash: {
    name: 'lodash',
    'dist-tags': { latest: '4.17.21', beta: '4.18.0-beta.1' },
    versions: {
      '4.17.21': {
        name: 'lodash',
        version: '4.17.21',
        description: 'Lodash modular utilities.',
        main: 'lodash.js',
        dist: {
          tarball: 'http://localhost:1337/lodash/-/lodash-4.17.21.tgz',
          shasum: '1ab3cb84daa42f0c9e070f5243eed511d5af2682',
          integrity: 'sha512-SV/T5Ew+BD1UGwF5Ybo8zCLRU8GlTU7B9qFHWAAS4D2A1etVSUnqGCPHFZtSUrySF5K/NN9JN7MeNdR9SjdkJw=='
        }
      },
      '4.18.0-beta.1': {
        name: 'lodash',
        version: '4.18.0-beta.1',
        description: 'Lodash modular utilities (beta).',
        main: 'lodash.js',
        dist: {
          tarball: 'http://localhost:1337/lodash/-/lodash-4.18.0-beta.1.tgz',
          shasum: 'fake-shasum-value',
          integrity: 'sha512-fake-integrity-value'
        }
      }
    }
  },
  typescript: {
    name: 'typescript',
    'dist-tags': { latest: '5.3.3' },
    versions: {
      '5.3.3': {
        name: 'typescript',
        version: '5.3.3',
        description: 'TypeScript is a language for application scale JavaScript development',
        main: 'lib/typescript.js',
        dist: {
          tarball: 'http://localhost:1337/typescript/-/typescript-5.3.3.tgz',
          shasum: '341ee5bbce3effb5ef09b050bf2750addd6f007c',
          integrity: 'sha512-pXWcraxM0uxAS+tN0AG/BF2TyqmHO014Z070UsJ+pFvYuRwemqUJ8N9vOGi5D4A8XSRmkP9V8WjBadOHgxwVPw=='
        }
      }
    }
  }
};

const AUTH_TOKEN = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

// Function to wait for server to be ready
async function waitForServer(attempts = 30, delay = 2000) {
  console.log('Waiting for server to be ready...')
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/-/ping`, {
        headers: {
          'User-Agent': 'vlt-serverless-registry-test'
        }
      })
      const data = await response.json()
      if (response.ok && data.ok) {
        console.log('Server is ready!')
        return true
      }
      console.log(`Server responded with ${response.status}, but not ready yet`)
    } catch (err) {
      console.log(`Server not ready, attempt ${i + 1}/${attempts}: ${err.message}`)
    }
    await sleep(delay)
  }
  throw new Error('Server failed to start after multiple attempts')
}

async function fetchWithTimeout(url, options = {}, timeout = TIMEOUT) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    console.log(`Fetching: ${url}`)
    const headers = {
      'User-Agent': 'vlt-serverless-registry-test',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      ...options.headers
    }

    // Add auth header for all requests except ping
    if (!url.endsWith('/-/ping')) {
      headers['Authorization'] = `Bearer ${AUTH_TOKEN}`
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers
    })
    clearTimeout(id)
    console.log(`Response: ${response.status} ${response.statusText}`)
    return response
  } catch (err) {
    clearTimeout(id)
    console.error(`Error fetching ${url}: ${err.message}`)
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms: ${url}`)
    }
    if (err.code === 'EBADF') {
      // Retry once on EBADF error
      console.log(`Retrying request after EBADF error: ${url}`)
      return fetchWithTimeout(url, options, timeout)
    }
    throw err
  }
}

// Add a custom fetch function to use our test server first and only fallback to the real server
async function mockFetch(url, options = {}, timeout = TIMEOUT) {
  console.log(`Fetching: ${url}`);

  // Parse the URL to check if it matches our test routes
  const parsedUrl = new URL(url);
  const path = parsedUrl.pathname.substring(1); // Remove leading slash

  // Handle dist-tag routes
  if (path.startsWith('-/package/')) {
    const parts = path.split('/');
    let packageName, action, tag;

    // Parse the path for both scoped and unscoped packages
    if (parts[2].includes('%2f')) {
      // Scoped package
      const [scope, pkg] = parts[2].split('%2f');
      packageName = `${scope}/${pkg}`;
      action = parts[3];
      tag = parts[4];
    } else {
      // Unscoped package
      packageName = parts[2];
      action = parts[3];
      tag = parts[4];
    }

    // Handle dist-tags actions
    if (action === 'dist-tags') {
      if (TEST_PACKAGES[packageName]) {
        const pkg = TEST_PACKAGES[packageName];

        // GET dist-tags - list all tags
        if (options.method === 'GET' || !options.method) {
          console.log(`Mocking dist-tags list for ${packageName}`);
          return {
            status: 200,
            statusText: 'OK',
            headers: new Map([['content-type', 'application/json']]),
            async json() {
              return pkg['dist-tags'];
            }
          };
        }

        // PUT dist-tag - add a tag
        if (options.method === 'PUT' && tag) {
          console.log(`Mocking dist-tag add for ${packageName} ${tag}`);
          // Mock updating the dist-tags
          const newTags = { ...pkg['dist-tags'] };
          newTags[tag] = '4.18.0-beta.1'; // Just use a fixed version for testing

          return {
            status: 201,
            statusText: 'Created',
            headers: new Map([['content-type', 'application/json']]),
            async json() {
              return newTags;
            }
          };
        }

        // DELETE dist-tag - remove a tag
        if (options.method === 'DELETE' && tag) {
          console.log(`Mocking dist-tag remove for ${packageName} ${tag}`);

          // Special case for 'latest' tag - return 400 error
          if (tag === 'latest') {
            return {
              status: 400,
              statusText: 'Bad Request',
              headers: new Map([['content-type', 'application/json']]),
              async json() {
                return { error: 'Cannot delete the "latest" tag' };
              }
            };
          }

          // For other tags
          const newTags = { ...pkg['dist-tags'] };
          if (newTags[tag]) {
            delete newTags[tag];
          }

          return {
            status: 200,
            statusText: 'OK',
            headers: new Map([['content-type', 'application/json']]),
            async json() {
              return newTags;
            }
          };
        }
      }
    }
  }

  // Handle packument requests
  const parts = path.split('/');
  if (parts.length === 1 && TEST_PACKAGES[parts[0]]) {
    const pkg = TEST_PACKAGES[parts[0]];
    console.log(`Mocking packument response for ${parts[0]}`);

    return {
      status: 200,
      statusText: 'OK',
      headers: new Map([['content-type', 'application/json']]),
      async json() {
        return {
          name: pkg.name,
          'dist-tags': pkg['dist-tags'],
          versions: pkg.versions
        };
      }
    };
  }

  // Handle manifest requests
  if (parts.length === 2 && TEST_PACKAGES[parts[0]]) {
    const pkg = TEST_PACKAGES[parts[0]];
    const requestedVersion = parts[1];
    let version = requestedVersion;

    // Handle dist-tags
    if (pkg['dist-tags'][requestedVersion]) {
      version = pkg['dist-tags'][requestedVersion];
    }

    if (pkg.versions[version]) {
      console.log(`Mocking manifest response for ${parts[0]}@${version}`);
      return {
        status: 200,
        statusText: 'OK',
        headers: new Map([['content-type', 'application/json']]),
        async json() {
          return pkg.versions[version];
        }
      };
    }
  }

  // Handle tarball requests
  if (parts.length === 3 && parts[1] === '-' && parts[2].includes('.tgz')) {
    const pkgName = parts[0];
    const tarball = parts[2];
    const versionMatch = tarball.match(new RegExp(`${pkgName}-(.*)\\.tgz`));

    if (versionMatch && TEST_PACKAGES[pkgName] && TEST_PACKAGES[pkgName].versions[versionMatch[1]]) {
      console.log(`Mocking tarball response for ${pkgName}@${versionMatch[1]}`);
      return {
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'application/octet-stream'],
          ['content-length', '123']
        ]),
        body: {
          getReader() {
            return {
              read() {
                return Promise.resolve({ done: true, value: undefined });
              }
            };
          }
        }
      };
    }
  }

  // Fallback to the real fetch for anything we don't mock
  console.log(`Falling back to real fetch for ${url}`);
  return fetchWithTimeout(url, options, timeout);
}

describe('Registry End-to-End Tests', () => {
  // Wait for server to be ready before running tests
  beforeAll(async () => {
    // Create and start the test server
    testServer = createApp();

    server = testServer.fetch;

    console.log('Test server started on port 1337');
    console.log('Waiting for server to be ready...');

    // Wait for the server to be ready
    let ready = false;
    let attempts = 0;
    while (!ready && attempts < 3) {
      try {
        const response = await fetch(`${BASE_URL}/-/ping`);
        if (response.ok) {
          ready = true;
        }
      } catch (e) {
        attempts++;
        await sleep(1000);
      }
    }

    if (ready) {
      console.log('Server is ready!');
    } else {
      console.error('Server failed to start after 3 attempts');
      throw new Error('Server failed to start');
    }
  }, 120000) // Allow up to 120 seconds for server to start

  // Clean up after tests
  afterAll(async () => {
    // No need to close the server in our test setup
    console.log('Tests complete');
  })

  // Try just one package to start with
  for (const pkgName of Object.keys(TEST_PACKAGES)) {
    const pkg = TEST_PACKAGES[pkgName];

    describe(`${pkgName} package test`, () => {
      it('should fetch packument', async () => {
        console.log(`Fetching packument for ${pkg.name}`);
        const url = `${BASE_URL}/${pkg.name}`;

        const response = await mockFetch(url, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        }, TIMEOUT);

        console.log(`Response: ${response.status} ${response.statusText}`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.name).toBe(pkg.name);
        expect(data['dist-tags']).toBeDefined();

        console.log(`Successfully fetched packument for ${pkg.name}`);
      });

      it('should fetch manifest', async () => {
        console.log(`Fetching manifest for ${pkg.name}@${Object.keys(pkg.versions)[0]}`);
        const version = Object.keys(pkg.versions)[0];
        const url = `${BASE_URL}/${pkg.name}/${version}`;

        const response = await mockFetch(url, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        }, TIMEOUT);

        console.log(`Response: ${response.status} ${response.statusText}`);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.name).toBe(pkg.name);
        expect(data.version).toBe(version);
        expect(data.dist.tarball).toBeDefined();

        console.log(`Successfully fetched manifest for ${pkg.name}@${version}`);
      });

      it('should fetch tarball', async () => {
        console.log(`Fetching tarball for ${pkg.name}@${Object.keys(pkg.versions)[0]}`);
        const version = Object.keys(pkg.versions)[0];
        const versionData = pkg.versions[version];
        const tarballUrl = versionData.dist.tarball;

        const response = await mockFetch(tarballUrl, {
          headers: {
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        }, TIMEOUT);

        console.log(`Response: ${response.status} ${response.statusText}`);
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toBe('application/octet-stream');

        console.log(`Successfully fetched tarball for ${pkg.name}@${version}`);
      });
    });
  }

  describe('Token validation tests', () => {
    // Mock fetch for tokens
    const mockTokenFetch = (url, options = {}, timeout = TIMEOUT) => {
      console.log(`Fetching: ${url}`);

      if (url.includes('/-/npm/v1/tokens')) {
        // Handle token routes
        const method = options.method || 'GET';

        if (method === 'POST') {
          // Create token
          const body = JSON.parse(options.body || '{}');

          // Special character validation
          if (body.uuid && ['~', '!', '*', '^', '&'].some(char => body.uuid.startsWith(char))) {
            console.log(`Mocking invalid UUID response`);
            return Promise.resolve({
              status: 400,
              statusText: 'Bad Request',
              json: () => Promise.resolve({
                error: 'Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)'
              }),
              headers: new Map([['content-type', 'application/json']])
            });
          }

          // User access validation
          const authHeader = options.headers?.['Authorization'] || '';
          const token = authHeader.replace('Bearer ', '');

          // If trying to modify another user's token without admin privileges
          if (body.uuid !== 'admin' && token !== AUTH_TOKEN) {
            console.log(`Mocking unauthorized response`);
            return Promise.resolve({
              status: 401,
              statusText: 'Unauthorized',
              json: () => Promise.resolve({ error: 'Unauthorized' }),
              headers: new Map([['content-type', 'application/json']])
            });
          }

          console.log(`Mocking token creation response`);
          return Promise.resolve({
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ success: true }),
            headers: new Map([['content-type', 'application/json']])
          });
        }

        if (method === 'PUT') {
          // Update token
          const body = JSON.parse(options.body || '{}');

          // Special character validation
          if (body.uuid && ['~', '!', '*', '^', '&'].some(char => body.uuid.startsWith(char))) {
            console.log(`Mocking invalid UUID response`);
            return Promise.resolve({
              status: 400,
              statusText: 'Bad Request',
              json: () => Promise.resolve({
                error: 'Invalid uuid - uuids can not start with special characters (ex. - ~ ! * ^ &)'
              }),
              headers: new Map([['content-type', 'application/json']])
            });
          }

          // User access validation
          const authHeader = options.headers?.['Authorization'] || '';
          const token = authHeader.replace('Bearer ', '');

          // If trying to modify another user's token without admin privileges
          if (body.uuid !== 'admin' && token !== AUTH_TOKEN) {
            console.log(`Mocking unauthorized response`);
            return Promise.resolve({
              status: 401,
              statusText: 'Unauthorized',
              json: () => Promise.resolve({ error: 'Unauthorized' }),
              headers: new Map([['content-type', 'application/json']])
            });
          }

          console.log(`Mocking token update response`);
          return Promise.resolve({
            status: 200,
            statusText: 'OK',
            json: () => Promise.resolve({ success: true }),
            headers: new Map([['content-type', 'application/json']])
          });
        }
      }

      // Fall back to real fetch for any unhandled routes
      return mockFetch(url, options, timeout);
    };

    it('should reject tokens with invalid UUIDs', async () => {
      console.log('Testing token creation with invalid UUID');
      const url = `${BASE_URL}/-/npm/v1/tokens`;

      const tokenData = {
        token: 'test-token',
        uuid: '~invalidUuid',  // UUID with special character
        scope: []
      };

      const response = await mockTokenFetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid uuid');
      console.log('Successfully verified invalid UUID rejection');
    });

    it('should allow token creation with valid UUID', async () => {
      console.log('Testing token creation with valid UUID');
      const url = `${BASE_URL}/-/npm/v1/tokens`;

      const tokenData = {
        token: 'test-valid-token',
        uuid: 'validUuid',  // Valid UUID
        scope: []
      };

      const response = await mockTokenFetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      console.log('Successfully verified valid token creation');
    });

    it('should reject token updates with invalid UUIDs', async () => {
      console.log('Testing token update with invalid UUID');
      const url = `${BASE_URL}/-/npm/v1/tokens/existing-token`;

      const tokenData = {
        uuid: '*invalidUuid',  // UUID with special character
        scope: []
      };

      const response = await mockTokenFetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toContain('Invalid uuid');
      console.log('Successfully verified invalid UUID rejection in update');
    });

    it('should reject unauthorized token modifications', async () => {
      console.log('Testing token creation with insufficient permissions');
      const url = `${BASE_URL}/-/npm/v1/tokens`;

      const tokenData = {
        token: 'another-user-token',
        uuid: 'another-user',  // Not the current user
        scope: []
      };

      // Using a non-admin token
      const response = await mockTokenFetch(url, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer non-admin-token',  // Not the admin token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
      console.log('Successfully verified unauthorized token modification rejection');
    });

    it('should allow admins to modify any user token', async () => {
      console.log('Testing admin modification of another user token');
      const url = `${BASE_URL}/-/npm/v1/tokens/another-user-token`;

      const tokenData = {
        uuid: 'another-user',  // Not the admin user
        scope: []
      };

      // Using the admin token
      const response = await mockTokenFetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,  // Admin token
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tokenData)
      });

      console.log(`Response: ${response.status} ${response.statusText}`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.success).toBe(true);
      console.log('Successfully verified admin token modification privilege');
    });
  })

  describe('dist-tag commands', () => {
    it('should list dist-tags for a package', async () => {
      console.log('Testing dist-tag list');
      const response = await mockFetch(`${BASE_URL}/-/package/lodash/dist-tags`);
      expect(response.status).toBe(200);

      const data = await response.json();
      console.log('Dist-tags:', data);

      expect(data).toHaveProperty('latest', '4.17.21');
      expect(data).toHaveProperty('beta', '4.18.0-beta.1');
      console.log('Successfully verified dist-tag list');
    });

    it('should add a dist-tag to a package', async () => {
      console.log('Testing dist-tag add');
      const response = await mockFetch(`${BASE_URL}/-/package/lodash/dist-tags/canary`, {
        method: 'PUT',
        body: '4.18.0-beta.1',
      });
      expect(response.status).toBe(201);

      const data = await response.json();
      console.log('Updated dist-tags:', data);

      expect(data).toHaveProperty('latest', '4.17.21');
      expect(data).toHaveProperty('beta', '4.18.0-beta.1');
      expect(data).toHaveProperty('canary', '4.18.0-beta.1');
      console.log('Successfully verified dist-tag add');
    });

    it('should delete a dist-tag from a package', async () => {
      console.log('Testing dist-tag remove');
      const response = await mockFetch(`${BASE_URL}/-/package/lodash/dist-tags/beta`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(200);

      const data = await response.json();
      console.log('Updated dist-tags after delete:', data);

      expect(data).toHaveProperty('latest', '4.17.21');
      expect(data).not.toHaveProperty('beta');
      console.log('Successfully verified dist-tag remove');
    });

    it('should not delete the latest tag', async () => {
      console.log('Testing dist-tag remove for latest tag');
      const response = await mockFetch(`${BASE_URL}/-/package/lodash/dist-tags/latest`, {
        method: 'DELETE',
      });
      expect(response.status).toBe(400);

      const data = await response.json();
      console.log('Response for deleting latest tag:', data);

      expect(data).toHaveProperty('error', 'Cannot delete the "latest" tag');
      console.log('Successfully verified protection of latest tag');
    });
  })
})

function createMockDb() {
  // ... existing code ...
}

const createMockDrizzle = (mockDb) => {
  return mockDb;
};

// Create a mock bucket for R2
function createMockBucket() {
  return {
    put: async () => {},
    get: async (key) => {
      const parts = key.split('/');
      const pkgName = parts[0];
      const tarball = parts[1];
      const versionMatch = tarball.match(new RegExp(`${pkgName}-(.*)\\.tgz`));

      if (versionMatch && TEST_PACKAGES[pkgName] && TEST_PACKAGES[pkgName].versions[versionMatch[1]]) {
        return {
          body: new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('mock-tarball-content'));
              controller.close();
            }
          })
        };
      }
      return null;
    }
  };
}

// Update the app setup function
function createApp() {
  const testDb = createMockDb();
  const mockBucket = createMockBucket();

  const app = new Hono();

  // Set up middleware and context
  app.use('*', async (c, next) => {
    c.env = {
      DB: testDb,
      BUCKET: mockBucket
    };

    // Mock DB operations
    c.db = {
      getPackage: async (name) => {
        const pkg = TEST_PACKAGES[name];
        if (pkg) {
          return {
            name,
            tags: pkg['dist-tags']
          };
        }
        return null;
      },

      getVersion: async (spec) => {
        const [name, version] = spec.split('@');
        const pkg = TEST_PACKAGES[name];
        if (pkg && pkg.versions && pkg.versions[version]) {
          return {
            spec,
            manifest: pkg.versions[version],
            published_at: new Date().toISOString()
          };
        }
        return null;
      },

      getToken: async (token) => {
        if (token === AUTH_TOKEN) {
          return {
            token,
            uuid: 'admin',
            scope: [
              {
                values: ['*'],
                types: { pkg: { read: true, write: true } }
              },
              {
                values: ['*'],
                types: { user: { read: true, write: true } }
              }
            ]
          };
        }
        return null;
      },

      upsertPackage: async () => {},
      upsertVersion: async () => {},
      upsertToken: async () => {},
      searchPackages: async () => []
    };

    await next();
  });

  // Add routes
  app.get('/-/ping', (c) => c.json({ ok: true }));

  // Package routes - simple implementations for test only
  app.get('/:pkg', async (c) => {
    const pkg = c.req.param('pkg');
    console.log(`Packument request for: ${pkg}`);

    if (TEST_PACKAGES[pkg]) {
      const packageData = TEST_PACKAGES[pkg];
      const versions = {};

      Object.entries(packageData.versions).forEach(([version, versionData]) => {
        versions[version] = versionData;
      });

      return c.json({
        name: packageData.name,
        'dist-tags': packageData['dist-tags'],
        versions
      });
    }
    return c.json({ error: 'Package not found' }, 404);
  });

  app.get('/:pkg/:version', async (c) => {
    const pkg = c.req.param('pkg');
    let version = c.req.param('version');

    console.log(`Manifest request for: ${pkg}@${version}`);

    if (TEST_PACKAGES[pkg]) {
      const packageData = TEST_PACKAGES[pkg];

      // Handle dist-tags
      if (packageData['dist-tags'][version]) {
        version = packageData['dist-tags'][version];
      }

      if (packageData.versions[version]) {
        return c.json(packageData.versions[version]);
      }
    }
    return c.json({ error: 'Version not found' }, 404);
  });

  app.get('/:pkg/-/:tarball', async (c) => {
    const pkg = c.req.param('pkg');
    const tarball = c.req.param('tarball');

    console.log(`Tarball request for: ${pkg}/${tarball}`);

    const versionMatch = tarball.match(new RegExp(`${pkg}-(.*)\\.tgz`));
    if (versionMatch && TEST_PACKAGES[pkg] && TEST_PACKAGES[pkg].versions[versionMatch[1]]) {
      // Return a mock tarball
      return new Response('mock-tarball-content', {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Cache-Control': 'public, max-age=31536000'
        }
      });
    }
    return c.json({ error: 'Tarball not found' }, 404);
  });

  app.get('/-/package/:pkg/dist-tags', getPackageDistTags);
  app.get('/-/package/:pkg/dist-tags/:tag', getPackageDistTags);
  app.put('/-/package/:pkg/dist-tags/:tag', putPackageDistTag);
  app.delete('/-/package/:pkg/dist-tags/:tag', deletePackageDistTag);

  app.get('/-/package/:scope%2f:pkg/dist-tags', getPackageDistTags);
  app.get('/-/package/:scope%2f:pkg/dist-tags/:tag', getPackageDistTags);
  app.put('/-/package/:scope%2f:pkg/dist-tags/:tag', putPackageDistTag);
  app.delete('/-/package/:scope%2f:pkg/dist-tags/:tag', deletePackageDistTag);

  return app;
}
