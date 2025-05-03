#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFileSync } from 'node:fs'
import pacote from 'pacote'
import { resolve } from 'node:path'
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

const test = async (
  name: string,
  fn: (arg1: string, arg2: string) => Promise<unknown>,
) => {
  resetDir(DIRS.target)
  process.stdout.write(`${name}: `)
  const { time } = await timePromises(artifacts, a =>
    fn(
      resolve(a.parentPath, a.name),
      resolve(DIRS.target, a.name.replace(/\.tgz$/, '')),
    ),
  )
  const [elapsed, unit] = convertNs(time)
  process.stdout.write(
    numToFixed(elapsed, { decimals: 3, padStart: 2 }) + unit + '\n',
  )
}

console.log(`extracting ${artifacts.length} artifacts`)

const p = new Pool()
await test('@vltpkg/tar', async (tgz, target) =>
  await p.unpack(readFileSync(tgz), target))

await test('direct unpack', async (tgz, target) =>
  unpack(readFileSync(tgz), target))

await test('pacote', (tgz, target) => pacote.extract(tgz, target))

for (const d of Object.values(DIRS)) resetDir(d)
