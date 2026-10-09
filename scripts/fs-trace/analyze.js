// Reports fs writes that landed on a tap fixture after its cleanup
// started. Usage: node analyze.js <trace.jsonl> [--all]
// (trace from ./preload.js)
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [file, ...flags] = process.argv.slice(2)
if (!file) {
  console.error('usage: node analyze.js <trace.jsonl> [--all]')
  process.exit(1)
}
const all = flags.includes('--all')
const WRITE =
  /^(mkdir|writeFile|appendFile|rename|link|copyFile|open)(Sync)?$/
const root = p =>
  /^(.*\.tap[\\/]fixtures[\\/][^\\/]+)/.exec(p ?? '')?.[1]
const short = p => p.replace(/^.*\.tap[\\/]fixtures[\\/]/, '')
const repo =
  pathToFileURL(resolve(import.meta.dirname, '../..')).href + '/'

const byFixture = new Map()
let t0 = Infinity
for (const line of readFileSync(file, 'utf8').split('\n')) {
  if (!line) continue
  const r = JSON.parse(line)
  t0 = Math.min(t0, r.t)
  const key = root(r.path) ?? root(r.dest)
  if (!key) continue
  const list = byFixture.get(key) ?? []
  list.push(r)
  byFixture.set(key, list)
}

let late = 0
let lateFixtures = 0
let errors = 0
for (const [fixture, recs] of byFixture) {
  // tap's async rimraf of the root; the sync one in t.testdir() only
  // resets, and code under test may rimraf inside the fixture
  const start = recs.find(
    r =>
      r.rimraf &&
      r.path === fixture &&
      (r.op === 'rm' || r.op === 'readdir'),
  )
  const bad = recs.filter(
    r =>
      start &&
      r.t > start.t &&
      !r.rimraf &&
      (WRITE.test(r.op) || r.op.endsWith('-error')),
  )
  const rmdirErrors = recs.filter(r => r.op === 'rmdir-error')
  late += bad.length
  errors += rmdirErrors.length
  if (bad.length) lateFixtures++
  if (!all && !bad.length && !rmdirErrors.length) continue
  console.log(`\n=== ${short(fixture)}`)
  console.log(
    `  cleanup start: ${start ? `${(start.t - t0).toFixed(2)}ms` : 'none'}`,
  )
  for (const e of rmdirErrors) {
    console.log(
      `  !! rmdir ${e.code} ${short(e.path)} @${(e.t - t0).toFixed(2)}ms`,
    )
  }
  for (const r of bad) {
    const dest = r.dest ? ` -> ${short(r.dest)}` : ''
    const code = r.code ? ` ${r.code}` : ''
    console.log(
      `  LATE ${r.op} +${(r.t - start.t).toFixed(2)}ms ${short(r.path)}${dest}${code}`,
    )
    for (const s of (r.stack ?? []).slice(0, 8)) {
      console.log(
        `      ${s.replace(/^at /, '').replaceAll(repo, '')}`,
      )
    }
  }
}
console.log(
  `\nfixtures: ${byFixture.size}, with late writes: ${lateFixtures}, late ops: ${late}, rmdir errors: ${errors}`,
)
