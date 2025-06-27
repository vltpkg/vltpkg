import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getPackageDistTags,
  putPackageDistTag,
  deletePackageDistTag
} from '../src/routes/packages.js';

describe('Dist-Tag API', () => {
  // Mock database and context
  let mockDb, c;

  beforeEach(() => {
    // Set up mock database
    mockDb = {
      getPackage: vi.fn(),
      upsertPackage: vi.fn(),
      getVersion: vi.fn()
    };

    // Set up mock context
    c = {
      db: mockDb,
      req: {
        param: vi.fn(),
        text: vi.fn()
      },
      json: vi.fn((data, status = 200) => ({ body: data, status })),
      header: vi.fn()
    };
  });

  describe('getPackageDistTags', () => {
    it('should return dist-tags for unscoped packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'test-package' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0', beta: '1.1.0-beta.1' }
      });

      // Call the function
      const result = await getPackageDistTags(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('test-package');
      expect(c.header).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(c.header).toHaveBeenCalledWith('Cache-Control', 'no-cache, no-store, must-revalidate');
      expect(result.body).toEqual({ latest: '1.0.0', beta: '1.1.0-beta.1' });
      expect(result.status).toBe(200);
    });

    it('should return dist-tags for scoped packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ scope: '@scope', pkg: 'test-package' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: '@scope/test-package',
        tags: { latest: '1.0.0', next: '2.0.0-alpha.1' }
      });

      // Call the function
      const result = await getPackageDistTags(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('@scope/test-package');
      expect(result.body).toEqual({ latest: '1.0.0', next: '2.0.0-alpha.1' });
      expect(result.status).toBe(200);
    });

    it('should return 404 for non-existent packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'non-existent-package' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue(null);

      // Call the function
      const result = await getPackageDistTags(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('non-existent-package');
      expect(result.body).toEqual({ error: 'Package not found' });
      expect(result.status).toBe(404);
    });

    it('should return empty dist-tags for packages with no tags', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'test-package' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: null
      });

      // Call the function
      const result = await getPackageDistTags(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('test-package');
      expect(result.body).toEqual({ latest: '' });
      expect(result.status).toBe(200);
    });

    it('should not allow dist-tag operations on proxied packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'proxied-package' }));

      // Mock database response with source=proxy
      mockDb.getPackage.mockResolvedValue({
        name: 'proxied-package',
        tags: { latest: '1.0.0' },
        source: 'proxy'
      });

      // Call the function
      const result = await getPackageDistTags(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('proxied-package');
      expect(result.body).toEqual({ error: 'Cannot perform dist-tag operations on proxied packages' });
      expect(result.status).toBe(403);
    });
  });

  describe('putPackageDistTag', () => {
    it('should add a dist-tag to an unscoped package', async () => {
      // Set up mock params and body
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: 'beta' }));
      c.req.text.mockResolvedValue('1.1.0-beta.1');

      // Mock database responses
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });
      mockDb.getVersion.mockResolvedValue({
        spec: 'test-package@1.1.0-beta.1',
        manifest: '{}'
      });

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('test-package');
      expect(mockDb.getVersion).toHaveBeenCalledWith('test-package@1.1.0-beta.1');
      expect(mockDb.upsertPackage).toHaveBeenCalledWith(
        'test-package',
        { latest: '1.0.0', beta: '1.1.0-beta.1' },
        expect.any(String)
      );
      expect(result.body).toEqual({ latest: '1.0.0', beta: '1.1.0-beta.1' });
      expect(result.status).toBe(201);
    });

    it('should add a dist-tag to a scoped package', async () => {
      // Set up mock params and body
      c.req.param.mockImplementation(() => ({ scope: '@scope', pkg: 'test-package', tag: 'next' }));
      c.req.text.mockResolvedValue('2.0.0-alpha.1');

      // Mock database responses
      mockDb.getPackage.mockResolvedValue({
        name: '@scope/test-package',
        tags: { latest: '1.0.0' }
      });
      mockDb.getVersion.mockResolvedValue({
        spec: '@scope/test-package@2.0.0-alpha.1',
        manifest: '{}'
      });

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('@scope/test-package');
      expect(mockDb.getVersion).toHaveBeenCalledWith('@scope/test-package@2.0.0-alpha.1');
      expect(mockDb.upsertPackage).toHaveBeenCalledWith(
        '@scope/test-package',
        { latest: '1.0.0', next: '2.0.0-alpha.1' },
        expect.any(String)
      );
      expect(result.body).toEqual({ latest: '1.0.0', next: '2.0.0-alpha.1' });
      expect(result.status).toBe(201);
    });

    it('should return 404 for non-existent packages', async () => {
      // Set up mock params and body
      c.req.param.mockImplementation(() => ({ pkg: 'non-existent-package', tag: 'beta' }));
      c.req.text.mockResolvedValue('1.0.0');

      // Mock database response
      mockDb.getPackage.mockResolvedValue(null);

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Package not found' });
      expect(result.status).toBe(404);
    });

    it('should return 404 for non-existent versions', async () => {
      // Set up mock params and body
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: 'beta' }));
      c.req.text.mockResolvedValue('1.1.0-beta.1');

      // Mock database responses
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });
      mockDb.getVersion.mockResolvedValue(null);

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Version 1.1.0-beta.1 not found' });
      expect(result.status).toBe(404);
    });

    it('should not allow dist-tag operations on proxied packages', async () => {
      // Set up mock params and body
      c.req.param.mockImplementation(() => ({ pkg: 'proxied-package', tag: 'beta' }));
      c.req.text.mockResolvedValue('1.0.0');

      // Mock database response with source=proxy
      mockDb.getPackage.mockResolvedValue({
        name: 'proxied-package',
        tags: { latest: '1.0.0' },
        source: 'proxy'
      });

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('proxied-package');
      expect(result.body).toEqual({ error: 'Cannot perform dist-tag operations on proxied packages' });
      expect(result.status).toBe(403);
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });

    it('should reject tag names that are valid semver ranges', async () => {
      // Set up mock params with a tag that's a semver range
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: '>=1.0.0' }));
      c.req.text.mockResolvedValue('1.0.0');

      // Mock database response - we won't get this far
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Call the function
      const result = await putPackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Tag name must not be a valid SemVer range: >=1.0.0' });
      expect(result.status).toBe(400);

      // Make sure we didn't try to update anything
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });

    it('should reject other semver range formats too', async () => {
      // Test with various semver range formats
      const ranges = ['1.x', '^1.0.0', '~1.2', '1.0.0 - 2.0.0', '*'];

      for (const range of ranges) {
        // Set up mock params with a tag that's a semver range
        c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: range }));
        c.req.text.mockResolvedValue('1.0.0');

        // Call the function
        const result = await putPackageDistTag(c);

        // Verify the response
        expect(result.body).toEqual({ error: `Tag name must not be a valid SemVer range: ${range}` });
        expect(result.status).toBe(400);
      }

      // Make sure we didn't try to update anything
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });
  });

  describe('deletePackageDistTag', () => {
    it('should delete a dist-tag from an unscoped package', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: 'beta' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0', beta: '1.1.0-beta.1' }
      });

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('test-package');
      expect(mockDb.upsertPackage).toHaveBeenCalledWith(
        'test-package',
        { latest: '1.0.0' },
        expect.any(String)
      );
      expect(result.body).toEqual({ latest: '1.0.0' });
      expect(result.status).toBe(200);
    });

    it('should delete a dist-tag from a scoped package', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ scope: '@scope', pkg: 'test-package', tag: 'next' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: '@scope/test-package',
        tags: { latest: '1.0.0', next: '2.0.0-alpha.1' }
      });

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('@scope/test-package');
      expect(mockDb.upsertPackage).toHaveBeenCalledWith(
        '@scope/test-package',
        { latest: '1.0.0' },
        expect.any(String)
      );
      expect(result.body).toEqual({ latest: '1.0.0' });
      expect(result.status).toBe(200);
    });

    it('should not allow deleting the latest tag', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: 'latest' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0', beta: '1.1.0-beta.1' }
      });

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Cannot delete the "latest" tag' });
      expect(result.status).toBe(400);
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });

    it('should return 404 for non-existent packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'non-existent-package', tag: 'beta' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue(null);

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Package not found' });
      expect(result.status).toBe(404);
    });

    it('should return 404 for non-existent tags', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'test-package', tag: 'non-existent-tag' }));

      // Mock database response
      mockDb.getPackage.mockResolvedValue({
        name: 'test-package',
        tags: { latest: '1.0.0' }
      });

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(result.body).toEqual({ error: 'Tag non-existent-tag not found' });
      expect(result.status).toBe(404);
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });

    it('should not allow dist-tag operations on proxied packages', async () => {
      // Set up mock params
      c.req.param.mockImplementation(() => ({ pkg: 'proxied-package', tag: 'beta' }));

      // Mock database response with source=proxy
      mockDb.getPackage.mockResolvedValue({
        name: 'proxied-package',
        tags: { latest: '1.0.0', beta: '1.1.0-beta.1' },
        source: 'proxy'
      });

      // Call the function
      const result = await deletePackageDistTag(c);

      // Verify the response
      expect(mockDb.getPackage).toHaveBeenCalledWith('proxied-package');
      expect(result.body).toEqual({ error: 'Cannot perform dist-tag operations on proxied packages' });
      expect(result.status).toBe(403);
      expect(mockDb.upsertPackage).not.toHaveBeenCalled();
    });
  });
});
