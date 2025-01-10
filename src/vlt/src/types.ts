import { type LoadedConfig } from './config/index.js'
import { type Jack } from 'jackspeak'
import { type Instance } from 'ink'

export type * from './config/index.js'

export type CliCommandResultOnly<T> = {
  result: T
}

export type CliCommandResult<T = null> =
  T extends null ?
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    void | string | string[] | CliCommandResultOnly<unknown>
  : CliCommandResultOnly<T>

export type CliCommandUsage = () => Jack

export type CliCommandFn<T = null> = (
  conf: LoadedConfig,
  _extra?: any,
) => Promise<CliCommandResult<T>>

export type View =
  | { renderer: 'ink'; fn: () => Instance }
  | { renderer?: undefined; fn: (...args: any[]) => any }

export type Views = Record<string, View>

export type CliCommand<T = null> = {
  command: CliCommandFn<T>
  usage: CliCommandUsage
  views?: Views
  defaultView?: string
}
