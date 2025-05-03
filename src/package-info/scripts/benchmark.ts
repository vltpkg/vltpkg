#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import pacote from 'pacote'
import { resolve, join } from 'node:path'
import { parseArgs } from 'node:util'
import { PackageInfoClient } from '../src/index.ts'
import {
  randomPackages,
  convertNs,
  numToFixed,
  resetDir,
  timePromises,
} from '@vltpkg/benchmark'
import type { UNIT } from '@vltpkg/benchmark'
import { readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import unzip from '@vltpkg/cache-unzip/unzip'
import EventEmitter from 'node:events'

process.on('uncaughtException', err => {
  if (err instanceof Error && 'code' in err && err.code === 'EPIPE') {
    // EPIPE is expected when the process is terminated sometimes
  } else {
    throw err
  }
})

const { values } = parseArgs({
  allowNegative: true,
  options: {
    packages: {
      type: 'string',
    },
    benchmark: {
      type: 'string',
      multiple: true,
    },
  },
})

const BENCHMARKS = (
  values.benchmark ?? ['resolve,manifest,extract']
).flatMap(v => v.split(','))
const PACKAGES = randomPackages(
  values.packages ? +values.packages : undefined,
)
const FIXTURES = resolve(tmpdir(), 'fixtures')
const DIRS = {
  vlt: join(FIXTURES, 'vlt-cache'),
  vltExtract: join(FIXTURES, 'vlt-extract'),
  npm: join(FIXTURES, 'npm-cache'),
  npmExtract: join(FIXTURES, 'npm-extract'),
}

const p = new PackageInfoClient({ cache: DIRS.vlt })

type BenchFn = (
  n: string,
  o?: Record<string, unknown>,
) => Promise<unknown>

interface PackageInfoOptions {
  packages: string[]
  vlt: BenchFn
  npm: BenchFn
}

const CACHE = {
  resetFs: () => {
    resetDir(DIRS.npm)
    resetDir(DIRS.vlt)
  },
  seedFs: async ({ packages, vlt, npm }: PackageInfoOptions) => {
    if (!readdirSync(DIRS.npm).length) {
      await Promise.all(packages.map(n => npm(n)))
    }
    if (!readdirSync(DIRS.vlt).length) {
      const input = new EventEmitter()
      await Promise.all(packages.map(n => vlt(n)))
      // manually do the the cache-unzip task here, to replicate a
      // fs cache that has been fully settled.
      const mp = unzip(DIRS.vlt, input)
      for (const entry of readdirSync(DIRS.vlt)) {
        if (entry.endsWith('.key')) {
          const f = DIRS.vlt + '/' + entry
          const key = readFileSync(f, 'utf8').trim()
          input.emit('data', key + '\0')
        }
      }
      input.emit('end')
      const res = await mp
      if (!res) {
        throw new Error('failed to unzip vlt cache')
      }
    }
  },
  resetMemory: () => {
    p.registryClient.cache.clear()
    // npm has no in-memory cache by default
  },
  seedMemory: async ({ packages, vlt, npm }: PackageInfoOptions) => {
    const packumentCache = new Map<string, unknown>()
    await Promise.all(packages.map(n => npm(n, { packumentCache })))
    await Promise.all(packages.map(n => vlt(n)))
    return {
      npm: { packumentCache },
      vlt: {},
    }
  },
}

const run = async (
  id: string,
  fn: (n: string) => Promise<unknown>,
  packages: string[],
  unit?: UNIT,
) => {
  process.stdout.write(`${id}:`)
  const result = await timePromises(packages, fn)
  const { time, errors, fullErrors } = result
  const elapsed = convertNs(time, unit)
  process.stdout.write(
    numToFixed(elapsed[0], { padStart: 5 }) + elapsed[1],
  )
  if (errors) {
    process.stdout.write(
      ` - errors ${errors}\n${fullErrors.join('\n')}\n`,
    )
  } else {
    process.stdout.write('\n')
  }
  return elapsed[1]
}

const test = async (
  id: 'network' | 'fs' | 'memory',
  { packages, vlt: vlt_, npm: npm_ }: PackageInfoOptions,
) => {
  const vltOptions = { cache: DIRS.vlt }
  const npmOptions = { cache: DIRS.npm, fullMetadata: true }
  const vlt: BenchFn = (n, o) => vlt_(n, { ...vltOptions, ...o })
  const npm: BenchFn = (n, o) => npm_(n, { ...npmOptions, ...o })

  switch (id) {
    case 'network':
      CACHE.resetMemory()
      CACHE.resetFs()
      break
    case 'fs':
      await CACHE.seedFs({ packages, vlt, npm })
      CACHE.resetMemory()
      break
    case 'memory': {
      const seeded = await CACHE.seedMemory({ packages, vlt, npm })
      Object.assign(vltOptions, seeded.vlt)
      Object.assign(npmOptions, seeded.npm)
      CACHE.resetFs()
      break
    }
  }

  const unit = await run(`vlt (${id})`, vlt, packages)
  await run(`npm (${id})`, npm, packages, unit)
}

const compare = async (
  id: 'resolve' | 'manifest' | 'extract',
  {
    max,
    memory = false,
    vlt,
    npm,
  }: {
    max?: number
    memory?: boolean
    vlt: BenchFn
    npm: BenchFn
  },
) => {
  if (!BENCHMARKS.includes(id)) {
    return
  }
  const packages = PACKAGES.slice(0, max ?? PACKAGES.length)
  console.log(`${id} - ${packages.length} packages`)
  const o = { vlt, npm, packages }
  await test('network', o)
  await test('fs', o)
  if (memory) {
    await test('memory', o)
  }
}

console.log('smaller number is better')

resetDir(FIXTURES)

await compare(`resolve`, {
  memory: true,
  vlt: (n, o) => p.resolve(n, o),
  npm: (n, o) => pacote.resolve(n, o),
})

await compare(`manifest`, {
  vlt: (n, o) => p.manifest(n, o),
  npm: (n, o) => pacote.manifest(n, o),
})

await compare(`extract`, {
  // dont extract more than this or else we get rate-limited by the npm registry
  max: 500,
  vlt: (n, o) => p.extract(n, join(DIRS.vltExtract, n), o),
  npm: (n, o) => pacote.extract(n, join(DIRS.npmExtract, n), o),
})
