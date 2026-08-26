import { humanDiffOutput } from '@vltpkg/graph-diff'
import { render } from 'ink'
import { createElement as $ } from 'react'
import { App } from './app.ts'
import { ViewClass } from '../../view.ts'
import type { DiffResult } from '../diff.ts'

/** Ink has no alternate-screen support, so these are ours to write. */
const ESC = String.fromCharCode(27)
const ENTER_ALT = `${ESC}[?1049h`
const LEAVE_ALT = `${ESC}[?1049l`

/** Conventional 128 + signal number. */
const SIGNALS = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 } as const

/**
 * A terminal both ways, no `CI` set, and `--tui` not turned off.
 *
 * The `CI` check is load-bearing rather than belt-and-braces: the
 * default view resolves to `human` when stdout is a TTY *or* `CI` is
 * set, so without it every CI job would try to render a full-screen app.
 */
export const isInteractive = (tui: unknown) =>
  tui !== false &&
  process.stdin.isTTY &&
  process.stdout.isTTY &&
  !process.env.CI

export class DiffViewer extends ViewClass<DiffResult> {
  // the diff does not exist until the command has run, so unlike the
  // install reporter there is nothing to render in start()
  async done(result: DiffResult) {
    const identity = !!this.config.get('identity-only')
    if (!isInteractive(this.config.get('tui'))) {
      return humanDiffOutput(result.diff, {
        colors: this.options.colors,
        identity,
      })
    }

    process.stdout.write(ENTER_ALT)
    const instance = render($(App, { diff: result.diff, identity }))

    let restored = false
    /**
     * Unmount *before* leaving the alternate screen.
     *
     * `signal-exit` (which ink pulls in) patches `process.emit` so that
     * our own 'exit' listeners run ahead of ink's unmount. Leaving first
     * would mean ink then paints its last frame and shows the cursor on
     * the user's real screen -- exactly the mess the alt screen exists
     * to avoid. `unmount()` is idempotent, so calling this from several
     * paths is free.
     *
     * ponytail: an uncaught exception writes its stack into the alt
     * buffer before 'exit' fires, so the trace is lost. Add an
     * uncaughtException handler that restores and rethrows if that ever
     * bites in practice.
     */
    const restore = () => {
      if (restored) return
      restored = true
      instance.unmount()
      process.stdout.write(LEAVE_ALT)
    }

    // registering these makes signal-exit stand down -- it only acts
    // while it is the sole listener for a signal -- so unmounting in
    // `restore` is required rather than defensive
    const handlers = Object.entries(SIGNALS).map(([sig, code]) => {
      const fn = () => {
        restore()
        process.exit(code)
      }
      process.on(sig, fn)
      return [sig, fn] as const
    })
    process.on('exit', restore)

    try {
      await instance.waitUntilExit()
    } finally {
      restore()
      process.off('exit', restore)
      for (const [sig, fn] of handlers) process.off(sig, fn)
    }
    return undefined
  }

  /** the framework calls this when the command itself failed */
  error(_err: unknown) {
    process.stdout.write(LEAVE_ALT)
  }
}
