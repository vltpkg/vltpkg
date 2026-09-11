/**
 * Save registry and git host config given on the command line or via
 * `VLT_*` env to `install` / `update`, so that the config files plus the
 * lockfile can reproduce the install.
 * @module
 */

import { error } from '@vltpkg/error-cause'
import {
  defaultGitHostArchives,
  defaultGitHosts,
  defaultJsrRegistries,
  defaultRegistries,
  defaultRegistryName,
} from '@vltpkg/spec'
import type { WhichConfig } from '@vltpkg/vlt-json'
import { find } from '@vltpkg/vlt-json'
import {
  assertRegistryKeys,
  configWriteTarget,
  isRecordField,
  pairsToRecords,
} from './config/index.ts'
import type {
  ConfigFileData,
  ConfigFileLayer,
  LoadedConfig,
} from './config/index.ts'
import {
  registrySelectionFields,
  registrySelectors,
} from './config/merge-layers.ts'
import { normalizeRegistryURL } from './require-registry.ts'

/** The config fields that change how specs are parsed. */
export const specConfigFields = [
  'registry',
  'registries',
  'default-registry-alias',
  'scoped-registries',
  'jsr-registries',
  'git-hosts',
  'git-host-archives',
] as const

export type SpecConfigPersistPlan = {
  which: WhichConfig
  values: ConfigFileData
}

const builtins: Record<string, Record<string, string> | undefined> = {
  registries: defaultRegistries,
  'jsr-registries': defaultJsrRegistries,
  'git-hosts': defaultGitHosts,
  'git-host-archives': defaultGitHostArchives,
}

// git host templates are not urls
const urlFields = new Set([
  'registry',
  'registries',
  'scoped-registries',
  'jsr-registries',
])

const norm = (field: string, v: string) =>
  urlFields.has(field) ? normalizeRegistryURL(v) : v

// a layer's (or command block's) value, `null` meaning absent
const fromLayer = (
  layer: Record<string, unknown> | undefined,
  field: string,
  key?: string,
): string | undefined => {
  const v = layer?.[field]
  const r =
    key === undefined ? v
    : v && typeof v === 'object' ? (v as Record<string, unknown>)[key]
    : undefined
  return typeof r === 'string' ? r : undefined
}

const conflictError = (
  field: string,
  key: string | undefined,
  current: string,
  wanted: string,
  file: string,
  block?: string,
) => {
  const name =
    (block ? `command.${block}.` : '') +
    (key === undefined ? field : `${field}.${key}`)
  const flag =
    key === undefined ?
      `--${field}=${current}`
    : `--${field} ${key}=${current}`
  return error(
    [
      `${name} is already set to ${current} in ${file}.`,
      '',
      `Pass \`${flag}\`${key === undefined ? '' : ', use another name,'} or run`,
      block ?
        '`vlt config edit` to change it first.'
      : `\`vlt config set ${name}=${wanted}\` first.`,
    ].join('\n'),
    { code: 'ECONFIG', found: wanted, wanted: current },
  )
}

const ownsSelection = (layer?: ConfigFileLayer) =>
  registrySelectionFields.some(f => f in (layer ?? {}))

/**
 * The spec config set on the cli / env that the target config file (the
 * project `vlt.json`, unless `--config=user`) should get. Values already
 * in either config file are left alone. Throws `ECONFIG` when the target
 * file (or its `command.<cmd>` block) sets a value to something else, or
 * a value is invalid.
 *
 * Call before installing, write the result after it succeeds.
 */
export const planSpecConfigPersist = (
  conf: LoadedConfig,
): SpecConfigPersistPlan | undefined => {
  const explicit = pairsToRecords(conf.explicit) as Record<
    string,
    unknown
  >
  if (!specConfigFields.some(f => f in explicit)) return undefined
  const which = configWriteTarget(conf, 'project')
  const target = conf.layers[which]
  const other = conf.layers[which === 'project' ? 'user' : 'project']
  // a project that owns selection drops the user's selectors
  const otherSelectors = which === 'user' || !ownsSelection(target)
  // a command block beats the top level for its command. a record field
  // in the block replaces the top level one, so keys it lacks that get
  // written at the top level are still shadowed for that command.
  const block = target?.command?.[conf.command] as
    Record<string, unknown> | undefined
  const staged: Record<string, unknown> = {}
  for (const field of specConfigFields) {
    const v = explicit[field]
    if (v === undefined) continue
    const entries: [string | undefined, string][] =
      isRecordField(field) ?
        Object.entries(v as Record<string, string>)
      : [[undefined, v as string]]
    if (field === 'registries') assertRegistryKeys(v, `--${field}`)
    for (const [key, raw] of entries) {
      if (key !== undefined && !raw) {
        throw error(`${field}.${key} has no value.`, {
          code: 'ECONFIG',
          found: key,
          wanted: `${key}=<value>`,
        })
      }
      // eg an empty VLT_REGISTRY
      if (!raw) continue
      const value = norm(field, raw)
      if (
        key === undefined ?
          field === 'default-registry-alias' &&
          value === defaultRegistryName
        : builtins[field]?.[key] === value
      ) {
        continue
      }
      const inBlock = fromLayer(block, field, key)
      if (inBlock !== undefined) {
        if (norm(field, inBlock) === value) continue
        throw conflictError(
          field,
          key,
          inBlock,
          value,
          find(which),
          conf.command,
        )
      }
      const current = fromLayer(target, field, key)
      if (current !== undefined) {
        if (norm(field, current) === value) continue
        throw conflictError(field, key, current, value, find(which))
      }
      const inOther = fromLayer(other, field, key)
      if (
        inOther !== undefined &&
        norm(field, inOther) === value &&
        (key !== undefined || otherSelectors)
      ) {
        continue
      }
      if (key === undefined) staged[field] = value
      else {
        const rec = (staged[field] ??= {}) as Record<string, string>
        rec[key] = value
      }
    }
  }
  if (!Object.keys(staged).length) return undefined

  // a project layer that sets any selection field owns selection, which
  // would drop the user's registry / default-registry-alias. keep them,
  // with the alias url, so the project file is self contained.
  const { user } = conf.layers
  if (
    which === 'project' &&
    ownsSelection(staged) &&
    !ownsSelection(target)
  ) {
    for (const f of registrySelectors) {
      const v = fromLayer(user, f)
      if (v !== undefined && !(f in staged)) staged[f] = v
    }
    const alias = staged['default-registry-alias'] as
      string | undefined
    const url = alias && fromLayer(user, 'registries', alias)
    const regs = (staged.registries ?? {}) as Record<string, string>
    if (url && !(alias in regs)) {
      staged.registries = { ...regs, [alias]: url }
    }
  }
  return { which, values: staged }
}

/** `field=value` / `field.key=value` lines for a plan's values. */
export const persistedEntries = (values: ConfigFileData): string[] =>
  Object.entries(values).flatMap(([f, v]) =>
    v && typeof v === 'object' ?
      Object.entries(v).map(([k, x]) => `${f}.${k}=${String(x)}`)
    : [`${f}=${String(v)}`],
  )
