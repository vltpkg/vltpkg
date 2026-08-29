import type { ViewClass } from '../../view.ts'
import type { InstallResult } from '../install.ts'

/** the constructor shape both install reporters satisfy */
type Reporter = new (
  ...args: ConstructorParameters<typeof ViewClass<InstallResult>>
) => ViewClass<InstallResult>

/**
 * Set by `cli-sdk/src/perry.ts`, the compiled binary's entry, which is the
 * only place that can import `perry/tui`. Registration rather than a runtime
 * `import()` because the compiler does not follow a dynamic import, so the
 * TUI reporter would not be in the binary at all.
 */
let registered: Reporter | undefined

export const setInstallReporter = (reporter: Reporter): void => {
  registered = reporter
}

/**
 * The install progress view. Compiled it is the `perry/tui` reporter the
 * entry registered; under Node it is the Ink one, loaded lazily so ink — which
 * cannot compile — never enters the binary's module graph.
 */
export const installReporter = async (): Promise<Reporter> =>
  registered ?? (await import('./reporter-ink.ts')).InstallReporter
