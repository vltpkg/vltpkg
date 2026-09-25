import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
  defaultRegistryName,
  defaultScopeRegistries,
} from '@vltpkg/spec'
import { isRecordStringString } from '@vltpkg/types'
import type { SpecOptions } from '@vltpkg/spec'
import type { GraphModifier } from '../modifiers.ts'
import type { LockfileData, OptionsChange } from './types.ts'
import type { LoadOptions } from './load.ts'

/**
 * Removes entries from `items` that match the corresponding
 * entry in `defaultItems`, returning only non-default values.
 */
const removeDefaultItems = (
  defaultItems: Record<string, string>,
  items: Record<string, string>,
) => {
  const res: Record<string, string> = {}
  for (const [key, value] of Object.entries(items)) {
    if (!defaultItems[key] || defaultItems[key] !== value) {
      res[key] = value
    }
  }
  return res
}

export const hasItems = (o: Record<string, unknown> | undefined) =>
  !!o && Object.keys(o).length > 0

/**
 * The subset of the runtime config that ends up in a lockfile's
 * `options` block.
 */
export type LockfileOptionsSource = SpecOptions &
  Partial<Omit<LoadOptions, keyof SpecOptions | 'modifiers'>> & {
    /**
     * The graph modifiers helper object.
     */
    modifiers?: GraphModifier
  }

/**
 * Builds a normalized options object from the current runtime config
 * using the same cleaning logic as `lockfile/save.ts` so that it can
 * be compared directly against the options stored in a lockfile.
 */
export const currentLockfileOptions = (
  options: LockfileOptionsSource,
): LockfileData['options'] => {
  const cleanModifiers =
    (
      options.modifiers &&
      isRecordStringString(options.modifiers.config)
    ) ?
      options.modifiers.config
    : undefined

  const cleanRegistries =
    isRecordStringString(options.registries) ?
      removeDefaultItems(defaultRegistries, options.registries)
    : undefined

  const cleanScopeRegistries =
    isRecordStringString(options['scoped-registries']) ?
      removeDefaultItems(
        defaultScopeRegistries,
        options['scoped-registries'],
      )
    : undefined

  const cleanJsrRegistries =
    isRecordStringString(options['jsr-registries']) ?
      removeDefaultItems(
        defaultJsrRegistries,
        options['jsr-registries'],
      )
    : undefined

  const cleanGitHosts =
    isRecordStringString(options['git-hosts']) ?
      removeDefaultItems(defaultGitHosts, options['git-hosts'])
    : undefined

  const cleanGitHostArchives =
    isRecordStringString(options['git-host-archives']) ?
      removeDefaultItems(
        defaultGitHostArchives,
        options['git-host-archives'],
      )
    : undefined

  return {
    ...(hasItems(cleanModifiers) ?
      { modifiers: cleanModifiers }
    : {}),
    ...(hasItems(options.catalog) ?
      { catalog: options.catalog }
    : {}),
    ...(hasItems(options.catalogs) ?
      { catalogs: options.catalogs }
    : {}),
    ...(hasItems(cleanScopeRegistries) ?
      { 'scoped-registries': cleanScopeRegistries }
    : undefined),
    ...(hasItems(cleanJsrRegistries) ?
      { 'jsr-registries': cleanJsrRegistries }
    : undefined),
    ...(options.registry !== undefined ?
      { registry: options.registry }
    : undefined),
    ...((
      options['default-registry-alias'] !== undefined &&
      options['default-registry-alias'] !== defaultRegistryName
    ) ?
      { 'default-registry-alias': options['default-registry-alias'] }
    : undefined),
    ...(hasItems(cleanRegistries) ?
      { registries: cleanRegistries }
    : undefined),
    ...(hasItems(cleanGitHosts) ?
      { 'git-hosts': cleanGitHosts }
    : undefined),
    ...(hasItems(cleanGitHostArchives) ?
      { 'git-host-archives': cleanGitHostArchives }
    : undefined),
  }
}

type OptionsValue =
  | string
  | Record<string, string>
  | Record<string, Record<string, string>>
  | undefined

const asRecord = (o: LockfileData['options']) =>
  o as Record<string, OptionsValue>

const unionKeys = (
  a: Record<string, unknown> = {},
  b: Record<string, unknown> = {},
) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()

const diffRecords = (
  section: string,
  from: Record<string, string> = {},
  to: Record<string, string> = {},
  changes: OptionsChange[],
  prefix?: string,
) => {
  for (const key of unionKeys(from, to)) {
    if (from[key] !== to[key]) {
      changes.push({
        section,
        key: prefix === undefined ? key : `${prefix} ${key}`,
        from: from[key],
        to: to[key],
      })
    }
  }
}

/**
 * Compares the current config against the `options` block of a lockfile
 * and returns the entries that differ. The comparison is per entry, so
 * reordering keys in `vlt.json` is not a change.
 */
export const diffLockfileOptions = (
  options: LockfileOptionsSource,
  lockfileOptions: LockfileData['options'] = {},
): OptionsChange[] => {
  const current = asRecord(currentLockfileOptions(options))
  const stored = asRecord(lockfileOptions)
  const changes: OptionsChange[] = []
  for (const section of unionKeys(stored, current)) {
    const from = stored[section]
    const to = current[section]
    if (typeof from === 'string' || typeof to === 'string') {
      if (from !== to) {
        changes.push({
          section,
          from: from as string | undefined,
          to: to as string | undefined,
        })
      }
    } else if (section === 'catalogs') {
      for (const name of unionKeys(from, to)) {
        diffRecords(
          section,
          (
            from as Record<string, Record<string, string>> | undefined
          )?.[name],
          (
            to as Record<string, Record<string, string>> | undefined
          )?.[name],
          changes,
          name,
        )
      }
    } else {
      diffRecords(
        section,
        from as Record<string, string>,
        to as Record<string, string>,
        changes,
      )
    }
  }
  return changes
}
