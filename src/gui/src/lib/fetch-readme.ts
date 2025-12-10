import { Effect } from 'effect'
import { HttpClient } from '@effect/platform'
import { parseReadme } from '@/lib/parse-readme.ts'
import {
  HttpClientNoTracing,
  withErrorTracking,
  API_TIMEOUT_MS,
} from '@/lib/external-info.ts'
import { getRepoOrigin } from '@/utils/get-repo-url.ts'

import type { Spec } from '@vltpkg/spec/browser'
import type { NormalizedManifest } from '@vltpkg/types'
import type { PartialError } from '@/lib/external-info.ts'

/**
 * Finds the actual README filename in a directory (case-insensitive).
 * Returns the actual filename if found, or undefined.
 */
const findReadmeFilename = async (
  packageDir: string,
): Promise<string | undefined> => {
  try {
    const res = await fetch('/fs/ls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: packageDir }),
    })

    if (!res.ok) return undefined

    let rawResponse: unknown = await res.json()

    // Handle double-encoded JSON (server returns JSON string)
    if (typeof rawResponse === 'string') {
      try {
        rawResponse = JSON.parse(rawResponse) as unknown
      } catch {
        return undefined
      }
    }

    const files = rawResponse as { name: string; type: string }[]

    if (!Array.isArray(files)) return undefined

    // Find a file that matches "readme" (case-insensitive) with common extensions
    const readmeFile = files.find(
      file =>
        file.type === 'file' &&
        /^readme\.(md|txt|markdown|mdown)$/i.test(file.name),
    )

    // If no extension match, try just "readme" (no extension)
    if (!readmeFile) {
      const readmeNoExt = files.find(
        file => file.type === 'file' && /^readme$/i.test(file.name),
      )
      return readmeNoExt?.name
    }

    return readmeFile.name
  } catch {
    return undefined
  }
}

/**
 * Fetches README from unpkg for external packages.
 * Parses relative paths to point to GitHub.
 */
export const fetchReadmeExternal = ({
  packageName,
  packageVersion,
  repository,
  reference,
  directory,
}: {
  packageName: string
  packageVersion: string
  repository: { org: string; repo: string }
  reference?: string
  directory?: string
}) =>
  Effect.gen(function* () {
    if (!reference) return undefined

    const httpClient = yield* HttpClient.HttpClient

    const res = yield* httpClient
      .get(
        `https://unpkg.com/${packageName}@${packageVersion}/README.md`,
      )
      .pipe(
        Effect.catchTags({
          RequestError: () => Effect.succeed(undefined),
          ResponseError: () => Effect.succeed(undefined),
        }),
      )

    if (!res) return undefined

    const text = yield* res.text

    if (!text || typeof text !== 'string') return undefined

    return yield* Effect.tryPromise({
      try: () => parseReadme(text, repository, reference, directory),
      catch: () =>
        new Error(`Failed to parse ${packageName}'s README.md`),
    }).pipe(Effect.catchAll(() => Effect.succeed(undefined)))
  }).pipe(
    // Add timeout to prevent hanging on slow/unresponsive servers
    Effect.timeoutFail({
      duration: API_TIMEOUT_MS,
      onTimeout: () => new Error('README fetch timed out'),
    }),
  )

/**
 * Fetches README from local node_modules via the server's /fs/read endpoint.
 * Handles case variations by finding the actual filename in the directory.
 * For local packages, we don't need to transform relative paths since
 * the content is served locally.
 */
export const fetchReadmeLocal = ({
  packageLocation,
  projectRoot,
}: {
  packageLocation: string
  projectRoot: string
}): Effect.Effect<string | undefined, unknown> =>
  Effect.tryPromise({
    try: async () => {
      // Construct the package directory path
      // packageLocation is like "./node_modules/express"
      // projectRoot is the absolute path to the project
      const packageDir = `${projectRoot}/${packageLocation.replace(/^\.\//, '')}`

      // Find the actual README filename (handles case variations)
      const readmeFilename = await findReadmeFilename(packageDir)

      if (!readmeFilename) return undefined

      const readmePath = `${packageDir}/${readmeFilename}`

      const res = await fetch('/fs/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: readmePath, encoding: 'utf8' }),
      })

      if (!res.ok) return undefined

      let data: unknown = await res.json()

      // Handle double-encoded JSON (server returns JSON string)
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data) as unknown
        } catch {
          return undefined
        }
      }

      const typedData = data as { content?: string }

      if (!typedData.content) return undefined

      // For local packages, return the raw markdown without URL transformation
      // The GUI will render it as-is, and relative paths will work locally
      return typedData.content
    },
    catch: () => new Error('Failed to fetch local README'),
  }).pipe(
    Effect.catchAll(() => Effect.succeed(undefined)),
    Effect.timeoutFail({
      duration: API_TIMEOUT_MS,
      onTimeout: () => new Error('Local README fetch timed out'),
    }),
  )

export type ReadmeInfo = {
  readme?: string
  partialErrors?: PartialError[]
}

/**
 * Internal Effect that fetches README for a package spec.
 * For local packages, pass packageLocation and projectRoot to fetch from node_modules.
 * For external packages, fetches from unpkg with URL transformation.
 */
const fetchReadmeEffect = ({
  spec,
  manifest,
  packageLocation,
  projectRoot,
}: {
  spec: Spec
  manifest?: NormalizedManifest
  packageLocation?: string
  projectRoot?: string
}): Effect.Effect<ReadmeInfo, never, HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const finalSpec = spec.final
    const isLocalPackage = !!packageLocation && !!projectRoot

    // Get repository details for URL transformation
    const repoDetails =
      manifest?.repository ?
        getRepoOrigin(manifest.repository)
      : undefined

    // Determine which fetch strategy to use
    const readmeResult =
      isLocalPackage && packageLocation && projectRoot ?
        // Local package: fetch from node_modules
        yield* withErrorTracking(
          fetchReadmeLocal({ packageLocation, projectRoot }),
          'readme',
        )
      : manifest?.version && repoDetails ?
        // External package: fetch from unpkg with URL transformation
        yield* withErrorTracking(
          fetchReadmeExternal({
            packageName: finalSpec.name,
            packageVersion: manifest.version,
            repository: repoDetails,
            reference:
              (manifest as { gitHead?: string }).gitHead ||
              manifest.version,
            directory:
              (
                manifest.repository &&
                typeof manifest.repository === 'object' &&
                'directory' in manifest.repository
              ) ?
                (manifest.repository as { directory: string })
                  .directory
              : undefined,
          }),
          'readme',
        )
        // No valid parameters for either strategy
      : { data: undefined, error: undefined }

    // Collect partial errors
    const partialErrors: PartialError[] = []
    if (readmeResult.error) {
      partialErrors.push(readmeResult.error)
    }

    return {
      readme: readmeResult.data,
      ...(partialErrors.length > 0 ? { partialErrors } : {}),
    }
  })

/**
 * Fetches the README for a given package.
 * Returns the README content as a string, or undefined if not found.
 * Handles both local packages (from node_modules) and external packages (from unpkg).
 * Never rejects - errors are captured in the returned object.
 */
export const fetchReadme = ({
  spec,
  manifest,
  packageLocation,
  projectRoot,
}: {
  spec: Spec
  manifest?: NormalizedManifest
  packageLocation?: string
  projectRoot?: string
}): Promise<ReadmeInfo> =>
  Effect.runPromise(
    fetchReadmeEffect({
      spec,
      manifest,
      packageLocation,
      projectRoot,
    }).pipe(Effect.provide(HttpClientNoTracing)),
  )
