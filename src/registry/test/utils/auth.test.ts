import { describe, it, expect, vi } from 'vitest'
import {
  getTokenFromHeader,
  parseTokenAccess,
} from '../../src/utils/auth.ts'
import type { HonoContext, TokenScope } from '../../types.ts'

describe('Auth Utils', () => {
  describe('getTokenFromHeader', () => {
    it('should extract token from Bearer authorization header', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer test-token-12345'),
        },
      } as unknown as HonoContext

      const token = getTokenFromHeader(mockContext)
      expect(token).toBe('test-token-12345')
      expect(mockContext.req.header).toHaveBeenCalledWith(
        'Authorization',
      )
    })

    it('should handle Bearer token with extra whitespace', () => {
      const mockContext = {
        req: {
          header: vi
            .fn()
            .mockReturnValue('Bearer   test-token-with-spaces   '),
        },
      } as unknown as HonoContext

      const token = getTokenFromHeader(mockContext)
      expect(token).toBe('test-token-with-spaces')
    })

    it('should return null for missing authorization header', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue(undefined),
        },
      } as unknown as HonoContext

      const token = getTokenFromHeader(mockContext)
      expect(token).toBeNull()
    })

    it('should return null for non-Bearer authorization header', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Basic dXNlcjpwYXNz'),
        },
      } as unknown as HonoContext

      const token = getTokenFromHeader(mockContext)
      expect(token).toBeNull()
    })

    it('should return empty string for malformed Bearer header', () => {
      const mockContext = {
        req: {
          header: vi.fn().mockReturnValue('Bearer '),
        },
      } as unknown as HonoContext

      const token = getTokenFromHeader(mockContext)
      expect(token).toBe('')
    })
  })

  describe('parseTokenAccess', () => {
    it('should parse read-only access for any package', () => {
      const scope: TokenScope[] = [
        {
          types: { pkg: { read: true, write: false } },
          values: ['*'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        uuid: 'test-user-uuid',
      })

      expect(access.anyPackage).toBe(true)
      expect(access.specificPackage).toBe(false)
      expect(access.readAccess).toBe(true)
      expect(access.writeAccess).toBe(false)
      expect(access.methods).toEqual(['get'])
    })

    it('should parse write access for specific package', () => {
      const scope: TokenScope[] = [
        {
          types: { pkg: { read: false, write: true } },
          values: ['my-package'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        pkg: 'my-package',
        uuid: 'test-user-uuid',
      })

      expect(access.anyPackage).toBe(false)
      expect(access.specificPackage).toBe(true)
      expect(access.readAccess).toBe(false)
      expect(access.writeAccess).toBe(true)
      expect(access.methods).toEqual(['put', 'post', 'delete'])
    })

    it('should parse user-specific access', () => {
      const scope: TokenScope[] = [
        {
          types: { user: { read: true, write: true } },
          values: ['~test-user-uuid'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        uuid: 'test-user-uuid',
      })

      expect(access.anyUser).toBe(false)
      expect(access.specificUser).toBe(true)
      expect(access.readAccess).toBe(true)
      expect(access.writeAccess).toBe(true)
      expect(access.methods).toEqual(['get', 'put', 'post', 'delete'])
    })

    it('should parse wildcard user access', () => {
      const scope: TokenScope[] = [
        {
          types: { user: { read: true, write: false } },
          values: ['*'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        uuid: 'any-user-uuid',
      })

      expect(access.anyUser).toBe(true)
      expect(access.specificUser).toBe(false)
      expect(access.readAccess).toBe(true)
      expect(access.writeAccess).toBe(false)
    })

    it('should handle multiple scopes with combined permissions', () => {
      const scope: TokenScope[] = [
        {
          types: { pkg: { read: true, write: false } },
          values: ['package-1'],
        },
        {
          types: { pkg: { read: false, write: true } },
          values: ['package-1'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        pkg: 'package-1',
        uuid: 'test-user-uuid',
      })

      expect(access.specificPackage).toBe(true)
      expect(access.readAccess).toBe(true)
      expect(access.writeAccess).toBe(true)
      expect(access.methods).toEqual(['get', 'put', 'post', 'delete'])
    })

    it('should handle empty scope array', () => {
      const scope: TokenScope[] = []

      const access = parseTokenAccess({
        scope,
        uuid: 'test-user-uuid',
      })

      expect(access.anyUser).toBe(false)
      expect(access.specificUser).toBe(false)
      expect(access.anyPackage).toBe(false)
      expect(access.specificPackage).toBe(false)
      expect(access.readAccess).toBe(false)
      expect(access.writeAccess).toBe(false)
      expect(access.methods).toEqual([])
    })

    it('should handle scope with no matching package', () => {
      const scope: TokenScope[] = [
        {
          types: { pkg: true, user: false },
          values: ['other-package'],
          methods: ['get', 'put'],
        },
      ]

      const access = parseTokenAccess({
        scope,
        pkg: 'my-package',
        uuid: 'test-user-uuid',
      })

      expect(access.specificPackage).toBe(false)
      expect(access.readAccess).toBe(false)
      expect(access.writeAccess).toBe(false)
      expect(access.methods).toEqual([])
    })
  })
})
