import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import { AnimatedSpinner, Box, render, Text } from 'perry/tui'
import type { Widget } from 'perry/tui'
import { ViewClass } from '../../view.ts'
import type { InstallResult } from '../install.ts'

/**
 * The compiled binary's install reporter, on `perry/tui`.
 *
 * Perry-exclusive, and only reachable from `cli-sdk/src/perry.ts` — importing
 * it under Node would fail, since `perry/tui` is a built-in with no package on
 * disk. The Ink reporter next door stays the Node build's, because ink cannot
 * be compiled at all: its yoga layer is WebAssembly and the pin ships no wasm
 * host archive.
 *
 * Frames are painted with one-shot `render()` on a timer rather than through
 * `run()`: `run()` owns the loop and the keyboard, and an install reporter
 * needs neither.
 *
 * No `#private` fields: constructing a class with them from another compiled
 * module throws.
 */

type StepState = 'waiting' | 'in_progress' | 'completed'

const labels: Record<Events['graphStep']['step'], string> = {
  build: 'resolving dependencies',
  actual: '',
  reify: 'extracting files',
}

const stepColors: Record<StepState, string> = {
  waiting: 'gray',
  in_progress: 'yellow',
  completed: 'green',
}

const FRAME_MS = 80

export class InstallReporterTui extends ViewClass {
  requests = 0
  cacheHit = 0
  trailer?: string
  timer?: NodeJS.Timeout
  steps: Record<Events['graphStep']['step'], StepState> = {
    build: 'waiting',
    actual: 'waiting',
    reify: 'waiting',
  }

  onRequest = ({ state }: Events['request']) => {
    if (state === 'start') this.requests++
    else if (state === 'cache' || state === 'stale') this.cacheHit++
  }

  onGraphStep = ({ step, state }: Events['graphStep']) => {
    this.steps[step] = state === 'start' ? 'in_progress' : 'completed'
  }

  frame(): Widget {
    const steps: Widget[] = []
    const order = ['build', 'actual', 'reify'] as const
    for (const [idx, step] of order.entries()) {
      const label = labels[step]
      if (!label) continue
      const state = this.steps[step]
      steps.push(
        Text(label, { fg: stepColors[state] }),
        ...(state === 'in_progress' ? [Text(' '), AnimatedSpinner()]
        : state === 'completed' ? [Text(' ✓', { fg: 'green' })]
        : []),
      )
      if (idx !== order.length - 1) {
        steps.push(Text(' > ', { fg: 'gray' }))
      }
    }

    const rows: Widget[] = [Box({ flexDirection: 'row' }, steps)]
    if (this.cacheHit > 0) {
      rows.push(
        Text(
          `${this.cacheHit} cache hit${this.cacheHit > 1 ? 's' : ''}`,
        ),
      )
    }
    if (this.requests > 0) {
      rows.push(
        Text(
          `${this.requests} request${this.requests > 1 ? 's' : ''}`,
        ),
      )
    }
    if (this.trailer) {
      for (const line of this.trailer.split('\n'))
        rows.push(Text(line))
    }
    return Box(rows)
  }

  paint = () => render(this.frame())

  start() {
    emitter.on('request', this.onRequest)
    emitter.on('graphStep', this.onGraphStep)
    /* c8 ignore start - perry/tui render SIGBUS in this reporter */
    if ('perry' in process.versions) return
    /* c8 ignore stop */
    this.timer = setInterval(this.paint, FRAME_MS)
    this.timer.unref()
    this.paint()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    emitter.off('request', this.onRequest)
    emitter.off('graphStep', this.onGraphStep)
  }

  async done(result: InstallResult, { time }: { time: number }) {
    let out = `Done in ${time}ms`
    // the same next-steps message the Ink reporter prints
    if (result.buildQueue?.length) {
      out += `\n\n📦 ${result.buildQueue.length} packages have install scripts defined & were not fully built\n`
      out += '🔎 Run `vlt query :scripts` to list them\n'
      out +=
        '🔨 Run `vlt build` to run all required scripts to build installed packages.\n'
    }
    this.trailer = out
    this.stop()
    /* c8 ignore start */
    if ('perry' in process.versions) {
      // eslint-disable-next-line no-console
      console.log(out)
      return undefined
    }
    /* c8 ignore stop */
    this.paint()
    return undefined
  }

  error(_err: unknown) {
    this.stop()
  }
}
