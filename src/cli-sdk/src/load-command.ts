import { error } from '@vltpkg/error-cause'
import type { Jack } from 'jackspeak'
import type { Commands, LoadedConfig } from './config/index.ts'
import type { Views } from './view.ts'

export type CommandUsage = () => Jack

/**
 * A command function that may return a result of `T`.
 * If the result is `undefined`, no final output will be displayed by default.
 */
export type CommandFn<T = unknown> = (
  conf: LoadedConfig,
) => Promise<T>

export type Command<T> = {
  command: CommandFn<T>
  usage: CommandUsage
  views: Views<T>
  /**
   * Set by commands that hit a registry or resolve registry specs.
   * `'read'` commands only fetch, so the built-in `npm` alias (vlt's
   * public, read-only npm mirror) is enough. `'write'` commands publish
   * or authenticate, so `outputCommand()` fails early with an `ECONFIG`
   * error unless the user configured a registry. `publish`/`unpublish`
   * check in-command instead, since `publishConfig.registry` may
   * suffice. A function decides per invocation, e.g. when only some
   * subcommands need one.
   */
  needsRegistry?:
    | 'read'
    | 'write'
    | ((conf: LoadedConfig) => 'read' | 'write' | undefined)
  /**
   * Set to `true` by commands that install packages (`install`,
   * `update`, `uninstall`, `ci`, `exec`/`vlx`). `outputCommand()`
   * fails early with an `ECONFIG` error when the alias bare specs
   * resolve through (`registries.npm`, built in, or the alias named by
   * `default-registry-alias`) has no URL.
   */
  needsNpmRegistry?: boolean
}

export const loadCommand = async <T>(
  command: Commands[keyof Commands] | undefined,
): Promise<Command<T>> => {
  try {
    return (await import(`./commands/${command}.ts`)) as Command<T>
  } catch (e) {
    throw error('Could not load command', {
      found: command,
      cause: e,
    })
  }
}
