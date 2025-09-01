import { describe, it, expect, vi } from 'vitest'
import {
  jsonError,
  jsonSuccess,
  notFound,
  unauthorized,
  forbidden,
  internalServerError,
} from '../../src/utils/response.ts'
import type { HonoContext, ApiError } from '../../types.ts'

describe('Response Utils', () => {
  // Mock Hono context
  const createMockContext = () => {
    const mockJson = vi.fn()
    return {
      json: mockJson,
      _mockJson: mockJson, // Keep reference for assertions
    } as unknown as HonoContext & { _mockJson: any }
  }

  describe('jsonError', () => {
    it('should create error response from string message', () => {
      const mockContext = createMockContext()

      jsonError(mockContext, 'Test error message', 400)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Test error message' },
        400,
      )
    })

    it('should create error response from ApiError object', () => {
      const mockContext = createMockContext()
      const errorObj: ApiError = {
        error: 'Validation failed',
        details: 'Invalid package name',
      }

      jsonError(mockContext, errorObj, 422)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        errorObj,
        422,
      )
    })

    it('should use default status code 400 when not provided', () => {
      const mockContext = createMockContext()

      jsonError(mockContext, 'Default error')

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Default error' },
        400,
      )
    })
  })

  describe('jsonSuccess', () => {
    it('should create success response with data', () => {
      const mockContext = createMockContext()
      const data = { name: 'test-package', version: '1.0.0' }

      jsonSuccess(mockContext, data, 200)

      expect(mockContext._mockJson).toHaveBeenCalledWith(data, 200)
    })

    it('should use default status code 200 when not provided', () => {
      const mockContext = createMockContext()
      const data = { success: true }

      jsonSuccess(mockContext, data)

      expect(mockContext._mockJson).toHaveBeenCalledWith(data, 200)
    })

    it('should handle null data', () => {
      const mockContext = createMockContext()

      jsonSuccess(mockContext, null)

      expect(mockContext._mockJson).toHaveBeenCalledWith(null, 200)
    })
  })

  describe('notFound', () => {
    it('should create 404 response with default message', () => {
      const mockContext = createMockContext()

      notFound(mockContext)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Not Found' },
        404,
      )
    })

    it('should create 404 response with custom message', () => {
      const mockContext = createMockContext()

      notFound(mockContext, 'Package not found')

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Package not found' },
        404,
      )
    })
  })

  describe('unauthorized', () => {
    it('should create 401 response with default message', () => {
      const mockContext = createMockContext()

      unauthorized(mockContext)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Unauthorized' },
        401,
      )
    })

    it('should create 401 response with custom message', () => {
      const mockContext = createMockContext()

      unauthorized(mockContext, 'Invalid token')

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Invalid token' },
        401,
      )
    })
  })

  describe('forbidden', () => {
    it('should create 403 response with default message', () => {
      const mockContext = createMockContext()

      forbidden(mockContext)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Forbidden' },
        403,
      )
    })

    it('should create 403 response with custom message', () => {
      const mockContext = createMockContext()

      forbidden(mockContext, 'Insufficient permissions')

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Insufficient permissions' },
        403,
      )
    })
  })

  describe('internalServerError', () => {
    it('should create 500 response with default message', () => {
      const mockContext = createMockContext()

      internalServerError(mockContext)

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Internal Server Error' },
        500,
      )
    })

    it('should create 500 response with custom message', () => {
      const mockContext = createMockContext()

      internalServerError(mockContext, 'Database connection failed')

      expect(mockContext._mockJson).toHaveBeenCalledWith(
        { error: 'Database connection failed' },
        500,
      )
    })
  })
})
