/** maps @types/foo to foo and @types/scope__name to @scope/name. */
export const getTypeTarget = (
  name: string | null | undefined,
): string | undefined => {
  if (!name?.startsWith('@types/')) return
  const target = name.slice(7)
  if (!target || target.includes('/')) return
  const separator = target.indexOf('__')
  if (separator === -1) return target
  const scope = target.slice(0, separator)
  const unscoped = target.slice(separator + 2)
  if (!scope || !unscoped) return
  return `@${scope}/${unscoped}`
}
