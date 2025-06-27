import { Buffer } from 'node:buffer'
import * as semver from 'semver'
import validate from 'validate-npm-package-name'
import type {
  HonoContext,
  PackageSpec,
  PackageManifest,
  SlimmedManifest,
  RequestContext,
  ValidationResult,
  FileInfo
} from '../../types.ts'

/**
 * Extracts package.json from a tarball buffer
 * @param tarballBuffer - The tarball as a Buffer
 * @returns The parsed package.json content
 */
export async function extractPackageJSON(tarballBuffer: Buffer): Promise<PackageManifest | null> {
  try {
    // This would need to be implemented with a tarball extraction library
    // For now, return null as a placeholder
    console.log('[PACKAGES] Extracting package.json from tarball')
    return null
  } catch (error) {
    console.error(`[ERROR] Failed to extract package.json: ${(error as Error).message}`)
    return null
  }
}

/**
 * Extracts package specification from context
 * @param c - The Hono context
 * @returns Package specification object
 */
export function packageSpec(c: HonoContext): PackageSpec {
  const { scope, pkg } = c.req.param()

  if (scope && pkg) {
    // Scoped package
    const name = scope.startsWith('@') ? `${scope}/${pkg}` : `@${scope}/${pkg}`
    return { name, scope, pkg }
  } else if (scope) {
    // Unscoped package (scope is actually the package name)
    return { name: scope, pkg: scope }
  }

  return {}
}

/**
 * Creates a file path for a package tarball
 * @param options - Object with pkg and version
 * @returns Tarball file path
 */
export function createFile({ pkg, version }: { pkg: string; version: string }): string {
  try {
    if (!pkg || !version) {
      throw new Error('Missing required parameters')
    }
    // Generate the tarball path similar to npm registry format
    const packageName = pkg.split('/').pop() || pkg
    return `${pkg}/-/${packageName}-${version}.tgz`
  } catch (err) {
    console.error(`[ERROR] Failed to create file path for ${pkg}@${version}: ${(err as Error).message}`)
    throw new Error('Failed to generate tarball path')
  }
}

/**
 * Creates a version specification string
 * @param packageName - The package name
 * @param version - The version
 * @returns Version specification string
 */
export function createVersionSpec(packageName: string, version: string): string {
  return `${packageName}@${version}`
}

/**
 * Creates a full version object with proper manifest structure
 * @param options - Object with pkg, version, and manifest
 * @returns The manifest with proper name, version, and dist fields
 */
export function createVersion({ pkg, version, manifest }: { pkg: string; version: string; manifest: any }): any {
  // If manifest is a string, parse it
  let parsedManifest: any
  if (typeof manifest === 'string') {
    try {
      parsedManifest = JSON.parse(manifest)
    } catch (e) {
      parsedManifest = {}
    }
  } else {
    parsedManifest = manifest || {}
  }

  // Create the final manifest with proper structure
  const result = {
    ...parsedManifest,
    name: pkg,
    version: version,
    dist: {
      ...(parsedManifest.dist || {}),
      tarball: parsedManifest.dist?.tarball || `https://registry.npmjs.org/${pkg}/-/${pkg.split('/').pop()}-${version}.tgz`
    }
  }

  return result
}

/**
 * Creates a slimmed down version of a package manifest
 * Removes sensitive or unnecessary fields for public consumption
 * @param manifest - The full package manifest
 * @param context - Optional context for URL rewriting
 * @returns Slimmed manifest
 */
export function slimManifest(manifest: any, context?: any): any {
  if (!manifest) return {}

  try {
    // Parse manifest if it's a string
    let parsed: any
    if (typeof manifest === 'string') {
      try {
        parsed = JSON.parse(manifest)
      } catch (e) {
        // If parsing fails, use the original
        parsed = manifest
      }
    } else {
      parsed = manifest
    }

    // Create a new object with only the fields we want to keep
    const slimmed: any = {
      name: parsed.name,
      version: parsed.version,
      description: parsed.description,
      keywords: parsed.keywords,
      homepage: parsed.homepage,
      bugs: parsed.bugs,
      license: parsed.license,
      author: parsed.author,
      contributors: parsed.contributors,
      funding: parsed.funding,
      files: parsed.files,
      main: parsed.main,
      browser: parsed.browser,
      bin: parsed.bin || {},
      man: parsed.man,
      directories: parsed.directories,
      repository: parsed.repository,
      scripts: parsed.scripts,
      dependencies: parsed.dependencies || {},
      devDependencies: parsed.devDependencies || {},
      peerDependencies: parsed.peerDependencies || {},
      optionalDependencies: parsed.optionalDependencies || {},
      bundledDependencies: parsed.bundledDependencies,
      peerDependenciesMeta: parsed.peerDependenciesMeta || {},
      engines: parsed.engines || {},
      os: parsed.os || [],
      cpu: parsed.cpu || [],
      types: parsed.types,
      typings: parsed.typings,
      module: parsed.module,
      exports: parsed.exports,
      imports: parsed.imports,
      type: parsed.type,
      dist: {
        ...(parsed.dist || {}),
        tarball: rewriteTarballUrlIfNeeded(parsed.dist?.tarball || '', parsed.name, parsed.version, context),
        integrity: parsed.dist?.integrity || '',
        shasum: parsed.dist?.shasum || ''
      }
    }

    // Only include fields that were actually in the original manifest
    // to avoid empty objects cluttering the response
    Object.keys(slimmed).forEach(key => {
      if (key !== 'dist' && slimmed[key] === undefined) {
        delete slimmed[key]
      }
    })

    return slimmed
  } catch (err) {
    console.error(`[ERROR] Failed to slim manifest: ${(err as Error).message}`)
    return manifest || {} // Return the original if slimming fails
  }
}

/**
 * Validates a package name using npm validation rules
 * @param packageName - The package name to validate
 * @returns Validation result
 */
export function validatePackageName(packageName: string): ValidationResult {
  const result = validate(packageName)
  return {
    valid: result.validForNewPackages || result.validForOldPackages,
    errors: result.errors || []
  }
}

/**
 * Validates a semver version string
 * @param version - The version to validate
 * @returns True if valid semver
 */
export function validateVersion(version: string): boolean {
  return semver.valid(version) !== null
}

/**
 * Parses a version range and returns the best matching version from a list
 * @param range - The semver range
 * @param versions - Available versions
 * @returns Best matching version or null
 */
export function getBestMatchingVersion(range: string, versions: string[]): string | null {
  try {
    return semver.maxSatisfying(versions, range)
  } catch (error) {
    console.error(`[ERROR] Invalid semver range: ${range}`)
    return null
  }
}

/**
 * Extracts the package name from a scoped or unscoped package identifier
 * @param identifier - Package identifier (e.g., "@scope/package" or "package")
 * @returns Package name components
 */
export function parsePackageIdentifier(identifier: string): { scope?: string; name: string; fullName: string } {
  if (identifier.startsWith('@')) {
    const parts = identifier.split('/')
    if (parts.length >= 2) {
      return {
        scope: parts[0],
        name: parts.slice(1).join('/'),
        fullName: identifier
      }
    }
  }

  return {
    name: identifier,
    fullName: identifier
  }
}

/**
 * Generates a tarball filename for a package version
 * @param packageName - The package name
 * @param version - The package version
 * @returns Tarball filename
 */
export function generateTarballFilename(packageName: string, version: string): string {
  const name = packageName.split('/').pop() || packageName
  return `${name}-${version}.tgz`
}

/**
 * Rewrite tarball URLs to point to our registry instead of the original registry
 * Only rewrite if context is provided, otherwise return original URL
 * @param originalUrl - The original tarball URL
 * @param packageName - The package name
 * @param version - The package version
 * @param context - Context containing request info (host, upstream, etc.)
 * @returns The rewritten or original tarball URL
 */
function rewriteTarballUrlIfNeeded(
  originalUrl: string,
  packageName: string,
  version: string,
  context?: any
): string {
  // Only rewrite if we have context indicating this is a proxied request
  if (!context?.upstream || !originalUrl || !packageName || !version) {
    return originalUrl
  }

  try {
    // Extract the protocol and host from the context or use defaults
    const protocol = context.protocol || 'http'
    const host = context.host || 'localhost:1337'
    const upstream = context.upstream

    // Create the new tarball URL pointing to our registry
    const filename = generateTarballFilename(packageName, version)
    const newUrl = `${protocol}://${host}/${upstream}/${packageName}/-/${filename}`

    console.log(`[TARBALL_REWRITE] ${originalUrl} -> ${newUrl}`)
    return newUrl
  } catch (err) {
    console.error(`[ERROR] Failed to rewrite tarball URL: ${(err as Error).message}`)
    return originalUrl
  }
}

/**
 * Checks if a package version satisfies a given semver range
 * @param version - The version to check
 * @param range - The semver range
 * @returns True if version satisfies range
 */
export function satisfiesRange(version: string, range: string): boolean {
  try {
    return semver.satisfies(version, range)
  } catch (error) {
    console.error(`[ERROR] Invalid semver comparison: ${version} vs ${range}`)
    return false
  }
}

/**
 * Sorts versions in descending order (newest first)
 * @param versions - Array of version strings
 * @returns Sorted versions array
 */
export function sortVersionsDescending(versions: string[]): string[] {
  return versions.sort((a, b) => semver.rcompare(a, b))
}

/**
 * Gets the latest version from an array of versions
 * @param versions - Array of version strings
 * @returns Latest version or null if no valid versions
 */
export function getLatestVersion(versions: string[]): string | null {
  const validVersions = versions.filter(v => semver.valid(v))
  if (validVersions.length === 0) return null

  return semver.maxSatisfying(validVersions, '*')
}
