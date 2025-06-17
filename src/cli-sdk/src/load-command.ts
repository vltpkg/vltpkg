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
