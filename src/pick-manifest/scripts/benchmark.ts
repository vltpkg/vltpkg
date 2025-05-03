#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { readFileSync } from 'node:fs'
// @ts-expect-error - no types
import npmPickManifest from 'npm-pick-manifest'
import { pickManifest } from '../src/index.ts'
import type { PickManifestOptions } from '../src/index.ts'
import { resolve } from 'node:path'
import {
  copyPackuments,
  numToFixed,
  resetDir,
  runFor,
} from '@vltpkg/benchmark'
import type { Packument } from '@vltpkg/types'

const source = resolve(import.meta.dirname, 'fixtures/artifacts')

const packuments = copyPackuments(source).map(
  p =>
    JSON.parse(
      readFileSync(resolve(p.parentPath, p.name), 'utf-8'),
    ) as Packument,
)

const test = (
  name: string,
  comp: string,
  fn: (p: Packument) => unknown,
  howLong: number,
): void => {
  process.stdout.write(`${name} ${comp.padEnd(3)}`)
  const { errors, iterations, per } = runFor(i => {
    const packument = packuments[i % packuments.length]
    if (!packument) {
      throw new Error('No packument found')
    }
    return fn(packument)
  }, howLong)
  const errMsg =
    errors ?
      ` - errors: ${numToFixed((errors / iterations) * 100, { decimals: 1 })}%`
    : ''
  process.stdout.write(
    numToFixed(per, { padStart: 3, decimals: 4 }) + errMsg + '\n',
  )
}

const compare = (
  comp: string,
  arg: string,
  options?: PickManifestOptions,
): void => {
  test('vlt', comp, p => pickManifest(p, arg, options), 1000)
  test(
    'npm',
    comp,
    p => (npmPickManifest as typeof pickManifest)(p, arg, options),
    1000,
  )
}

console.log('picks per ms (bigger number is better)')
compare('*', '*')
compare('>=', '>=1.2.3')
compare('^', '^1.2.3')
compare('bf', '*', { before: '2020-01-01' })

resetDir(source)
