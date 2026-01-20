import { describe, it, expect } from 'vitest'
import { resolveConfig } from '../src/utils/resolve-config.ts'

describe('Configuration Middleware', () => {
  describe('resolveConfig', () => {
    it('should handle multiple environment overrides', () => {
      const config = resolveConfig({
        ARG_TELEMETRY: 'false',
        ARG_DEBUG: 'true',
      })
      expect(config.TELEMETRY_ENABLED).toBe(false)
      expect(config.DEBUG_ENABLED).toBe(true)
    })

    it('should preserve other static configuration values', () => {
      const config = resolveConfig()
      expect(config.API_DOCS_ENABLED).toBeDefined()
      expect(config.SENTRY_CONFIG).toBeDefined()
      expect(config.PORT).toBeDefined()
      expect(config.VERSION).toBeDefined()
      expect(config.URL).toBeDefined()
    })
  })
})
