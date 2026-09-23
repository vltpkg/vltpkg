#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import pacote from 'pacote'
import { basename, resolve } from 'node:path'
import { linkFromStore } from '../src/link-tree.ts'
import { Pool } from '../src/pool.ts'
import { storeIndexPath } from '../src/store-index.ts'
import {
  convertNs,
  copyTarballs,
  resetDir,
  numToFixed,
  timePromises,
} from '@vltpkg/benchmark'
import {
  unpack,
  unpackSync,
  unpackToStoreSync,
} from '../src/unpack.ts'

const DIRS = {
  source: resolve(import.meta.dirname, 'fixtures/artifacts'),
  target: resolve(import.meta.dirname, 'fixtures/extract'),
  store: resolve(import.meta.dirname, 'fixtures/store'),
}

const artifacts = copyTarballs(DIRS.source)

// global store entries, as the explode child writes them
resetDir(DIRS.store)
for (const a of artifacts) {
  const entry = resolve(DIRS.store, a.name)
  try {
    const { index } = unpackToStoreSync(
      readFileSync(resolve(a.parentPath, a.name)),
      entry + '.tmp',
    )
    writeFileSync(storeIndexPath(entry), JSON.stringify(index))
    renameSync(entry + '.tmp', entry)
  } catch {}
}
const entryOf = (tgz: string) => resolve(DIRS.store, basename(tgz))

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
await test('pool (sync)', async (tgz, target) =>
  await p.unpack(readFileSync(tgz), target))

await test('unpackSync', async (tgz, target) =>
  unpackSync(readFileSync(tgz), target))

await test('linkFromStore', async (tgz, target) =>
  linkFromStore(entryOf(tgz), target))

await test('linkFromStore (copy)', async (tgz, target) =>
  linkFromStore(entryOf(tgz), target, { copy: true }))

await test('unpack (async)', async (tgz, target) =>
  unpack(readFileSync(tgz), target))

await test('pacote', (tgz, target) => pacote.extract(tgz, target))

for (const d of Object.values(DIRS)) resetDir(d)
