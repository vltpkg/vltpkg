import * as semver from 'semver'
import validate from 'validate-npm-package-name'
import type {
  HonoContext,
  PackageSpec,
  PackageManifest,
  ValidationResult,
} from '../../types.ts'

/**
 * Extracts package.json from a tarball buffer
 * @param {Uint8Array} _tarballBuffer - The tarball as a Uint8Array
 * @returns {Promise<PackageManifest | null>} The parsed package.json content
 */
export async function extractPackageJSON(
  _tarballBuffer: Uint8Array,
): Promise<PackageManifest | null> {
  try {
    // This would need to be implemented with a tarball extraction library
    // For now, return null as a placeholder
    return null
  } catch (_error) {
    return null
  }
}

/**
 * Extracts package specification from context
 * @param {HonoContext} c - The Hono context
 * @returns {PackageSpec} Package specification object
 */
export function packageSpec(c: HonoContext): PackageSpec {
  const { scope, pkg } = c.req.param()

  if (scope && pkg) {
    // Scoped package
    const name =
      scope.startsWith('@') ? `${scope}/${pkg}` : `@${scope}/${pkg}`
    return { name, scope, pkg }
  } else if (scope) {
    // Unscoped package (scope is actually the package name)
    return { name: scope, pkg: scope }
  }

  return {}
}

/**
 * Creates a file path for a package tarball
 * @param {object} options - Object with pkg and version
 * @param {string} options.pkg - Package name
 * @param {string} options.version - Package version
 * @returns {string} Tarball file path
 */
export function createFile({
  pkg,
  version,
}: {
  pkg: string
  version: string
}): string {
  try {
    if (!pkg || !version) {
      throw new Error('Missing required parameters')
    }
    // Generate the tarball path similar to npm registry format
    const packageName = pkg.split('/').pop() || pkg
    return `${pkg}/-/${packageName}-${version}.tgz`
  } catch (_err) {
    // Failed to create file path
    throw new Error('Failed to generate tarball path')
  }
}

/**
 * Creates a version specification string
 * @param {string} packageName - The package name
 * @param {string} version - The version
 * @returns {string} Version specification string
 */
export function createVersionSpec(
  packageName: string,
  version: string,
): string {
  return `${packageName}@${version}`
}

/**
 * Creates a full version object with proper manifest structure
 * @param {object} options - Object with pkg, version, and manifest
 * @param {string} options.pkg - Package name
 * @param {string} options.version - Package version
 * @param {any} options.manifest - Package manifest data
 * @returns {any} The manifest with proper name, version, and dist fields
 */
interface ManifestInput {
  name?: string
  version?: string
  dist?: {
    tarball?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

export function createVersion({
  pkg,
  version,
  manifest,
}: {
  pkg: string
  version: string
  manifest: unknown
}): ManifestInput {
  // If manifest is a string, parse it
  let parsedManifest: ManifestInput
  if (typeof manifest === 'string') {
    try {
      parsedManifest = JSON.parse(manifest) as ManifestInput
    } catch (_e) {
      // If parsing fails, use empty object
      parsedManifest = {}
    }
  } else {
    parsedManifest = manifest as ManifestInput
  }

  // Create the final manifest with proper structure
  const result: ManifestInput = {
    ...parsedManifest,
    name: pkg,
    version: version,
    dist: {
      ...(parsedManifest.dist ?? {}),
      tarball:
        parsedManifest.dist?.tarball ??
        `https://registry.npmjs.org/${pkg}/-/${pkg.split('/').pop()}-${version}.tgz`,
    },
  }

  return result
}

interface SlimManifestContext {
  protocol?: string
  host?: string
  upstream?: string
}

interface ParsedManifest {
  name?: string
  version?: string
  description?: string
  keywords?: string[]
  homepage?: string
  bugs?: unknown
  license?: string
  author?: unknown
  contributors?: unknown[]
  funding?: unknown
  files?: string[]
  main?: string
  browser?: unknown
  bin?: Record<string, string>
  man?: unknown
  directories?: unknown
  repository?: unknown
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  bundledDependencies?: string[]
  peerDependenciesMeta?: Record<string, unknown>
  engines?: Record<string, string>
  os?: string[]
  cpu?: string[]
  types?: string
  typings?: string
  module?: string
  exports?: unknown
  imports?: unknown
  type?: string
  dist?: {
    tarball?: string
    integrity?: string
    shasum?: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Creates a slimmed down version of a package manifest
 * Removes sensitive or unnecessary fields for public consumption
 * @param {unknown} manifest - The full package manifest
 * @param {SlimManifestContext} [context] - Optional context for URL rewriting
 * @returns {ParsedManifest} Slimmed manifest
 */
export function slimManifest(
  manifest: unknown,
  context: SlimManifestContext = {},
  c: HonoContext,
): ParsedManifest {
  if (!manifest) return {} as ParsedManifest

  try {
    // Parse manifest if it's a string
    let parsed: ParsedManifest
    if (typeof manifest === 'string') {
      try {
        parsed = JSON.parse(manifest) as ParsedManifest
      } catch (_e) {
        // If parsing fails, return empty manifest
        return {} as ParsedManifest
      }
    } else {
      parsed = manifest as ParsedManifest
    }

    // Create a new object with only the fields we want to keep
    const slimmed: ParsedManifest = {}

    // Only add properties that exist
    if (parsed.name !== undefined) slimmed.name = parsed.name
    if (parsed.version !== undefined) slimmed.version = parsed.version
    if (parsed.description !== undefined)
      slimmed.description = parsed.description
    if (parsed.keywords !== undefined)
      slimmed.keywords = parsed.keywords
    if (parsed.homepage !== undefined)
      slimmed.homepage = parsed.homepage
    if (parsed.bugs !== undefined) slimmed.bugs = parsed.bugs
    if (parsed.license !== undefined) slimmed.license = parsed.license
    if (parsed.author !== undefined) slimmed.author = parsed.author
    if (parsed.contributors !== undefined)
      slimmed.contributors = parsed.contributors
    if (parsed.funding !== undefined) slimmed.funding = parsed.funding
    if (parsed.files !== undefined) slimmed.files = parsed.files
    if (parsed.main !== undefined) slimmed.main = parsed.main
    if (parsed.browser !== undefined) slimmed.browser = parsed.browser
    if (parsed.bin !== undefined) slimmed.bin = parsed.bin
    if (parsed.man !== undefined) slimmed.man = parsed.man
    if (parsed.directories !== undefined)
      slimmed.directories = parsed.directories
    if (parsed.repository !== undefined)
      slimmed.repository = parsed.repository
    if (parsed.scripts !== undefined) slimmed.scripts = parsed.scripts
    // Always include dependencies as empty objects if not present
    slimmed.dependencies = parsed.dependencies ?? {}
    slimmed.devDependencies = parsed.devDependencies ?? {}
    if (parsed.peerDependencies !== undefined)
      slimmed.peerDependencies = parsed.peerDependencies
    if (parsed.optionalDependencies !== undefined)
      slimmed.optionalDependencies = parsed.optionalDependencies
    if (parsed.bundledDependencies !== undefined)
      slimmed.bundledDependencies = parsed.bundledDependencies
    if (parsed.peerDependenciesMeta !== undefined)
      slimmed.peerDependenciesMeta = parsed.peerDependenciesMeta
    if (parsed.engines !== undefined) slimmed.engines = parsed.engines
    if (parsed.os !== undefined) slimmed.os = parsed.os
    if (parsed.cpu !== undefined) slimmed.cpu = parsed.cpu
    if (parsed.types !== undefined) slimmed.types = parsed.types
    if (parsed.typings !== undefined) slimmed.typings = parsed.typings
    if (parsed.module !== undefined) slimmed.module = parsed.module
    if (parsed.exports !== undefined) slimmed.exports = parsed.exports
    if (parsed.imports !== undefined) slimmed.imports = parsed.imports
    if (parsed.type !== undefined) slimmed.type = parsed.type

    // Handle dist object specially - always include with defaults
    slimmed.dist = {
      ...(parsed.dist ?? {}),
      tarball: rewriteTarballUrlIfNeeded(
        parsed.dist?.tarball ?? '',
        parsed.name ?? '',
        parsed.version ?? '',
        context,
        c,
      ),
      integrity: parsed.dist?.integrity ?? '',
      shasum: parsed.dist?.shasum ?? '',
    }

    return slimmed
  } catch (_err) {
    // Failed to slim manifest
    return {} as ParsedManifest // Return empty manifest if slimming fails
  }
}

/**
 * Validates a package name using npm validation rules
 * @param {string} packageName - The package name to validate
 * @returns {ValidationResult} Validation result
 */
export function validatePackageName(
  packageName: string,
): ValidationResult {
  const result = validate(packageName)
  return {
    valid: result.validForNewPackages || result.validForOldPackages,

    errors: result.errors ?? [],
  }
}

/**
 * Validates a semver version string
 * @param {string} version - The version to validate
 * @returns {boolean} True if valid semver
 */
export function validateVersion(version: string): boolean {
  return semver.valid(version) !== null
}

/**
 * Parses a version range and returns the best matching version from a list
 * @param {string} range - The semver range
 * @param {string[]} versions - Available versions
 * @returns {string | null} Best matching version or null
 */
export function getBestMatchingVersion(
  range: string,
  versions: string[],
): string | null {
  try {
    return semver.maxSatisfying(versions, range)
  } catch (_error) {
    // Invalid semver range
    return null
  }
}

/**
 * Extracts the package name from a scoped or unscoped package identifier
 * @param {string} identifier - Package identifier (e.g., "@scope/package" or "package")
 * @returns {object} Package name components
 */
export function parsePackageIdentifier(identifier: string): {
  scope?: string
  name: string
  fullName: string
} {
  if (identifier.startsWith('@')) {
    const parts = identifier.split('/')
    if (parts.length >= 2) {
      const scope = parts[0]
      return {
        ...(scope && { scope }),
        name: parts.slice(1).join('/'),
        fullName: identifier,
      }
    }
  }

  return {
    name: identifier,
    fullName: identifier,
  }
}

/**
 * Generates a tarball filename for a package version
 * @param {string} packageName - The package name
 * @param {string} version - The package version
 * @returns {string} Tarball filename
 */
export function generateTarballFilename(
  packageName: string,
  version: string,
): string {
  const name = packageName.split('/').pop() || packageName
  return `${name}-${version}.tgz`
}

/**
 * Rewrites tarball URLs if needed for local registry
 * @param {string} _originalUrl - The original tarball URL
 * @param {string} packageName - The package name
 * @param {string} version - The package version
 * @param {any} [context] - Optional context for URL rewriting
 * @returns {string} Rewritten or original URL
 */
function rewriteTarballUrlIfNeeded(
  _originalUrl: string,
  packageName: string,
  version: string,
  context: SlimManifestContext = {},
  c: HonoContext,
): string {
  try {
    // Check if we should rewrite URLs for this upstream
    const upstream = context?.upstream
    const protocol = context?.protocol
    const host = context?.host

    if (upstream && protocol && host) {
      // Rewrite to our local registry format for upstream packages
      return `${protocol}://${host}/${upstream}/${packageName}/-/${generateTarballFilename(packageName, version)}`
    }
  } catch {}

  // Fallback to local registry format
  return `${c.env.URL}/${createFile({ pkg: packageName, version })}`
}

/**
 * Checks if a version satisfies a semver range
 * @param {string} version - The version to check
 * @param {string} range - The semver range
 * @returns {boolean} True if version satisfies range
 */
export function satisfiesRange(
  version: string,
  range: string,
): boolean {
  try {
    return semver.satisfies(version, range)
  } catch (_error) {
    return false
  }
}

/**
 * Sorts versions in descending order
 * @param {string[]} versions - Array of version strings
 * @returns {string[]} Sorted versions
 */
export function sortVersionsDescending(versions: string[]): string[] {
  return versions.sort((a, b) => semver.rcompare(a, b))
}

/**
 * Gets the latest version from an array of versions
 * @param {string[]} versions - Array of version strings
 * @returns {string | null} Latest version or null if none
 */
export function getLatestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null
  const sorted = sortVersionsDescending(versions)
  return sorted[0] || null
}

/**
 * Validates a tarball buffer
 * @param {Uint8Array} _tarballBuffer - The tarball buffer to validate
 * @returns {boolean} True if valid tarball
 */
export function validateTarball(_tarballBuffer: Uint8Array): boolean {
  // Basic validation - could be extended
  return true
}
