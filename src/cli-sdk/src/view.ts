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
  // run the command", for example to just open a web browser
  // to the page relevant to a given thing, rather than computing it twice
  start() {}
  async done(_result: T, _opts: { time: number }): Promise<unknown> {
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
): view is typeof ViewClass<T> => {
  if (typeof view !== 'function' || !('prototype' in view)) {
    return false
  }
  if (view.prototype instanceof ViewClass) return true
  return (
    typeof (view.prototype as { start?: unknown }).start ===
    'function'
  )
}

const kLazyView = '__vlt_lazyView__'

export type LazyView<T = unknown> = {
  readonly [kLazyView]: () => Promise<View<T>>
}

export const lazyView = <T>(
  load: () => Promise<View<T>>,
): LazyView<T> => ({ [kLazyView]: load })

export const isLazyView = <T = unknown>(
  v: unknown,
): v is LazyView<T> => !!v && typeof v === 'object' && kLazyView in v

export const loadLazyView = <T>(v: LazyView<T>): Promise<View<T>> =>
  v[kLazyView]()

/* c8 ignore start */
export const perryDoneView = (): ViewFn => {
  const t0 = Date.now()
  return () => `Done in ${Date.now() - t0}ms`
}
/* c8 ignore stop */

export type Views<T = unknown> =
  View<T> | LazyView<T> | Record<string, View<T> | LazyView<T>>
