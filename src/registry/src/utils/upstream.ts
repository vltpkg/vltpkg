import { ORIGIN_CONFIG, RESERVED_ROUTES } from '../../config.ts'
import type { UpstreamConfig, ParsedPackageInfo } from '../../types.ts'

/**
 * Validates if an upstream name is allowed (not reserved)
 * @param upstreamName - The upstream name to validate
 * @returns True if valid, false if reserved
 */
export function isValidUpstreamName(upstreamName: string): boolean {
  return !RESERVED_ROUTES.includes(upstreamName)
}

/**
 * Gets the upstream configuration by name
 * @param upstreamName - The upstream name
 * @returns The upstream config or null if not found
 */
export function getUpstreamConfig(upstreamName: string): UpstreamConfig | null {
  return ORIGIN_CONFIG.upstreams[upstreamName] || null
}

/**
 * Gets the default upstream name
 * @returns The default upstream name
 */
export function getDefaultUpstream(): string {
  return ORIGIN_CONFIG.default
}

/**
 * Generates a cache key for upstream package data
 * @param upstreamName - The upstream name
 * @param packageName - The package name
 * @param version - The package version (optional)
 * @returns A deterministic hash ID
 */
export function generateCacheKey(upstreamName: string, packageName: string, version?: string): string {
  const key = version ? `${upstreamName}:${packageName}:${version}` : `${upstreamName}:${packageName}`
  return Buffer.from(key).toString('base64url')
}

/**
 * Parses a request path to extract package information
 * @param path - The request path
 * @returns Parsed package info
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
    if (packageSegments[0]?.startsWith('@') && packageSegments.length > 1) {
      const packageName = `${packageSegments[0]}/${packageSegments[1]}`
      const version = packageSegments[2]
      const remainingSegments = packageSegments.slice(2)
      return { upstream, packageName, version, segments: remainingSegments }
    }

    // Handle regular packages
    const packageName = packageSegments[0]
    const version = packageSegments[1]
    const remainingSegments = packageSegments.slice(1)
    return { upstream, packageName, version, segments: remainingSegments }
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
 * @param upstreamConfig - The upstream configuration
 * @param packageName - The package name
 * @param path - Additional path segments
 * @returns The full upstream URL
 */
export function buildUpstreamUrl(upstreamConfig: UpstreamConfig, packageName: string, path: string = ''): string {
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
 * @param upstreamName - The upstream name
 * @returns True if proxying is enabled
 */
export function isProxyEnabled(upstreamName: string): boolean {
  const config = getUpstreamConfig(upstreamName)
  return config !== null && config.type !== 'local'
}
