import { Spec } from '@vltpkg/spec'
import type { Dependency } from './dependencies.ts'
import type { Manifest } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec'

/**
 * When adding new dependencies, it's very common to not have a dependency
 * name directly available to reference, e.g: `file:local/folder` or
 * `remote:tarball-url.tgz`. In these cases, a placeholder `(unknown)` name
 * is used in the `Spec` object and the `add` Map structure that holds
 * references to added dependencies will use the stringified spec as a key.
 *
 * This helper function fixes unknown names in the `add` map by replacing
 * placeholder specs with the correct names from the provided manifest.
 */
export const fixupAddedNames = (
  add: Map<string, Dependency> | undefined,
  manifest: Pick<Manifest, 'name'> | undefined,
  options: SpecOptions,
  spec: Spec,
): Spec => {
  // Handle nameless dependencies
  if (add && manifest?.name && spec.name === '(unknown)') {
    const s: Dependency | undefined = add.get(String(spec))
    if (s) {
      // removes the previous, placeholder entry key
      add.delete(String(spec))
      // replaces spec with a version with the correct name
      spec = Spec.parse(manifest.name, spec.bareSpec, options)
      // updates the add map with the fixed up spec
      const n = {
        type: s.type,
        spec,
      }
      add.set(manifest.name, n)
    }
  }
  return spec
}
