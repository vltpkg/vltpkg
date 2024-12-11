import { type LoadedConfig } from './config/index.js'
import { type Jack } from 'jackspeak'
import { type ChalkInstance } from 'chalk'

export type * from './config/index.js'

export type CommandUsage = () => Jack

export type ViewOptions = { colors?: ChalkInstance }

export type ViewClass<T = unknown> = new (
  options: ViewOptions,
  conf: LoadedConfig,
) => ViewInstance<T>

export type CommandResult<T = unknown> = { result: T }

export interface ViewInstance<T = unknown> {
  start: () => void
  done: (result: T, opts: { time: number }) => void
  error: (err: unknown) => void
}

export type ViewFn<T> = (
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

export type CommandFn<T = unknown> = (
  conf: LoadedConfig,
  _extra?: any,
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
) => Promise<{ result: T } | void>

export type Command<T = unknown> = {
  command: CommandFn<T>
  usage: CommandUsage
  views?: Views<T>
}
