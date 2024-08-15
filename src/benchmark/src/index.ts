import { mkdirSync, readdirSync, copyFileSync, rmSync } from 'fs'
import { resolve, extname } from 'path'
import { hrtime } from 'node:process'
import rawPackages from './1000-most-depended-packages-2019.js'

export const packages = rawPackages

export const randomPackages = (count?: number) => {
  const p = randomize(packages)
  return count ? p.slice(0, count) : p
}

export const randomize = <T>(arr: T[]): T[] =>
  [...arr].sort(() => Math.random() - 0.5)

// TODO: make these not enums
// eslint-disable-next-line no-restricted-syntax
export enum EXT {
  tgz = 'tgz',
  json = 'json',
}

// eslint-disable-next-line no-restricted-syntax
export enum UNIT {
  ns = 'ns',
  us = 'us',
  ms = 'ms',
  s = 's',
}

export const SOURCE = resolve(
  import.meta.dirname,
  '..',
  '.artificats',
)

export const timePromises = async <T>(
  items: T[],
  fn: (arg: T) => Promise<void>,
) => {
  const start = hrtime.bigint()
  const promises = []
  let errors = 0
  for (const item of items) {
    promises.push(fn(item).catch(() => (errors += 1)))
  }
  await Promise.all(promises)
  return {
    time: Number(hrtime.bigint() - start),
    errors,
  }
}

export const convertNs = (ns: number, unit?: UNIT) => {
  const c = {
    s: () => [ns * 1e-9, UNIT.s],
    ms: () => [ns * 1e-6, UNIT.ms],
    us: () => [ns * 1e-3, UNIT.us],
    ns: () => [ns, UNIT.ns],
  }
  return (
    unit ? c[unit]()
    : ns >= 1e9 ? c.s()
    : ns >= 1e6 ? c.ms()
    : ns >= 1e3 ? c.us()
    : c.ns()
  )
}

export const numToFixed = (
  n: number,
  {
    decimals = 2,
    padStart = 0,
  }: { decimals?: number; padStart?: number } = {},
) => {
  const [num, dec] = n.toFixed(decimals).split('.')
  return `${String(num).padStart(padStart)}.${dec}`
}

export const runFor = (fn: (arg: number) => void, howLong = 1000) => {
  const start = performance.now()
  const end = start + howLong
  let iterations = 0
  let errors = 0
  while (performance.now() < end) {
    try {
      fn(iterations)
    } catch {
      errors += 1
    }
    iterations += 1
  }
  const elapsed = performance.now() - start
  return {
    elapsed,
    errors,
    iterations,
    per: iterations / elapsed,
  }
}

// Dont test fs system stuff, its probably fine
/* c8 ignore start */
const copyFixtures = (targetDir: string, ext: EXT) => {
  mkdirSync(targetDir, { recursive: true })
  const source = readdirSync(SOURCE, { withFileTypes: true })
  for (const f of source) {
    if (extname(f.name) !== `.${ext}`) continue
    copyFileSync(
      resolve(f.parentPath, f.name),
      resolve(targetDir, f.name),
    )
  }
  return randomize(readdirSync(targetDir, { withFileTypes: true }))
}
export const copyTarballs = (d: string) => copyFixtures(d, EXT.tgz)

export const copyPackuments = (d: string) => copyFixtures(d, EXT.json)

export const resetDir = (dir: string) => {
  try {
    rmSync(dir, { recursive: true })
  } catch {}
  mkdirSync(dir, { recursive: true })
}
/* c8 ignore stop */
