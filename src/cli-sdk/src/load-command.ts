import { error } from '@vltpkg/error-cause'
import { commandModules } from './commands-map.ts'
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
   * Set to `true` by commands that hit a registry or resolve registry
   * specs. There is no default registry, so `outputCommand()` fails
   * early with an `ECONFIG` error when one of these runs unconfigured.
   */
  needsRegistry?: boolean
  /**
   * Set to `true` by commands that install packages (`install`,
   * `update`, `uninstall`, `ci`, `exec`/`vlx`). `outputCommand()`
   * fails early with an `ECONFIG` error when the alias bare specs
   * resolve through (`registries.npm`, or the alias named by
   * `default-registry-alias`) is not configured.
   */
  needsNpmRegistry?: boolean
}

/**
 * Resolve a command module.
 *
 * Dispatch is a static table (`commands-map.ts`, generated) rather than a
 * dynamic `import()`: the compiler drops any `import()` below module top
 * level without a build error (perry-notes F4), and a template-literal
 * specifier fails `check --check-deps` (S2). Consequence: no lazy command
 * loading — every command links in. Stays `async` for its callers.
 */
export const loadCommand = async <T>(
  command: Commands[keyof Commands] | undefined,
): Promise<Command<T>> => {
  const mod = command ? commandModules[command] : undefined
  if (!mod) {
    throw error('Could not load command', {
      found: command,
    })
  }
  return mod as Command<T>
}
