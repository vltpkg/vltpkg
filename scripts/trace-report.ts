#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Summarize a `VLT_TRACE` file: the phase timeline, what each span type
 * cost, and how busy every lane of the install pipeline was over time,
 * so idle stretches and head-of-line stalls are visible.
 *
 *   VLT_TRACE=trace.jsonl vlt install
 *   ./scripts/trace-report.ts trace.jsonl [--bucket=50]
 */

import { readFileSync } from 'node:fs'

type Event = {
  t: number
  tid: number
  ev: string
  [k: string]: string | number | boolean | undefined
}

type Span = {
  kind: string
  start: number
  end: number
  tid: number
  fields: Event
}

const args = process.argv.slice(2)
const file = args.find(a => !a.startsWith('--'))
if (!file) {
  console.error('usage: trace-report.ts <trace.jsonl> [--bucket=ms]')
  process.exit(1)
}
const bucketArg = args.find(a => a.startsWith('--bucket='))
const bucketMs = bucketArg ? Number(bucketArg.slice(9)) : 50

const events: Event[] = readFileSync(file, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(l => JSON.parse(l) as Event)
  .sort((a, b) => a.t - b.t)

if (!events.length) {
  console.error('empty trace')
  process.exit(1)
}
const t0 = events[0]?.t ?? 0
const tEnd = events[events.length - 1]?.t ?? t0
const rel = (t: number) => Math.round(t - t0)
const pad = (s: string | number, n: number) => String(s).padStart(n)
const padEnd = (s: string | number, n: number) => String(s).padEnd(n)

// ---- phases ---------------------------------------------------------
const phases = events.filter(e => e.ev === 'phase')
console.log('## Phases (ms from first event)')
for (const [i, p] of phases.entries()) {
  const next = phases[i + 1]?.t ?? tEnd
  const extra = Object.entries(p)
    .filter(([k]) => !['t', 'tid', 'ev', 'name'].includes(k))
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(' ')
  console.log(
    `${pad(rel(p.t), 7)}  ${padEnd(String(p.name), 22)} ${pad(Math.round(next - p.t), 6)}ms  ${extra}`,
  )
}
console.log(`${pad(rel(tEnd), 7)}  ${padEnd('(last event)', 22)}`)
const exit = events.find(e => e.ev === 'exit')
if (exit) {
  console.log(
    `\nevent loop delay: p50=${String(exit.loopP50)}ms p99=${String(exit.loopP99)}ms max=${String(exit.loopMax)}ms` +
      `  maxrss=${Math.round(Number(exit.maxrss) / 1024)}MB`,
  )
}

// ---- spans ----------------------------------------------------------
// pair `<kind>:start` with the next `<kind>:end` carrying the same key
const keyOf = (e: Event) =>
  `${e.tid}|${String(e.url ?? e.spec ?? e.name ?? '')}`
const open = new Map<string, Event[]>()
const spans: Span[] = []
for (const e of events) {
  if (e.ev.endsWith(':start')) {
    const kind = e.ev.slice(0, -6)
    const k = `${kind}|${keyOf(e)}`
    const list = open.get(k) ?? []
    list.push(e)
    open.set(k, list)
  } else if (e.ev.endsWith(':end')) {
    const kind = e.ev.slice(0, -4)
    const k = `${kind}|${keyOf(e)}`
    const s = open.get(k)?.shift()
    if (s)
      spans.push({
        kind,
        start: s.t,
        end: e.t,
        tid: e.tid,
        fields: e,
      })
  }
}
// registry requests: `request` start → complete/304 for the same url
const reqOpen = new Map<string, Event[]>()
let instantHits = 0
for (const e of events) {
  if (e.ev !== 'request') continue
  const url = String(e.url)
  if (e.state === 'start') {
    const list = reqOpen.get(url) ?? []
    list.push(e)
    reqOpen.set(url, list)
  } else if (e.state === 'complete' || e.state === '304') {
    const s = reqOpen.get(url)?.shift()
    if (s) {
      spans.push({
        kind: 'request',
        start: s.t,
        end: e.t,
        tid: e.tid,
        fields: e,
      })
    }
  } else {
    instantHits++
  }
}
let unmatched = 0
for (const list of open.values()) unmatched += list.length
for (const list of reqOpen.values()) unmatched += list.length

const percentile = (xs: number[], p: number) => {
  if (!xs.length) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  return (
    sorted[
      Math.min(
        sorted.length - 1,
        Math.floor((p / 100) * sorted.length),
      )
    ] ?? 0
  )
}

const byKind = new Map<string, Span[]>()
for (const s of spans) {
  const list = byKind.get(s.kind) ?? []
  list.push(s)
  byKind.set(s.kind, list)
}
console.log('\n## Spans')
console.log(
  `${padEnd('kind', 16)} ${pad('count', 6)} ${pad('total', 8)} ${pad('p50', 7)} ${pad('p95', 7)} ${pad('max', 7)}  ${pad('busy', 7)} (wall ms with >=1 in flight)`,
)
const busyWindows = new Map<string, number>()
for (const [kind, list] of [...byKind.entries()].sort()) {
  const ds = list.map(s => s.end - s.start)
  const total = ds.reduce((a, b) => a + b, 0)
  // merge intervals to get wall time with at least one in flight
  const sorted = [...list].sort((a, b) => a.start - b.start)
  let busy = 0
  let curStart = -1
  let curEnd = -1
  for (const s of sorted) {
    if (s.start > curEnd) {
      if (curEnd > curStart) busy += curEnd - curStart
      curStart = s.start
      curEnd = s.end
    } else if (s.end > curEnd) curEnd = s.end
  }
  if (curEnd > curStart) busy += curEnd - curStart
  busyWindows.set(kind, busy)
  console.log(
    `${padEnd(kind, 16)} ${pad(list.length, 6)} ${pad(Math.round(total), 7)}ms ${pad(percentile(ds, 50).toFixed(1), 7)} ${pad(percentile(ds, 95).toFixed(1), 7)} ${pad(Math.max(...ds).toFixed(1), 7)}  ${pad(Math.round(busy), 6)}ms`,
  )
}
if (instantHits)
  console.log(`request cache/store hits (no span): ${instantHits}`)
if (unmatched) console.log(`unmatched span starts: ${unmatched}`)

// how much of the main thread was inside synchronous unpack work
const syncKinds = ['inflate', 'write']
const mainSync = spans
  .filter(
    s =>
      s.tid === 0 &&
      syncKinds.includes(s.kind) &&
      !(s.kind === 'inflate' && s.fields.sync !== true),
  )
  .reduce((a, s) => a + (s.end - s.start), 0)
console.log(
  `main thread inside sync tar writes: ${Math.round(mainSync)}ms of ${rel(tEnd)}ms (${((100 * mainSync) / (tEnd - t0)).toFixed(0)}%)`,
)

// ---- lanes over time -------------------------------------------------
const laneKinds = [
  'request',
  'manifest',
  'tarball:fetch',
  'tarball:unpack',
  'extract',
]
const present = laneKinds.filter(k => byKind.has(k))
const lanes = [
  ...new Set(
    events.filter(e => e.ev === 'lane').map(e => String(e.name)),
  ),
]
if (present.length || lanes.length) {
  console.log(
    `\n## In flight per ${bucketMs}ms bucket (max within bucket)`,
  )
  console.log(
    `${pad('t', 7)} ${present.map(k => pad(k, 14)).join('')}${lanes.map(l => pad(`lane:${l} b/q`, 16)).join('')}  phase`,
  )
  const nBuckets = Math.ceil((tEnd - t0) / bucketMs) + 1
  const counts = present.map(() =>
    new Array<number>(nBuckets).fill(0),
  )
  for (const [i, kind] of present.entries()) {
    for (const s of byKind.get(kind) ?? []) {
      const b0 = Math.floor((s.start - t0) / bucketMs)
      const b1 = Math.floor((s.end - t0) / bucketMs)
      const row = counts[i] ?? []
      for (let b = b0; b <= b1 && b < nBuckets; b++) {
        row[b] = (row[b] ?? 0) + 1
      }
    }
  }
  const laneState = lanes.map(() =>
    new Array<string>(nBuckets).fill(''),
  )
  for (const e of events) {
    if (e.ev !== 'lane') continue
    const i = lanes.indexOf(String(e.name))
    const b = Math.floor((e.t - t0) / bucketMs)
    const row = laneState[i]
    if (row) row[b] = `${String(e.busy)}/${String(e.queued)}`
  }
  const phaseAt = new Array<string>(nBuckets).fill('')
  for (const p of phases) {
    const b = Math.floor((p.t - t0) / bucketMs)
    phaseAt[b] =
      `${phaseAt[b] ? phaseAt[b] + ',' : ''}${String(p.name)}`
  }
  let lastLine = ''
  let repeats = 0
  for (let b = 0; b < nBuckets; b++) {
    const line =
      present.map((_, i) => pad(counts[i]?.[b] ?? 0, 14)).join('') +
      laneState.map(s => pad(s[b] ?? '', 16)).join('')
    if (line === lastLine && !phaseAt[b]) {
      repeats++
      continue
    }
    if (repeats)
      console.log(`${pad('', 7)} ${pad(`(x${repeats + 1})`, 14)}`)
    repeats = 0
    lastLine = line
    console.log(`${pad(b * bucketMs, 7)} ${line}  ${phaseAt[b]}`)
  }
  if (repeats)
    console.log(`${pad('', 7)} ${pad(`(x${repeats + 1})`, 14)}`)
}

// ---- idle report -------------------------------------------------------
console.log(
  '\n## Idle: wall ms inside each phase with nothing in flight',
)
const idleKinds = present.filter(k => k !== 'extract')
for (const [i, p] of phases.entries()) {
  const next = phases[i + 1]?.t ?? tEnd
  const dur = next - p.t
  if (dur < bucketMs) continue
  const parts: string[] = []
  for (const kind of idleKinds) {
    const list = (byKind.get(kind) ?? []).filter(
      s => s.end > p.t && s.start < next,
    )
    const sorted = [...list].sort((a, b) => a.start - b.start)
    let busy = 0
    let curStart = -1
    let curEnd = -1
    for (const s of sorted) {
      const st = Math.max(s.start, p.t)
      const en = Math.min(s.end, next)
      if (st > curEnd) {
        if (curEnd > curStart) busy += curEnd - curStart
        curStart = st
        curEnd = en
      } else if (en > curEnd) curEnd = en
    }
    if (curEnd > curStart) busy += curEnd - curStart
    parts.push(`${kind} idle ${pad(Math.round(dur - busy), 5)}ms`)
  }
  console.log(
    `${padEnd(String(p.name), 22)} ${pad(Math.round(dur), 6)}ms  ${parts.join('  ')}`,
  )
}
