import { describe, it, expect } from 'vitest'
import { app } from '../src/index.ts'

describe('Ping Endpoint', () => {
  describe('Root Registry', () => {
    it('should return empty JSON response', async () => {
      const res = await app.request('/-/ping')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
    })

    it('should return npm notice header', async () => {
      const res = await app.request('/-/ping')
      expect(res.status).toBe(200)
      expect(res.headers.get('npm-notice')).toBe('PONG')
    })
  })

  describe('Upstream Registry', () => {
    it('should work on npm upstream path', async () => {
      const res = await app.request('/npm/-/ping')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(res.headers.get('npm-notice')).toBe('PONG')
    })

    it('should work on jsr upstream path', async () => {
      const res = await app.request('/jsr/-/ping')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(res.headers.get('npm-notice')).toBe('PONG')
    })

    it('should work on custom upstream path', async () => {
      const res = await app.request('/custom/-/ping')
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(res.headers.get('npm-notice')).toBe('PONG')
    })
  })
})
