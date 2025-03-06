#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import assert from 'node:assert'
import { resolve } from 'node:path'
import { bundle } from './bundle.ts'
import { compile } from './compile.ts'

const { __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS } = process.env

const COMPILED_BINS = ['vlt']

const OPTIONAL_DEPS = [
  '@vltpkg/cli-linux-x64',
  '@vltpkg/cli-linux-arm64',
  '@vltpkg/cli-darwin-x64',
  '@vltpkg/cli-darwin-arm64',
  '@vltpkg/cli-win32-x64',
]

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

  // Omit from the package.json that gets written to the publish dir
  return { outdir, pkg: omit(rawPkg, OMIT_PKG_KEYS) }
}

const main = async () => {
  const { outdir, pkg } = parsePackage()

  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })

  // The default CLI
  if (pkg.name === 'vlt') {
    await bundle({ outdir })
    writeFiles({ outdir, pkg })
    return
  }

  // The compiled root CLI with optional deps
  if (pkg.name === '@vltpkg/cli-compiled') {
    for (const bin of COMPILED_BINS) {
      cpSync('./placeholder-bin.js', resolve(outdir, bin))
    }
    cpSync('./postinstall.cjs', resolve(outdir, 'postinstall.cjs'))

    writeFiles({
      outdir,
      pkg,
      pkgExtra: {
        bin: COMPILED_BINS.reduce<Record<string, string>>(
          (acc, bin) => {
            acc[bin] = `./${bin}`
            return acc
          },
          {},
        ),
        optionalDependencies: OPTIONAL_DEPS.reduce<
          Record<string, string>
        >((acc, dep) => {
          // Override to set the optional deps to a local tarball so
          // we can still test the postinstall
          acc[dep] =
            __VLT_INTERNAL_LOCAL_OPTIONAL_DEPS ?
              `file:./${dep.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`
            : pkg.version
          return acc
        }, {}),
        scripts: {
          postinstall: 'node postinstall.cjs',
        },
      },
    })
    return
  }

  // The platform specific CLIs
  if (/^@vltpkg\/cli-(.+)-(.+)/.exec(pkg.name)) {
    const [, platform, arch] = pkg.name.split('-')
    assert(platform, 'invalid platform in package name')
    assert(arch, 'invalid arch in package name')
    await compile({
      outdir,
      platform,
      arch,
      bins: ['vlt'],
    })
    writeFiles({
      outdir,
      pkg,
      pkgExtra: {
        os: [platform],
        cpu: [arch],
        // During a real publish, do not set bins of platform specific
        // packages because they are optional deps of the root package
        // and will be placed by the postinstall script. Setting them
        // here will conflict with the root package bins.
        bin: undefined,
      },
    })
    return
  }

  throw new Error('invalid package name')
}

await main()
