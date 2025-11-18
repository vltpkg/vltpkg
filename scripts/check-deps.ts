#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { spawn } from 'node:child_process'
import { relative } from 'node:path'
import { subset } from 'semver'
import { ROOT, readPkgJson } from './utils.ts'
import type { PackageJson } from './utils.ts'

type PnpmListItem = {
  path: string
  dependencies?: Record<string, PnpmListItem>
}

type Dependency = {
  path: string
  pkg: PackageJson
}

type DependencyWithRoot = Dependency & {
  root: PackageJson
}

const walk = (
  dep: PnpmListItem,
  root: PnpmListItem,
): { path: string; root: PnpmListItem }[] => [
  { path: dep.path, root },
  ...Object.values(dep.dependencies ?? {}).flatMap(d =>
    walk(d, root),
  ),
]

const PKG_CACHE = new Map<string, PackageJson>()
const getPkg = (path: string): PackageJson => {
  const cached = PKG_CACHE.get(path)
  if (cached) return cached
  const pkg = readPkgJson(path)
  PKG_CACHE.set(path, pkg)
  return pkg
}

const uniqBy = <T>(arr: T[], key: (t: T) => string): T[] => {
  const seen = new Set<string>()
  return arr.filter(t => {
    const k = key(t)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

const getAllProdDeps: () => Promise<{
  deps: Dependency[]
  depsWithRoot: DependencyWithRoot[]
}> = async () => {
  const workspaces = await new Promise<PnpmListItem[]>((res, rej) => {
    const proc = spawn(
      'pnpm',
      [
        '--filter',
        '"./src/**"',
        'list',
        '--depth=Infinity',
        '--json',
        '--prod',
        '--no-optional',
      ],
      {
        cwd: ROOT,
        shell: true,
      },
    )
    let output = ''
    proc.stdout.on(
      'data',
      (data: Buffer) => (output += data.toString()),
    )
    proc
      .on('close', () => res(JSON.parse(output) as PnpmListItem[]))
      .on('error', rej)
  })

  const allPackages = workspaces.flatMap(workspace =>
    walk(workspace, workspace),
  )

  return {
    deps: uniqBy(allPackages, d => d.path).map(d => ({
      path: d.path,
      pkg: getPkg(d.path),
    })),
    depsWithRoot: uniqBy(allPackages, d =>
      [d.path, d.root.path].join(';'),
    ).map(d => ({
      path: d.path,
      pkg: getPkg(d.path),
      root: getPkg(d.root.path),
    })),
  }
}

const check = <T extends Dependency | DependencyWithRoot>(
  key: string,
  packages: T[],
  value: (d: T) => string | undefined,
  ok: (v: string | undefined, pkg: T) => boolean,
) => {
  const problems = packages.filter(d => !ok(value(d), d))
  if (problems.length) {
    const indent = (n = 0) => `\n${' '.repeat(n)}`
    return (
      `The following dependencies ${key} problems were found:` +
      problems
        .map(
          d =>
            `${indent(2)}${d.pkg.name}@${d.pkg.version}` +
            `${indent(4)}${key}: ${value(d)}` +
            `${indent(4)}path: ${relative(ROOT, d.path)}`,
        )
        .join(indent())
    )
  }
  return undefined
}

const main = async () => {
  const { deps, depsWithRoot } = await getAllProdDeps()

  const checkEngines = check(
    'engines',
    depsWithRoot,
    d => d.pkg.engines?.node,
    (v, pkg) => {
      if (v === undefined) return true
      if (!pkg.root.engines?.node) return false
      return subset(pkg.root.engines.node, v)
    },
  )
  const allowedLicenes = new Set([
    'MIT',
    'MIT AND ISC',
    'MIT OR Apache-2.0',
    'ISC',
    'MPL-2.0',
    'BSD-2-Clause-Patent',
    'BlueOak-1.0.0',
    'CC0-1.0',
    'Apache-2.0',
    '0BSD',
    'BSD-2-Clause',
    'BSD-3-Clause',
    'FSL-1.1-MIT',
    '(WTFPL OR MIT)',
    '(MIT OR CC0-1.0)',
    '(BSD-3-Clause OR GPL-2.0)',
    'Unlicense',
  ])
  const checkLicenses = check(
    'license',
    deps,
    d => d.pkg.license,
    v => v === undefined || allowedLicenes.has(v),
  )
  if (checkEngines || checkLicenses) {
    throw new Error(
      [checkEngines, checkLicenses].filter(Boolean).join('\n\n'),
    )
  }
  return (
    `Successfully checked ${deps.length} production dependencies:\n` +
    deps
      .map(d => `${d.pkg.name}@${d.pkg.version} `)
      .sort()
      .join('\n')
  )
}

console.log(await main())
