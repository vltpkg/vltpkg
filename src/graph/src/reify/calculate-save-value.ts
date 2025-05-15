import type { Spec } from '@vltpkg/spec'
const SAVE_PREFIX = '^'

export const calculateSaveValue = (
  nodeType: string,
  spec: Spec,
  existing: string | undefined,
  nodeVersion: string | undefined,
): string => {
  if (
    // if not from the registry, save whatever we requested
    nodeType === 'registry' &&
    // if we installed exactly what we already wanted, leave it untouched
    spec.bareSpec !== existing &&
    // if we installed a specific version, keep that specific version.
    !spec.final.range?.isSingle
  ) {
    // if we had a single version, and got that version, then
    // leave it as-is.
    if (existing && existing === nodeVersion) {
      // depend on 1.2.3, got 1.2.3, keep unchanged
      return existing
    } else if (existing && !spec.bareSpec) {
      // if we had `"express": "5.1"` and did `vlt i express`,
      // then leave it as-is, because we just installed our pj dep
      return existing
    } else {
      const finalRange =
        (spec.final.semver && spec.final.bareSpec) ||
        `${SAVE_PREFIX}${nodeVersion}`
      // didn't have dep previously, or depended on a different thing
      // than what was requested. Update with the ^ range based on
      // the node that landed in the graph, but preserve alias prefix
      if (spec.subspec && spec.final.namedRegistry) {
        return `${spec.final.namedRegistry}:${spec.final.name}@${finalRange}`
      }

      if (spec.final.namedJsrRegistry) {
        // if we were given an alternative name, preserve that
        // do this with a regexp because the Spec objects get a little
        // weird here, and the string is relatively straightforward.
        return spec.bareSpec
          .replace(
            new RegExp(
              `^(?:.*?@)?${spec.final.namedJsrRegistry}:(@[^/]+/[^@]+)(@.*?)?$`,
            ),
            `${spec.final.namedJsrRegistry}:$1@${finalRange}`,
          )
          .replace(
            // otherwise, swap out the final version for the save range
            new RegExp(
              `^(?:.*?@)?${spec.final.namedJsrRegistry}:([^@].*?)?$`,
            ),
            `${spec.final.namedJsrRegistry}:${finalRange}`,
          )
      }
      return finalRange
    }
  }
  return spec.bareSpec
}
