import { ORIGIN_CONFIG, RESERVED_ROUTES } from '../../config.ts'
import type {
  UpstreamConfig,
  ParsedPackageInfo,
} from '../../types.ts'

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
): UpstreamConfig | null {
  return ORIGIN_CONFIG.upstreams[upstreamName] ?? null
}

/**
 * Gets the default upstream name
 * @returns {string} The default upstream name
 */
export function getDefaultUpstream(): string {
  return ORIGIN_CONFIG.default
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
 * Parses a request path to extract package information
 * @param {string} path - The request path
 * @returns {ParsedPackageInfo} Parsed package info
 */
export function parsePackageSpec(path: string): ParsedPackageInfo {
  // Remove leading slash and split by '/'
  const segments = path.replace(/^\/+/, '').split('/')

  // Handle different path patterns
  if (segments.length === 0) {
    return { packageName: '', segments }
  }

  // Check if first segment is an upstream name
  const firstSegment = segments[0]
  if (ORIGIN_CONFIG.upstreams[firstSegment]) {
    // Path starts with upstream name: /upstream/package/version
    const upstream = firstSegment
    const packageSegments = segments.slice(1)

    if (packageSegments.length === 0) {
      return { upstream, packageName: '', segments: packageSegments }
    }

    // Handle scoped packages: @scope/package
    if (
      packageSegments[0]?.startsWith('@') &&
      packageSegments.length > 1
    ) {
      const packageName = `${packageSegments[0]}/${packageSegments[1]}`
      const version = packageSegments[2]
      const remainingSegments = packageSegments.slice(2)
      return {
        upstream,
        packageName,
        version,
        segments: remainingSegments,
      }
    }

    // Handle regular packages
    const packageName = packageSegments[0]
    const version = packageSegments[1]
    const remainingSegments = packageSegments.slice(1)
    return {
      upstream,
      packageName,
      version,
      segments: remainingSegments,
    }
  }

  // No upstream in path, treat as package name
  if (firstSegment?.startsWith('@') && segments.length > 1) {
    // Scoped package: @scope/package/version
    const packageName = `${segments[0]}/${segments[1]}`
    const version = segments[2]
    const remainingSegments = segments.slice(2)
    return { packageName, version, segments: remainingSegments }
  }

  // Regular package: package/version
  const packageName = segments[0]
  const version = segments[1]
  const remainingSegments = segments.slice(1)
  return { packageName, version, segments: remainingSegments }
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

/**
 * Checks if proxying is enabled for an upstream
 * @param {string} upstreamName - The upstream name
 * @returns {boolean} True if proxying is enabled
 */
export function isProxyEnabled(upstreamName: string): boolean {
  const config = getUpstreamConfig(upstreamName)
  return config !== null && config.type !== 'local'
}
