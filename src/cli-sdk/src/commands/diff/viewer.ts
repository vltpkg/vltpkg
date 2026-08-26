import { humanDiffOutput } from '@vltpkg/graph-diff'
import { render } from 'ink'
import { createElement as $ } from 'react'
import { App } from './app.ts'
import { ViewClass } from '../../view.ts'
import type { DiffResult } from '../diff.ts'

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
    const instance = render($(App, { diff: result.diff, identity }))
    await instance.waitUntilExit()
    return undefined
  }
}
