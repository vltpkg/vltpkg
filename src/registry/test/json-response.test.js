import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { jsonResponseHandler } from '../src/utils/response.ts'

describe('JSON Response Handler', () => {
  let app

  beforeEach(() => {
    app = new Hono()
    app.use(jsonResponseHandler())

    // Test endpoint that returns a JSON object
    app.get('/test-json', (c) => {
      return c.json({
        name: 'test-package',
        version: '1.0.0',
        description: 'Test package for JSON formatting',
        author: {
          name: 'Test User',
          email: 'test@example.com'
        },
        keywords: ['test', 'json', 'formatting']
      })
    })
  })

  it('should return pretty-printed JSON by default', async () => {
    const req = new Request('http://localhost/test-json')
    const res = await app.fetch(req)
    const body = await res.text()

    // Should contain newlines and indentation
    expect(body).toContain('\n')
    expect(body).toContain('  ')

    // Should be valid JSON
    const parsed = JSON.parse(body)
    expect(parsed.name).toBe('test-package')
  })

  it('should return minimal JSON when Accept header is application/vnd.npm.install-v1+json', async () => {
    const req = new Request('http://localhost/test-json', {
      headers: {
        'Accept': 'application/vnd.npm.install-v1+json'
      }
    })
    const res = await app.fetch(req)
    const body = await res.text()

    // Should not contain newlines or indentation
    expect(body).not.toContain('\n')
    expect(body).not.toMatch(/\s{2,}/)

    // Should be valid JSON
    const parsed = JSON.parse(body)
    expect(parsed.name).toBe('test-package')
  })

  it('should handle mixed Accept headers containing application/vnd.npm.install-v1+json', async () => {
    const req = new Request('http://localhost/test-json', {
      headers: {
        'Accept': 'application/json, application/vnd.npm.install-v1+json'
      }
    })
    const res = await app.fetch(req)
    const body = await res.text()

    // Should not contain newlines or indentation as install-v1+json is included
    expect(body).not.toContain('\n')
    expect(body).not.toMatch(/\s{2,}/)

    // Should be valid JSON
    const parsed = JSON.parse(body)
    expect(parsed.name).toBe('test-package')
  })
})
