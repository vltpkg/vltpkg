#!/usr/bin/env node
/**
 * Artifact-comparison harness for the Perry port (plan Phase 2).
 *
 * hyperfine drives the existing suite but reports wall/user only and can
 * compare just one binary per run. This adds the four things the port needs:
 *
 *   a. artifact parameterization - N named artifacts over the same fixture
 *      set, so a Node build and a compiled binary are measured identically;
 *   b. a stable-host protocol - warmup rounds, N>=10 measured rounds,
 *      round-robin interleaving so host drift hits every artifact equally;
 *   c. max-RSS - collected per run via GNU time (hyperfine has no RSS);
 *   d. an acceptance rule - an A/A noise band per fixture/variation/metric,
 *      recorded in noise-bands.json; a regression is a median ratio outside
 *      that band.
 *
 * Usage:
 *   node --experimental-strip-types infra/cli-benchmarks/scripts/bench.ts \
 *     --fixture abbrev --variation clean \
 *     --artifact node=./.build-bundle/vlt.js --artifact perry=./.build-perry/vlt
 *
 *   --aa                measure the noise band instead: runs the FIRST
 *                       artifact under two labels and writes the observed
 *                       spread to noise-bands.json
 *   --runs N            measured rounds per artifact (default 10)
 *   --warmup N          unmeasured rounds first (default 2)
 *   --args '...'        install args (default: install --view=human --cache=.vlt-cache)
 *   --out FILE          write the full result JSON here
 *   --band-floor PCT    minimum band width, default 3
 *
 * An artifact value is a command line: `perry=./vlt` or
 * `node=node ./.build-bundle/vlt.js`. It is exec'd, not shelled out, so no
 * quoting rules apply beyond splitting on spaces.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { cpus } from 'node:os'

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '../../..')
const BENCH = join(ROOT, 'infra/cli-benchmarks')
const HELPERS = join(BENCH, 'scripts/clean-helpers.sh')
const BANDS = join(BENCH, 'noise-bands.json')

const die = m => { console.error(m); process.exit(1) }
const argv = process.argv.slice(2)
const flag = (name, def) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? def : argv[i + 1]
}
const has = name => argv.includes(`--${name}`)
const artifacts = []
for (let i = 0; i < argv.length; i++) {
  if (argv[i] !== '--artifact') continue
  const v = argv[i + 1] ?? ''
  const eq = v.indexOf('=')
  if (eq === -1) die(`--artifact needs name=command, got ${v}`)
  artifacts.push({ name: v.slice(0, eq), cmd: v.slice(eq + 1).split(/\s+/) })
}

const fixture = flag('fixture', 'abbrev')
const variation = flag('variation', 'clean')
const runs = Number(flag('runs', 10))
const warmup = Number(flag('warmup', 2))
const bandFloor = Number(flag('band-floor', 3)) / 100
const cmdArgs = (flag('args', 'install --view=human --cache=.vlt-cache')).split(/\s+/)
const aa = has('aa')

if (!artifacts.length) die('at least one --artifact name=command is required')
if (runs < 10) console.error(`warning: --runs ${runs} is below the protocol minimum of 10`)

const cwd = join(BENCH, 'fixtures', fixture)
if (!existsSync(cwd)) die(`no such fixture: ${fixture}`)

// What each variation PRESERVES between runs; everything else is removed.
// Mirrors scripts/variations/*.sh so numbers stay comparable to the
// hyperfine suite.
const PREPARE = {
  clean: ['clean_all'],
  lockfile: ['clean_all_cache', 'clean_node_modules'],
  'cache-lockfile': ['clean_node_modules'],
  'cache-lockfile-node-modules': [],
}
if (!(variation in PREPARE)) die(`unknown variation: ${variation}`)

// GNU time is the RSS source; BSD/busybox time does not take -f.
const TIME = ['/usr/bin/time', '-f', '%e %U %S %M %x']
if (!existsSync(TIME[0])) die('/usr/bin/time (GNU time) is required for max-RSS collection')

const prepare = () => {
  const fns = PREPARE[variation]
  if (fns.length)
    spawnSync('bash', [HELPERS, ...fns], { cwd, stdio: 'ignore' })
}
const setup = () => spawnSync('bash', [HELPERS, 'clean_all'], { cwd, stdio: 'ignore' })

/** one measured invocation; returns null if the command failed */
const measure = art => {
  const r = spawnSync(TIME[0], [...TIME.slice(1), ...art.cmd, ...cmdArgs], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  const line = (r.stderr ?? '').trim().split('\n').pop() ?? ''
  const m = line.match(/^([\d.]+) ([\d.]+) ([\d.]+) (\d+) (\d+)$/)
  if (!m) return { error: `unparseable time output: ${line.slice(0, 120)}` }
  const [, wall, user, sys, rssKb, status] = m
  if (status !== '0') return { error: `exit ${status}` }
  return {
    wall: Number(wall),
    user: Number(user),
    sys: Number(sys),
    rss: Number(rssKb) / 1024,
  }
}

const median = xs => {
  const s = [...xs].sort((a, b) => a - b)
  const h = s.length >> 1
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2
}
const stats = xs => ({
  n: xs.length,
  median: median(xs),
  min: Math.min(...xs),
  max: Math.max(...xs),
  mean: xs.reduce((a, b) => a + b, 0) / xs.length,
})

const lanes = aa
  ? [
      { name: `${artifacts[0].name}#a`, cmd: artifacts[0].cmd },
      { name: `${artifacts[0].name}#a2`, cmd: artifacts[0].cmd },
    ]
  : artifacts

const samples = Object.fromEntries(lanes.map(l => [l.name, []]))
const failures = []

console.log(
  `${fixture}/${variation}: ${lanes.map(l => l.name).join(' vs ')}  ` +
    `warmup=${warmup} runs=${runs}`,
)
setup()
for (let round = 0; round < warmup + runs; round++) {
  // rotate lane order every round so host drift is shared, not attributed
  const order = lanes.map((_, i) => lanes[(i + round) % lanes.length])
  for (const lane of order) {
    prepare()
    const r = measure(lane)
    if (r.error) {
      failures.push({ lane: lane.name, round, error: r.error })
      continue
    }
    if (round >= warmup) samples[lane.name].push(r)
  }
  process.stdout.write(round < warmup ? 'w' : '.')
}
process.stdout.write('\n')
setup()

if (failures.length)
  console.error(`${failures.length} failed run(s); first: ${JSON.stringify(failures[0])}`)
for (const [name, rows] of Object.entries(samples))
  if (!rows.length) die(`no successful runs for ${name}`)

const METRICS = ['wall', 'user', 'sys', 'rss']
const summary = {}
for (const [name, rows] of Object.entries(samples))
  summary[name] = Object.fromEntries(METRICS.map(m => [m, stats(rows.map(r => r[m]))]))

const base = lanes[0].name
const ratios = {}
for (const lane of lanes.slice(1))
  ratios[lane.name] = Object.fromEntries(
    METRICS.map(m => [m, summary[lane.name][m].median / summary[base][m].median]),
  )

const bands = existsSync(BANDS) ? JSON.parse(readFileSync(BANDS, 'utf8')) : {}
const bandKey = `${fixture}/${variation}`

if (aa) {
  // the band is how far one artifact drifts from itself on this host
  const observed = Object.fromEntries(
    METRICS.map(m => [m, Math.abs(ratios[lanes[1].name][m] - 1)]),
  )
  bands[bandKey] = {
    $comment:
      'A/A noise band: |median ratio - 1| measured running one artifact against itself. A regression is a median ratio above 1 + band.',
    measured: Object.fromEntries(METRICS.map(m => [m, Number(observed[m].toFixed(4))])),
    band: Object.fromEntries(
      METRICS.map(m => [m, Number(Math.max(observed[m], bandFloor).toFixed(4))]),
    ),
    runs,
    host: { cpus: cpus().length },
  }
  writeFileSync(BANDS, JSON.stringify(bands, null, 2) + '\n')
  console.log(`A/A band for ${bandKey}:`)
  for (const m of METRICS)
    console.log(`  ${m.padEnd(5)} ${(observed[m] * 100).toFixed(2)}% -> band ${(bands[bandKey].band[m] * 100).toFixed(2)}%`)
} else {
  const band = bands[bandKey]?.band
  console.log(`median (${base} = baseline):`)
  for (const m of METRICS) {
    const unit = m === 'rss' ? 'MB' : 's'
    const row = [`  ${m.padEnd(5)} ${base}=${summary[base][m].median.toFixed(m === 'rss' ? 1 : 3)}${unit}`]
    for (const lane of lanes.slice(1)) {
      const r = ratios[lane.name][m]
      const verdict =
        !band ? '' : r > 1 + band[m] ? '  REGRESSION' : r < 1 - band[m] ? '  improvement' : '  within band'
      row.push(
        `${lane.name}=${summary[lane.name][m].median.toFixed(m === 'rss' ? 1 : 3)}${unit} ` +
          `(${r.toFixed(3)}x)${verdict}`,
      )
    }
    console.log(row.join('  '))
  }
  if (!band)
    console.log(`no A/A band recorded for ${bandKey} - run with --aa first; deltas above are unqualified`)
}

const out = flag('out')
if (out) {
  mkdirSync(dirname(resolve(out)), { recursive: true })
  writeFileSync(
    resolve(out),
    JSON.stringify(
      { fixture, variation, runs, warmup, args: cmdArgs, lanes: lanes.map(l => ({ name: l.name, cmd: l.cmd })), summary, ratios, band: bands[bandKey]?.band ?? null, failures, samples },
      null,
      2,
    ) + '\n',
  )
  console.log(`wrote ${out}`)
}

// exit non-zero on a regression outside the band, so CI can gate on it
const band = bands[bandKey]?.band
if (!aa && band) {
  const bad = []
  for (const lane of lanes.slice(1))
    for (const m of METRICS)
      if (ratios[lane.name][m] > 1 + band[m]) bad.push(`${lane.name}.${m}`)
  if (bad.length) {
    console.error(`outside noise band: ${bad.join(', ')}`)
    process.exit(1)
  }
}
