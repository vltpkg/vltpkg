import { appendFileSync } from 'node:fs'
import { monitorEventLoopDelay, performance } from 'node:perf_hooks'
import type { IntervalHistogram } from 'node:perf_hooks'
import { threadId as ownThreadId } from 'node:worker_threads'

/**
 * Extra fields recorded with a trace event. Keep them flat and small:
 * every event is one JSON line.
 */
export type TraceFields = Record<
  string,
  string | number | boolean | undefined
>

/**
 * One trace event. `t` is an absolute wall clock in milliseconds
 * (`performance.timeOrigin + performance.now()`), the same clock on every
 * thread, so events from workers and the main thread can be laid on one
 * timeline. `tid` is the worker thread id, 0 for the main thread.
 */
export type TraceEvent = {
  t: number
  tid: number
  ev: string
} & TraceFields

export type TracerOptions = {
  /** Path of the JSON-lines file to append events to (`VLT_TRACE`). */
  file?: string
  /** Print a one-line phase summary to stderr at exit (`VLT_PHASES`). */
  phases?: boolean
  /** The thread id to stamp events with. Defaults to the real one. */
  threadId?: number
  /** Absolute clock in ms. Defaults to the shared performance clock. */
  now?: () => number
  /** Appends a chunk of lines to the trace file. */
  append?: (file: string, data: string) => void
  /** Writes the phase summary line. Defaults to stderr. */
  write?: (line: string) => void
  /** Flush after this many buffered lines. */
  flushLines?: number
  /** Flush this many ms after the first buffered line. */
  flushMs?: number
  /** Sample `rss` this often, in ms. 0 disables sampling. */
  sampleMs?: number
  /** Whether this is the main thread, which owns the event loop monitor. */
  main?: boolean
}

const sharedNow = () => performance.timeOrigin + performance.now()

const defaultAppend = (file: string, data: string) =>
  appendFileSync(file, data)

const defaultWrite = (line: string) =>
  process.stderr.write(line + '\n')

/**
 * A low overhead tracer for the install pipeline.
 *
 * It is off unless `VLT_TRACE=<file>` or `VLT_PHASES=1` is set, and when
 * off every method returns after one boolean check, so call sites can
 * stay in the hot path.
 *
 * With `VLT_TRACE` every event is appended to the file as one JSON line.
 * Lines are buffered and flushed every `flushLines` lines or `flushMs`
 * ms, and at exit. Worker threads
 * get their own instance from the same env and append to the same file,
 * so the file interleaves threads; sort by `t` to read it.
 *
 * With `VLT_PHASES` the main thread prints one line at exit: the ms
 * between consecutive {@link Tracer.mark} calls, the event loop delay
 * percentiles (the direct measure of how long the main thread was busy
 * with synchronous work while IO completions waited), and peak memory.
 */
export class Tracer {
  readonly enabled: boolean
  readonly file?: string
  readonly phases: boolean
  readonly #tid: number
  readonly #now: () => number
  readonly #append: (file: string, data: string) => void
  readonly #write: (line: string) => void
  readonly #flushLines: number
  readonly #flushMs: number
  #buffer: string[] = []
  #timer?: NodeJS.Timeout
  #sampler?: NodeJS.Timeout
  #marks: { name: string; t: number }[] = []
  #start: number
  #loop?: IntervalHistogram
  #closed = false

  constructor(options: TracerOptions = {}) {
    this.file = options.file || undefined
    this.phases = !!options.phases
    this.enabled = !!this.file || this.phases
    this.#tid = options.threadId ?? ownThreadId
    this.#now = options.now ?? sharedNow
    this.#append = options.append ?? defaultAppend
    this.#write = options.write ?? defaultWrite
    this.#flushLines = options.flushLines ?? 200
    this.#flushMs = options.flushMs ?? 50
    this.#start = this.#now()
    if (!this.enabled) return
    const main = options.main ?? this.#tid === 0
    if (main) {
      this.#loop = monitorEventLoopDelay({ resolution: 20 })
      this.#loop.enable()
      const sampleMs = options.sampleMs ?? 20
      if (this.file && sampleMs > 0) {
        this.#sampler = setInterval(() => this.sample(), sampleMs)
        this.#sampler.unref()
      }
      process.once('exit', () => this.close())
    }
    this.trace('open', { pid: process.pid })
  }

  /**
   * Build a tracer from the environment: `VLT_TRACE` names the file,
   * `VLT_PHASES` (any value but `0` or empty) asks for the summary.
   */
  static fromEnv(
    env: Record<string, string | undefined> = process.env,
    options: Omit<TracerOptions, 'file' | 'phases'> = {},
  ): Tracer {
    const phases = env.VLT_PHASES
    return new Tracer({
      ...options,
      file: env.VLT_TRACE,
      phases: !!phases && phases !== '0',
    })
  }

  /** Record one event. */
  trace(ev: string, fields?: TraceFields): void {
    if (!this.file || this.#closed) return
    const event: TraceEvent = { t: this.#now(), tid: this.#tid, ev }
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (v !== undefined) event[k] = v
      }
    }
    this.#buffer.push(JSON.stringify(event))
    if (this.#buffer.length >= this.#flushLines) this.flush()
    else if (!this.#timer) {
      this.#timer = setTimeout(() => this.flush(), this.#flushMs)
      this.#timer.unref()
    }
  }

  /**
   * Record a `<ev>:start` event now and return a function that records
   * `<ev>:end` with the elapsed `ms` (plus any fields it is given). The
   * same `fields` are stamped on both ends so the two can be paired.
   */
  span(
    ev: string,
    fields?: TraceFields,
  ): (end?: TraceFields) => void {
    if (!this.file) return noop
    const t0 = this.#now()
    this.trace(`${ev}:start`, fields)
    return end =>
      this.trace(`${ev}:end`, {
        ...fields,
        ...end,
        ms: Math.round((this.#now() - t0) * 1000) / 1000,
      })
  }

  /**
   * Mark the start of a phase. The summary reports the ms between each
   * mark and the next one, and the trace records a `phase` event.
   */
  mark(name: string, fields?: TraceFields): void {
    if (!this.enabled) return
    this.#marks.push({ name, t: this.#now() })
    this.trace('phase', { ...fields, name })
  }

  /**
   * Record how busy a resource lane is: how many jobs it is running and
   * how many are waiting for a slot. The report derives idle time per
   * lane from these.
   */
  lane(name: string, busy: number, queued: number): void {
    if (!this.file) return
    this.trace('lane', { name, busy, queued })
  }

  /** Record a memory sample. */
  sample(): void {
    if (!this.file) return
    const m = process.memoryUsage()
    this.trace('rss', {
      rss: m.rss,
      heap: m.heapUsed,
      ext: m.external,
      ab: m.arrayBuffers,
    })
  }

  /** Write buffered lines to the file. */
  flush(): void {
    if (this.#timer) {
      clearTimeout(this.#timer)
      this.#timer = undefined
    }
    if (!this.file || !this.#buffer.length) return
    const data = this.#buffer.join('\n') + '\n'
    this.#buffer = []
    try {
      this.#append(this.file, data)
    } catch {
      // a trace that cannot be written must never fail the install
    }
  }

  /**
   * The one-line phase summary, or undefined when phases are off. Each
   * phase is reported as the ms from its mark to the next mark (or to
   * now, for the last one).
   */
  summary(): string | undefined {
    if (!this.phases) return undefined
    const now = this.#now()
    const parts: string[] = []
    for (const [i, m] of this.#marks.entries()) {
      const next = this.#marks[i + 1]?.t ?? now
      parts.push(`${m.name}=${Math.round(next - m.t)}`)
    }
    parts.push(`total=${Math.round(now - this.#start)}`)
    if (this.#loop) {
      // the histogram is in nanoseconds
      const ms = (n: number) => Math.round(n / 1e6)
      parts.push(
        `loop p50=${ms(this.#loop.percentile(50))}` +
          ` p99=${ms(this.#loop.percentile(99))}` +
          ` max=${ms(this.#loop.max)}`,
      )
    }
    const { maxRSS } = process.resourceUsage()
    parts.push(`maxrss=${Math.round(maxRSS / 1024)}MB`)
    return `PHASES ${parts.join(' ')}`
  }

  /**
   * Stop sampling, flush, and print the summary. Runs at process exit
   * on the main thread; safe to call more than once.
   */
  close(): void {
    if (this.#closed) return
    if (this.#sampler) clearInterval(this.#sampler)
    if (this.enabled) {
      if (this.#loop) {
        this.#loop.disable()
        this.trace('exit', {
          loopP50: Math.round(this.#loop.percentile(50) / 1e6),
          loopP99: Math.round(this.#loop.percentile(99) / 1e6),
          loopMax: Math.round(this.#loop.max / 1e6),
          maxrss: process.resourceUsage().maxRSS,
        })
      }
      const line = this.summary()
      this.flush()
      if (line) this.#write(line)
    }
    this.#closed = true
  }
}

const noop = () => {}

/**
 * The process-wide tracer, built from the environment. Worker threads
 * inherit the environment, so they trace to the same file.
 */
export const tracer = Tracer.fromEnv()

/** Record one event on the process-wide tracer. */
export const trace = (ev: string, fields?: TraceFields): void =>
  tracer.trace(ev, fields)

/** Open a span on the process-wide tracer. See {@link Tracer.span}. */
export const span = (
  ev: string,
  fields?: TraceFields,
): ((end?: TraceFields) => void) => tracer.span(ev, fields)

/** Mark a phase on the process-wide tracer. See {@link Tracer.mark}. */
export const mark = (name: string, fields?: TraceFields): void =>
  tracer.mark(name, fields)

/** Record lane occupancy on the process-wide tracer. */
export const lane = (
  name: string,
  busy: number,
  queued: number,
): void => tracer.lane(name, busy, queued)
