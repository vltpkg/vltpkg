import pacote from 'pacote'
import { resolve, join } from 'path'
import { PackageInfoClient } from '../dist/esm/index.js'
import {
  randomPackages,
  convertNs,
  numToFixed,
  packages,
  resetDir,
  timePromises,
} from '@vltpkg/benchmark'

const COUNT = Number(process.argv[2]) || packages.length

const DIRS = {
  extract: resolve(import.meta.dirname, 'fixtures/extract'),
  vlt: resolve(import.meta.dirname, 'fixtures/cache'),
  npm: resolve(import.meta.dirname, 'fixtures/cacache'),
}

const p = new PackageInfoClient({ cache: DIRS.vlt })

const run = async (title, fn, packages, unit) => {
  resetDir(DIRS.extract)
  process.stdout.write(`${title}:`)
  const { time, errors } = await timePromises(packages, fn)
  const elapsed = convertNs(time, unit)
  process.stdout.write(
    numToFixed(elapsed[0], { padStart: 5 }) + elapsed[1],
  )
  process.stdout.write((errors ? ` - errors ${errors}` : '') + '\n')
  return elapsed[1]
}

const test = async (title, { vlt, npm, count, memory }) => {
  const packages = randomPackages(count)
  if (memory) {
    // Prime the in-memory registry-client cache and delete the
    // resulting FS cache
    await Promise.all(packages.map(vlt))
    resetDir(DIRS.vlt)
  } else {
    // vlt/package-info keeps a registry client cache by default
    // so for all other benchmarks clear it before
    p.registryClient.cache.clear()
  }
  const unit = await run(`vlt (${title})`, vlt, packages)
  if (memory) {
    // pacote does not keep a packument cache by default
    // so we create one and prime it by running all packages
    // and then passing that cache along the the fn to be benchmarked
    const npmCache = new Map()
    await Promise.all(packages.map(n => npm(n, npmCache)))
    resetDir(DIRS.npm)
    const _npm = npm
    npm = (...a) => _npm(...a, npmCache)
  }
  await run(`npm (${title})`, npm, packages, unit)
}

const compare = async (
  title,
  { vlt, npm, max = COUNT, memory = false },
) => {
  const count = Math.min(COUNT, max)
  console.log(`${title} - ${count} packages`)
  resetDir(DIRS.vlt)
  resetDir(DIRS.npm)
  await test('cold fs', { vlt, npm, count })
  await test('warm fs', { vlt, npm, count })
  if (memory) {
    await test('warm in-memory', { vlt, npm, count, memory })
  }
}

console.log('smaller number is better')

await compare('resolve', {
  memory: true,
  vlt: n => p.resolve(n),
  npm: (n, c) =>
    pacote.resolve(n, { cache: DIRS.npm, packumentCache: c }),
})

await compare('manifests', {
  vlt: n => p.manifest(n),
  npm: n => pacote.manifest(n, { cache: DIRS.npm }),
})

await compare('extract', {
  // dont extract more than this or else we get rate-limited by the npm registry
  max: 500,
  vlt: n => p.extract(n, join(DIRS.extract, n)),
  npm: n =>
    pacote.extract(n, join(DIRS.extract, n), {
      cache: DIRS.npm,
    }),
})

for (const d of Object.values(DIRS)) resetDir(d)
