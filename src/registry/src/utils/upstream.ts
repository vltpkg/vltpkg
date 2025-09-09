import { RESERVED_ROUTES } from '../../config.ts'
import type { UpstreamConfig, HonoContext } from '../../types.ts'

/**
 * Validates if an upstream name is allowed (not reserved)
 * @param {string} upstreamName - The upstream name to validate
 * @returns {boolean} True if valid, false if reserved
 */
export function isValidUpstreamName(upstreamName: string): boolean {
  return !RESERVED_ROUTES.includes(upstreamName)
}

/**
 * Gets the upstream configuration by name
 * @param {string} upstreamName - The upstream name
 * @returns {UpstreamConfig | null} The upstream config or null if not found
 */
export function getUpstreamConfig(
  upstreamName: string,
  c: HonoContext,
): UpstreamConfig | null {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return c.env.ORIGIN_CONFIG.upstreams[upstreamName] ?? null
}

/**
 * Gets the default upstream name
 * @returns {string} The default upstream name
 */
export function getDefaultUpstream(c: HonoContext): string {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
  return c.env.ORIGIN_CONFIG.default
}

/**
 * Generates a cache key for upstream package data
 * @param {string} upstreamName - The upstream name
 * @param {string} packageName - The package name
 * @param {string} [version] - The package version (optional)
 * @returns {string} A deterministic hash ID
 */
export function generateCacheKey(
  upstreamName: string,
  packageName: string,
  version?: string,
): string {
  const key =
    version ?
      `${upstreamName}:${packageName}:${version}`
    : `${upstreamName}:${packageName}`

  // Use TextEncoder for cross-platform compatibility
  const encoder = new TextEncoder()
  const data = encoder.encode(key)

  // Convert to base64 using btoa
  const base64 = btoa(String.fromCharCode(...data))

  // Convert base64 to base64url format (replace + with -, / with _, remove =)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Constructs the upstream URL for a package request
 * @param {UpstreamConfig} upstreamConfig - The upstream configuration
 * @param {string} packageName - The package name
 * @param {string} [path] - Additional path segments
 * @returns {string} The full upstream URL
 */
export function buildUpstreamUrl(
  upstreamConfig: UpstreamConfig,
  packageName: string,
  path = '',
): string {
  const baseUrl = upstreamConfig.url.replace(/\/$/, '')
  const encodedPackage = encodeURIComponent(packageName)

  switch (upstreamConfig.type) {
    case 'npm':
    case 'vsr':
      return `${baseUrl}/${encodedPackage}${path ? `/${path}` : ''}`
    case 'jsr':
      // JSR has a different URL structure
      return `${baseUrl}/${encodedPackage}${path ? `/${path}` : ''}`
    case 'local':
      return `${baseUrl}/${encodedPackage}${path ? `/${path}` : ''}`
    default:
      return `${baseUrl}/${encodedPackage}${path ? `/${path}` : ''}`
  }
}
