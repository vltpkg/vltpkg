import { type ChalkInstance } from 'chalk'
import { type LoadedConfig } from './config/index.js'
import { type Jack } from 'jackspeak'

export type * from './config/index.js'

/**
 * What gets returned from a command. This changes how the result
 * gets output in the terminal.
 */
export type CliCommandResult<T> =
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
  | void
  | undefined
  | string
  | string[]
  | (T extends null ? never : { result: T })

export type CliCommandUsage = () => Jack

export type CliCommandFn<T = null> = (
  conf: LoadedConfig,
  _extra?: any,
) => Promise<CliCommandResult<T>>

export type CliCommandViewFn<T = string> = (
  data: any,
  viewOptions: { colors: ChalkInstance },
) => T

export type CliCommandView = Partial<
  Record<'human' | 'mermaid' | 'gui', CliCommandViewFn> &
    Record<'json', CliCommandViewFn<object>>
>

export type CliCommand<T = null> = {
  command: CliCommandFn<T>
  usage: CliCommandUsage
  view?: CliCommandView
}
