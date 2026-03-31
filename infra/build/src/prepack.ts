#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { bundle } from './bundle.ts'
import { BINS } from './bins.ts'

const OMIT_PKG_KEYS = ['scripts', 'devDependencies', 'publishConfig']

const writeFiles = ({
  outdir,
  pkg,
  pkgExtra,
}: {
  outdir: string
  pkg: object
  pkgExtra?: object
}) => {
  cpSync('./README.md', resolve(outdir, 'README.md'))
  cpSync('./LICENSE', resolve(outdir, 'LICENSE'))
  writeFileSync(
    resolve(outdir, 'package.json'),
    JSON.stringify({ ...pkg, ...pkgExtra }, null, 2),
    'utf8',
  )
}

const omit = <T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): Omit<T, keyof typeof keys> =>
  Object.fromEntries(
    Object.entries(obj).filter(([k]) => !keys.includes(k)),
  ) as Omit<T, keyof typeof keys>

const parsePackage = () => {
  const rawPkg = JSON.parse(
    readFileSync('./package.json', 'utf8'),
  ) as {
    name: string
    version: string
    publishConfig?: {
      directory?: string
    }
  }

  const outdir = rawPkg.publishConfig?.directory
  assert(outdir, 'missing publishConfig.directory')

  return {
    outdir,
    pkg: omit(rawPkg, OMIT_PKG_KEYS),
  }
}

const main = async () => {
  const { outdir, pkg } = parsePackage()

  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  await bundle({ outdir, hashbang: true, sourcemap: false })

  // Copy the binary wrapper if present (used by the `vlt` package
  // to try the native platform binary before falling back to JS).
  const binWrapperSrc = resolve('./bin/vlt.js')
  if (existsSync(binWrapperSrc)) {
    mkdirSync(resolve(outdir, 'bin'), { recursive: true })
    cpSync(binWrapperSrc, resolve(outdir, 'bin/vlt.js'))
  }

  const bin = BINS.reduce<Record<string, string>>((acc, bin) => {
    // vlt uses the wrapper; others use bundled JS directly
    acc[bin] =
      bin === 'vlt' && existsSync(binWrapperSrc) ?
        './bin/vlt.js'
      : `./${bin}.js`
    return acc
  }, {})

  writeFiles({ outdir, pkg, pkgExtra: { bin } })
}

await main()
