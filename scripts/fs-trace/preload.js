// Logs fs ops on tap fixture paths as JSON lines, to find writes that
// race the fixture cleanup. From a workspace dir (processes append: use a
// fresh file per run):
//   rm -f /tmp/t.jsonl; TRACE_FS_OUT=/tmp/t.jsonl NODE_OPTIONS="--import $PWD/../../scripts/fs-trace/preload.js" \
//     vlr test -- -Rtap --disable-coverage test/foo.ts
//   node ../../scripts/fs-trace/analyze.js /tmp/t.jsonl
// TRACE_FS_RMDIR_DELAY_MS=<ms> (even 0): tap's recursive rm runs as
// lstat/readdir/unlink/rmdir steps (the way Node 22 does it), waiting
// <ms> before each rmdir to widen the race window.
import fs from 'node:fs'
import { syncBuiltinESMExports } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const out = process.env.TRACE_FS_OUT
const delayEnv = process.env.TRACE_FS_RMDIR_DELAY_MS
const delay = Number(delayEnv ?? 0)
const FIXTURE = /\.tap[\\/]fixtures/
// wall clock: one trace mixes processes
const now = () => performance.timeOrigin + performance.now()
const fd = out ? fs.openSync(out, 'a') : -1
const writeSync = fs.writeSync
const log = rec => {
  if (fd < 0) return
  try {
    writeSync(
      fd,
      JSON.stringify({ t: now(), pid: process.pid, ...rec }) + '\n',
    )
  } catch {}
}
const stackOf = () => {
  const o = {}
  const lim = Error.stackTraceLimit
  Error.stackTraceLimit = 30
  Error.captureStackTrace(o, stackOf)
  Error.stackTraceLimit = lim
  return String(o.stack)
    .split('\n')
    .slice(1)
    .map(s => s.trim())
    .filter(s => !s.includes('fs-trace'))
    .slice(0, 12)
}
const pathOf = a =>
  a instanceof URL ? fileURLToPath(a)
  : typeof a === 'string' ? a
  : Buffer.isBuffer(a) ? a.toString()
  : undefined
const raw = { ...fs.promises }
const sleep = ms => new Promise(res => setTimeout(res, ms))

// Node 26's native rm hides the readdir/rmdir sequence
const emulateRm = async path => {
  let st
  try {
    st = await raw.lstat(path)
  } catch (e) {
    if (e?.code === 'ENOENT') return
    throw e
  }
  if (!st.isDirectory()) {
    log({ op: 'unlink', path, rimraf: true })
    try {
      await raw.unlink(path)
    } catch (e) {
      if (e?.code !== 'ENOENT') throw e
    }
    return
  }
  log({ op: 'readdir', path, rimraf: true })
  const entries = await raw.readdir(path)
  await Promise.all(entries.map(e => emulateRm(join(path, e))))
  if (delay) await sleep(delay)
  log({ op: 'rmdir', path, rimraf: true })
  try {
    await raw.rmdir(path)
  } catch (e) {
    if (e?.code === 'ENOENT') return
    log({ op: 'rmdir-error', path, code: e?.code, rimraf: true })
    throw e
  }
}

const TWO_PATHS = new Set(['rename', 'link', 'copyFile'])
const ops = [
  'mkdir',
  'writeFile',
  'appendFile',
  'rename',
  'link',
  'copyFile',
  'unlink',
  'rmdir',
  'rm',
  'readdir',
  'open',
  'stat',
  'lstat',
]
const recOf = (op, args) => {
  const path = pathOf(args[0])
  const dest = TWO_PATHS.has(op) ? pathOf(args[1]) : undefined
  if (!FIXTURE.test(path ?? '') && !FIXTURE.test(dest ?? '')) return
  const stack = stackOf()
  const rimraf = stack.some(s => s.includes('rimraf'))
  return {
    op,
    path,
    ...(dest && { dest }),
    ...(rimraf && { rimraf }),
    stack,
  }
}
for (const op of ops) {
  const orig = fs.promises[op]
  fs.promises[op] = async function (...args) {
    const rec = recOf(op, args)
    if (!rec) return orig.apply(this, args)
    log(rec)
    if (
      op === 'rm' &&
      rec.rimraf &&
      delayEnv !== undefined &&
      args[1]?.recursive
    ) {
      return emulateRm(rec.path)
    }
    try {
      return await orig.apply(this, args)
    } catch (err) {
      log({
        ...rec,
        op: `${op}-error`,
        code: err?.code,
        stack: undefined,
      })
      throw err
    }
  }
  const sync = `${op}Sync`
  const origSync = fs[sync]
  fs[sync] = function (...args) {
    const rec = recOf(sync, args)
    if (!rec) return origSync.apply(this, args)
    log(rec)
    try {
      return origSync.apply(this, args)
    } catch (err) {
      log({
        ...rec,
        op: `${sync}-error`,
        code: err?.code,
        stack: undefined,
      })
      throw err
    }
  }
}
syncBuiltinESMExports()
