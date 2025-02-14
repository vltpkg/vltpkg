import { readFileSync } from 'fs'
import pacote from 'pacote'
import { resolve } from 'path'
import { Pool } from '../src/pool.ts'
import {
  convertNs,
  copyTarballs,
  resetDir,
  numToFixed,
  timePromises,
} from '@vltpkg/benchmark'
import { unpack } from '../src/unpack.ts'

const DIRS = {
  source: resolve(import.meta.dirname, 'fixtures/artifacts'),
  target: resolve(import.meta.dirname, 'fixtures/extract'),
}

const artifacts = copyTarballs(DIRS.source)

const test = async (name, fn, setup) => {
  resetDir(DIRS.target)
  process.stdout.write(`${name}: `)
  const state = setup ? setup() : undefined
  const { time } = await timePromises(artifacts, a =>
    fn(
      resolve(a.parentPath, a.name),
      resolve(DIRS.target, a.name.replace(/\.tgz$/, '')),
      state,
    ),
  )
  const [elapsed, unit] = convertNs(time)
  process.stdout.write(
    numToFixed(elapsed, { decimals: 3, padStart: 2 }) + unit + '\n',
  )
}

console.log(`extracting ${artifacts.length} artifacts`)

await test(
  '@vltpkg/tar',
  async (tgz, target, p) => await p.unpack(readFileSync(tgz), target),
  () => new Pool(),
)

await test('direct unpack', async (tgz, target) =>
  unpack(readFileSync(tgz), target))

await test('pacote', (tgz, target) => pacote.extract(tgz, target))

for (const d of Object.values(DIRS)) resetDir(d)
