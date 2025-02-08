import { type LoadedConfig } from './config/index.ts'
import { type Jack } from 'jackspeak'
import { type ChalkInstance } from 'chalk'

export type * from './config/index.ts'

export type CommandUsage = () => Jack

export type ViewOptions = { colors?: ChalkInstance }

export type ViewClass<T = unknown> = new (
  options: ViewOptions,
  conf: LoadedConfig,
) => ViewInstance<T>

// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type CommandResult<T> = { result: T } | void

export interface ViewInstance<T = unknown> {
  start: () => void
  done: (result: CommandResult<T>, opts: { time: number }) => void
  error: (err: unknown) => void
}

export type ViewFn<T = unknown> = (
  result: T,
  options: ViewOptions,
  conf: LoadedConfig,
) => unknown

export type View<T = unknown> = ViewFn<T> | ViewClass<T>

export type Views<T = unknown> =
  | View<T>
  | {
      defaultView: string
      views?: Record<string, View<T>>
    }

/**
 * A command function that may return a result of `{ result: T }` or void.
 * If the result is void, the command will not be displayed in the output.
 * Use @link {CommandFnResultOnly} if the command must return a result.
 */
export type CommandFn<T = unknown> = (
  conf: LoadedConfig,
) => Promise<CommandResult<T>>

/**
 * A command function that must return a result of `{ result: T }`.
 */
export type CommandFnResultOnly<T> = (
  conf: LoadedConfig,
) => Promise<Exclude<CommandResult<T>, void>>

export type Command<T> = {
  command: CommandFn<T> | CommandFnResultOnly<T>
  usage: CommandUsage
  views: Views<T>
}
