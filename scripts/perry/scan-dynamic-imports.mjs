#!/usr/bin/env node
/**
 * F4 gate. `import()` below module top level is collected by neither
 * `check` nor `compile` — it compiles clean and throws `Uncaught exception:
 * undefined` at runtime. No compiler gate catches it, so this is the gate:
 * enumerate every runtime `import()` in first-party source and fail on
 * anything not in the allowlist below.
 *
 *   node scripts/perry/scan-dynamic-imports.mjs          list + gate
 *   node scripts/perry/scan-dynamic-imports.mjs --json   machine-readable
 *
 * Type positions (`typeof import('x')`, `import('x').T`) are erased and are
 * not scanned.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, join, relative } from 'node:path'

const ROOT = resolve(
  dirname(new URL(import.meta.url).pathname),
  '../..',
)
const SCAN = ['src', 'infra/build/src']
const SKIP =
  /(^|\/)(node_modules|dist|\.build[^/]*|test|tap-snapshots|fixtures|__tests__)(\/|$)/

// Known sites, each owned by a track: it is either removed by that track or
// it is a bug. Nothing else may appear.
const ALLOW = [
  {
    file: 'src/cli-sdk/src/commands/install.ts',
    spec: './install/reporter.ts',
    track: '3c',
  },
  {
    file: 'src/cli-sdk/src/commands/update.ts',
    spec: './install/reporter.ts',
    track: '3c',
  },
  {
    file: 'src/cli-sdk/src/commands/uninstall.ts',
    spec: './install/reporter.ts',
    track: '3c',
  },
  {
    file: 'src/cli-sdk/src/commands/ci.ts',
    spec: './install/reporter.ts',
    track: '3c',
  },
  {
    file: 'src/cli-sdk/src/mermaid-image-view.ts',
    spec: './render-mermaid.ts',
    track: '3e',
  },
  {
    file: 'src/cli-sdk/src/render-mermaid.ts',
    spec: '@resvg/resvg-wasm',
    track: '3e',
  },
  {
    file: 'src/cli-sdk/src/render-mermaid.ts',
    spec: 'node:fs/promises',
    track: '3e',
  },
  {
    file: 'src/cli-sdk/src/render-mermaid.ts',
    spec: 'node:module',
    track: '3e',
  },
  {
    file: 'infra/build/src/bins.ts',
    spec: '@vltpkg/cli-sdk',
    track: 'node-build-only',
  },
]

const files = []
const walk = d => {
  for (const e of readdirSync(d)) {
    const p = join(d, e)
    if (SKIP.test(relative(ROOT, p))) continue
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.m?tsx?$/.test(e)) files.push(p)
  }
}
for (const d of SCAN) walk(join(ROOT, d))

const RE = /(^|[^.\w])import\s*\(\s*(['"`])([^'"`]*)\2/g
const found = []
for (const f of files) {
  const rel = relative(ROOT, f)
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(RE)) {
    const head = m.index + m[1].length
    if (/typeof\s+$/.test(src.slice(Math.max(0, head - 10), head)))
      continue
    const rest = src.slice(head + m[0].length - m[1].length)
    // `import('x').Foo` / `import('x')['Foo']` in a type position
    if (/^\s*\)\s*[.[]/.test(rest)) continue
    found.push({
      file: rel,
      line: src.slice(0, head).split('\n').length,
      spec: m[3],
    })
  }
}

const key = s => `${s.file} ${s.spec}`
const allowed = new Set(ALLOW.map(key))
const unexpected = found.filter(s => !allowed.has(key(s)))
const stale = ALLOW.filter(a => !found.some(s => key(s) === key(a)))

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ found, unexpected, stale }, null, 2))
} else {
  for (const s of found) {
    const a = ALLOW.find(x => key(x) === key(s))
    const tag = a ? `[${a.track}]` : '[UNEXPECTED]'
    console.log(`${tag.padEnd(18)} ${s.file}:${s.line}  ${s.spec}`)
  }
  console.log(
    `${found.length} site(s), ${unexpected.length} unexpected, ${stale.length} stale`,
  )
}
for (const s of stale)
  console.error(`stale allowlist entry: ${key(s)}`)
process.exit(unexpected.length || stale.length ? 1 : 0)
