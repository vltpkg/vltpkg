/**
 * Merge the `config` objects found in the user and project `vlt.json`
 * files into the single set of values that gets applied to the
 * {@link https://npmjs.com/jackspeak | jackspeak} definition.
 *
 * Layers are supplied outermost first (user, then project), and follow the
 * rules documented in `vlt help` and at
 * <https://docs.vlt.sh/cli/configuring>:
 *
 * - Scalar fields come from the innermost layer that sets them.
 * - Object (`key=value` record) fields are merged key by key.
 * - A `null` value removes a field, or a single key within a record field.
 * - Registry *selection* belongs to a single layer, see
 *   {@link registrySelectionFields}.
 *
 * Note that this operates on the record form of a config object (the shape
 * it has in `vlt.json`), not on jackspeak's `key=value` string lists, so
 * record fields can be merged per key. Run values through
 * `pairsToRecords` first.
 * @module
 */

import { isRecordField } from './definition.ts'

/** One config layer, in record (not `key=value` pair) form. */
export type ConfigLayer = Record<string, unknown>

/**
 * The fields that *select* which registry is used, as opposed to the
 * catalogs of aliases that can be selected from.
 */
export const registrySelectors = [
  'registry',
  'default-registry-alias',
] as const

/**
 * When a layer sets any of these, that layer owns registry selection: the
 * {@link registrySelectors} it does *not* set are removed from the merged
 * result, rather than inherited from an outer layer.
 *
 * Without this, a `registry` in the user `vlt.json` would outrank a
 * project's `registries.npm`, since the `registry` scalar beats any alias
 * in `requireRegistry()`. The alias catalogs are still merged, so aliases
 * configured at the user level stay addressable by name.
 *
 * Deliberately narrow: `scoped-registries` and `jsr-registries` are purely
 * additive, so adding one of those in a project must not drop the user's
 * default registry.
 */
export const registrySelectionFields = [
  'registry',
  'registries',
  'default-registry-alias',
] as const

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * Deep copy of a config layer, preserving `null` values.
 *
 * Layers are held onto for the life of the `Config` object, but the objects
 * nested in them are shared with the `@vltpkg/vlt-json` cache, which
 * `deleteConfigKeys` mutates in place. Copying keeps a stored layer an
 * accurate snapshot of what was read.
 */
const cloneValue = (v: unknown): unknown =>
  Array.isArray(v) ? (v as unknown[]).map(x => cloneValue(x))
  : isObj(v) ?
    Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, cloneValue(x)]),
    )
  : v

export const cloneLayer = <T>(data: T): T => cloneValue(data) as T

/**
 * Fold one record field's keys into the value from the outer layers.
 * `null` removes a key. Returns `undefined` when nothing is left, so that
 * the field falls back to its definitional default instead of applying an
 * empty record.
 */
const mergeRecord = (
  base: unknown,
  add: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const result: Record<string, unknown> =
    isObj(base) ? { ...base } : {}
  for (const [k, v] of Object.entries(add)) {
    if (v === null) delete result[k]
    else result[k] = v
  }
  return Object.keys(result).length ? result : undefined
}

/**
 * Fold the `command` object in, merging each command's block with the same
 * rules as the top level.
 */
const mergeCommands = (
  base: unknown,
  add: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  const result: Record<string, unknown> =
    isObj(base) ? { ...base } : {}
  for (const [cmd, opts] of Object.entries(add)) {
    if (opts === null) delete result[cmd]
    else if (isObj(opts)) {
      result[cmd] = mergeLayers([
        isObj(result[cmd]) ? result[cmd] : undefined,
        opts,
      ])
    }
  }
  return Object.keys(result).length ? result : undefined
}

/**
 * Merge config layers, outermost first. Layers are never mutated.
 */
export const mergeLayers = (
  layers: (ConfigLayer | undefined)[],
): ConfigLayer => {
  const result: ConfigLayer = {}
  for (const layer of layers) {
    if (!isObj(layer)) continue
    for (const [k, v] of Object.entries(layer)) {
      if (k === 'command') {
        const merged =
          isObj(v) ? mergeCommands(result.command, v) : undefined
        if (merged) result.command = merged
        else delete result.command
      } else if (v === null) {
        delete result[k]
      } else if (isRecordField(k) && isObj(v)) {
        const merged = mergeRecord(result[k], v)
        if (merged) result[k] = merged
        else delete result[k]
      } else {
        result[k] = v
      }
    }

    // the innermost layer that configures a registry at all owns which
    // registry is selected.
    if (registrySelectionFields.some(f => f in layer)) {
      for (const f of registrySelectors) {
        if (!(f in layer)) delete result[f]
      }
    }
  }
  return result
}
