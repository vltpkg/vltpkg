import { error } from '@vltpkg/error-cause'
import type { WhichConfig } from '@vltpkg/vlt-json'
import { configLabel, storedAllow } from './allow-query.ts'
import type { AllowKey } from './allow-query.ts'
import type { LoadedConfig } from './config/index.ts'
import { confirm, editQuery, interactive } from './skills-prompt.ts'

const where = (which: WhichConfig) =>
  which === 'user' ?
    'in the user vlt.json'
  : 'for this project (vlt.json)'

export type PickSpec = {
  key: AllowKey
  /** editor prefill; applied with -y or no TTY when nothing is stored */
  defaultQuery: string
  /** save that default without -y */
  saveDefault: boolean
  /** throws on an invalid query */
  check: (q: string) => Promise<unknown>
}

/** The query to apply, and whether to save it. */
export type AllowPick = { query: string; save: boolean }

/**
 * Pick the `key` query to apply: `given`, the stored one or the
 * default, asking before replacing or editing a stored one.
 * undefined: no changes.
 */
export const pickQuery = async (
  conf: LoadedConfig,
  given: string | undefined,
  { key, defaultQuery, saveDefault, check }: PickSpec,
): Promise<AllowPick | undefined> => {
  const stored = storedAllow(conf, key)
  const yes = !!conf.get('yes')
  const tty = interactive()
  // saved unless already stored
  const pick = (query?: string) =>
    query === undefined ? undefined : (
      { query, save: stored?.query !== query }
    )
  if (given) {
    await check(given)
    if (!stored || stored.query === given || yes) return pick(given)
    if (!tty) {
      throw error(
        `${key} is already set (${configLabel(stored.which)}): "${stored.query}"; pass -y to replace it`,
        { code: 'EUSAGE', found: given, wanted: stored.query },
      )
    }
    if (
      !(await confirm(
        `${key} is already set ${where(stored.which)}: "${stored.query}". Replace it? [y/N] `,
      ))
    ) {
      return undefined
    }
    return pick(
      await editQuery({
        key,
        current: stored.query,
        prefill: given,
        check,
      }),
    )
  }
  if (stored) {
    if (yes || !tty) return pick(stored.query)
    const edit = await confirm(
      `${key} is set ${where(stored.which)}: "${stored.query}". Edit it? [y/N] `,
    )
    // ctrl+C/D: cancel
    if (edit === undefined) return undefined
    return pick(
      edit ?
        await editQuery({
          key,
          current: stored.query,
          prefill: stored.query,
          check,
        })
      : stored.query,
    )
  }
  if (yes || !tty) {
    return { query: defaultQuery, save: yes || saveDefault }
  }
  return pick(await editQuery({ key, prefill: defaultQuery, check }))
}
