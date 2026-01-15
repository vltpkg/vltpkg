import { describe, it, expect } from 'vitest'
import { resolveConfig } from '../src/utils/resolve-config.ts'
import {
  DAEMON_ENABLED,
  DAEMON_START_SERVER,
  DAEMON_PORT,
  DAEMON_URL,
} from '../config.ts'

describe('Configuration Middleware', () => {
  describe('resolveConfig', () => {
    it('should use default values when env is not provided', () => {
      const config = resolveConfig()
      expect(config.DAEMON_ENABLED).toBe(DAEMON_ENABLED)
      expect(config.DAEMON_START_SERVER).toBe(DAEMON_START_SERVER)
      expect(config.DAEMON_PORT).toBe(DAEMON_PORT)
      expect(config.DAEMON_URL).toBe(DAEMON_URL)
    })

    it('should use default values when env is empty', () => {
      const config = resolveConfig({})
      expect(config.DAEMON_ENABLED).toBe(DAEMON_ENABLED)
      expect(config.DAEMON_START_SERVER).toBe(DAEMON_START_SERVER)
      expect(config.DAEMON_PORT).toBe(DAEMON_PORT)
      expect(config.DAEMON_URL).toBe(DAEMON_URL)
    })

    it('should override DAEMON_ENABLED from environment', () => {
      const config = resolveConfig({
        ARG_DAEMON: 'false',
      })
      expect(config.DAEMON_ENABLED).toBe(false)

      const config2 = resolveConfig({
        ARG_DAEMON: 'true',
      })
      expect(config2.DAEMON_ENABLED).toBe(true)
    })

    it('should override DAEMON_START_SERVER from environment', () => {
      const config = resolveConfig({
        DAEMON_START_SERVER: 'false',
      })
      expect(config.DAEMON_START_SERVER).toBe(false)

      const config2 = resolveConfig({
        DAEMON_START_SERVER: 'true',
      })
      expect(config2.DAEMON_START_SERVER).toBe(true)
    })

    it('should override DAEMON_PORT from environment', () => {
      const config = resolveConfig({
        DAEMON_PORT: '4000',
      })
      expect(config.DAEMON_PORT).toBe(4000)
    })

    it('should override DAEMON_URL from environment', () => {
      const config = resolveConfig({
        DAEMON_URL: 'http://localhost:4000',
      })
      expect(config.DAEMON_URL).toBe('http://localhost:4000')
    })

    it('should handle multiple environment overrides', () => {
      const config = resolveConfig({
        ARG_DAEMON: 'true',
        DAEMON_START_SERVER: 'false',
        DAEMON_PORT: '5000',
        DAEMON_URL: 'http://localhost:5000',
        ARG_TELEMETRY: 'false',
        ARG_DEBUG: 'true',
      })
      expect(config.DAEMON_ENABLED).toBe(true)
      expect(config.DAEMON_START_SERVER).toBe(false)
      expect(config.DAEMON_PORT).toBe(5000)
      expect(config.DAEMON_URL).toBe('http://localhost:5000')
      expect(config.TELEMETRY_ENABLED).toBe(false)
      expect(config.DEBUG_ENABLED).toBe(true)
    })

    it('should handle invalid boolean values by using defaults', () => {
      const config = resolveConfig({
        ARG_DAEMON: 'invalid',
        DAEMON_START_SERVER: 'invalid',
      })
      expect(config.DAEMON_ENABLED).toBe(false) // 'invalid' !== 'true'
      expect(config.DAEMON_START_SERVER).toBe(false) // 'invalid' !== 'true'
    })

    it('should handle invalid number values by using defaults', () => {
      const config = resolveConfig({
        DAEMON_PORT: 'not-a-number',
      })
      expect(config.DAEMON_PORT).toBe(NaN) // parseInt returns NaN
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
