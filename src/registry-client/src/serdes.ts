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

import { engine } from './env.js'

// these aren't used if we couldn't determine the engine type & version
export const serializedHeader =
  engine ?
    `${engine.name}-serialize-${parseInt(engine.version.replace(/[^0-9]/g, ' ').trim(), 10)}`
  : undefined

export { deserialize, serialize } from 'node:v8'
