import { type ChalkInstance } from 'chalk'
import { type LoadedConfig } from './config/index.js'
import { type Jack } from 'jackspeak'

export type * from './config/index.js'

/**
 * What gets returned from a command. This changes how the result
 * gets output in the terminal.
 */
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export type CliCommandResult<T> = void | { result: T }

export type CliCommandUsage = () => Jack

export type CliCommandFn<T = unknown> = (
  conf: LoadedConfig,
  /**
   * Used to pass in arbitrary data for testing.
   * @internal
   */
  _extra?: any,
) => Promise<CliCommandResult<T>>

export type CliCommandViewFn<T = string> = (
  data: any,
  viewOptions: { colors: ChalkInstance },
  conf: LoadedConfig,
) => T | undefined

export type CliCommandView = Partial<
  Record<'human' | 'mermaid' | 'gui', CliCommandViewFn> &
    Record<'json', CliCommandViewFn<object>>
>

export type CliCommand<T = unknown> = {
  command: CliCommandFn<T>
  usage: CliCommandUsage
  view?: CliCommandView
}
