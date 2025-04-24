import type { LoadedConfig } from './config/index.ts'

export type ViewOptions = { colors?: boolean }

/**
 * The base class for all View classes
 *
 * Do not override the constructor, just provide start/done/error methods.
 *
 * These classes should be used as one or more of the exported views for
 * commands that need to know when the processing starts, handle errors in
 * various ways, etc. Fancy stuff.
 *
 * For simple use cases, usually better to create a {@link ViewFn} instead.
 */
export class ViewClass<T = unknown> {
  options: ViewOptions
  config: LoadedConfig

  constructor(options: ViewOptions, config: LoadedConfig) {
    this.options = options
    this.config = config
  }

  // TODO: maybe have start() return a flag to say "i got this, do not
  // run the command", for example to have the gui just open a web browser
  // to the page relevant to a given thing, rather than computing it twice
  start() {}
  done(_result: T, _opts: { time: number }): unknown {
    return
  }
  error(_err: unknown) {}
}

export type ViewFn<T = unknown> = (
  result: T,
  options: ViewOptions,
  conf: LoadedConfig,
) => unknown

export type View<T = unknown> = ViewFn<T> | typeof ViewClass<T>

export const isViewClass = <T = unknown>(
  view: View<T>,
): view is typeof ViewClass<T> =>
  typeof view === 'function' &&
  'prototype' in view &&
  view.prototype instanceof ViewClass

export type Views<T = unknown> = View<T> | Record<string, View<T>>
