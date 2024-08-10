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
  // Run everything without vlt in-memory cache
  p.registryClient.cache.clear()
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

const test = async (title, { vlt, npm, count }) => {
  const packages = randomPackages(count)
  const unit = await run(`vlt (${title})`, vlt, packages)
  await run(`npm (${title})`, npm, packages, unit)
}

const compare = async (title, { vlt, npm, max = COUNT }) => {
  resetDir(DIRS.vlt)
  resetDir(DIRS.npm)
  const count = Math.min(COUNT, max)
  console.log(`${title} - ${count} packages`)
  await test('cold', { vlt, npm, count })
  await test('warm', { vlt, npm, count })
}

console.log('smaller number is better')

await compare('resolve', {
  vlt: n => p.resolve(n),
  npm: n => pacote.resolve(n, { cache: DIRS.npm }),
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
