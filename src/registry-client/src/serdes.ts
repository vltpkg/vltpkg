/* eslint-disable @typescript-eslint/no-unnecessary-condition */

/**
 * This tiny module abstracts out the v8-specific serialization mechanism,
 * so that we can swap out based on platform.
 *
 * Bun, Deno, and Node all export serialize/deserialize from the `node:v8`
 * built-in module, but only Deno and Node are v8, Bun uses JSC's wire format.
 *
 * Any change to the serialization format is a semver-major change,
 * but not every major-version bump is a serialization change. So, this is
 * somewhat more conservative than necessary, but saves us having to track
 * which major versions changed the serialization wire format.
 */

const isNode =
  typeof process?.versions === 'object' && !!process.versions
//@ts-expect-error
const isDeno = !isNode && typeof Deno === 'object' && !!Deno
const isBun =
  //@ts-expect-error
  !isNode && !isDeno && typeof Bun === 'object' && !!Bun

const engineVersion: string | undefined =
  isNode ? process.versions.v8
    //@ts-expect-error
  : isDeno ? Deno.version.v8
    //@ts-expect-error
  : isBun ? Bun.version
  : undefined

const engineName =
  isNode || isDeno ? 'v8'
  : isBun ? 'bun'
  : undefined

const engineMajor = parseInt(
  engineVersion?.replace(/[^0-9]/g, ' ').trim() ?? '',
  10,
)

// these aren't used if we couldn't determine the engine type & version
export const serializedHeader =
  engineName && engineMajor ?
    `${engineName}-serialize-${engineMajor}`
  : undefined

export { deserialize, serialize } from 'node:v8'
