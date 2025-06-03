import type { SpecOptions } from '@vltpkg/spec'
import { Spec } from '@vltpkg/spec'

/**
 * If the final spec is unnamed, infer a name by slugifying the bareSpec.
 *
 * This is a bit less "correct" than how install does it, because we don't
 * actually need to get the "true" name from the manifest, we just need
 * something intelligible that works, and will want to avoid the performance
 * hit of having to fetch the manifest a second time, especially for git
 * deps where that can be quite slow.
 */
export const inferName = (
  s: Spec | string,
  options: SpecOptions,
): Spec => {
  const spec = typeof s === 'string' ? Spec.parseArgs(s, options) : s
  const { name } = spec
  return !name || name === '(unknown)' ?
      Spec.parse(
        spec.bareSpec
          .replace(/[^a-zA-Z0-9/]/g, ' ')
          .trim()
          .replace(/ /g, '-')
          .replace('/', '§'),
        spec.bareSpec,
        spec.options,
      )
    : spec
}
