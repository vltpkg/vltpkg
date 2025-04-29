#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { spawn } from 'node:child_process'
import { relative } from 'node:path'
import assert from 'node:assert'
import { subset } from 'semver'
import { ROOT, readPkgJson } from './utils.ts'
import type { PackageJson } from './utils.ts'

interface PnpmListItem {
  path: string
  name?: string
  from?: string
  dependencies?: Record<string, PnpmListItem>
}

interface PnpmList {
  name: string
  version: string
  path: string
  dependencies?: Record<string, PnpmListItem>
}

interface Dependency {
  path: string
  pkg: PackageJson
  ancestors: string[][]
}

const walk = (
  dep: PnpmListItem,
  ancestors: string[] = [],
): { path: string; ancestors: string[] }[] => [
  { path: dep.path, ancestors },
  ...Object.values(dep.dependencies ?? {}).flatMap(d =>
    walk(d, [...ancestors, dep.from ?? dep.name ?? '']),
  ),
]

const getAllProdDeps = async () => {
  const pnpmList = await new Promise<PnpmList[]>((res, rej) => {
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
      .on('close', () => res(JSON.parse(output) as PnpmList[]))
      .on('error', rej)
  })
  return Array.from(
    pnpmList
      .flatMap(workspace => walk(workspace))
      .reduce((acc, d) => {
        const c = acc.get(d.path)
        acc.set(d.path, {
          ...c,
          path: d.path,
          pkg: readPkgJson(d.path),
          ancestors: [
            ...new Set([...(c?.ancestors ?? []), d.ancestors]),
          ],
        })
        return acc
      }, new Map<string, Dependency>())
      .values(),
  )
}

const check = (
  key: string,
  packages: Dependency[],
  value: (d: Dependency) => string | undefined,
  ok: (v: string | undefined, pkg: PackageJson) => boolean,
) => {
  const problems = packages.filter(d => !ok(value(d), d.pkg))
  if (problems.length) {
    const indent = (n = 0) => `\n${' '.repeat(n)}`
    return (
      `The following dependencies ${key} problems were found:` +
      problems
        .map(
          d =>
            `${indent(2)}${d.pkg.name}@${d.pkg.version}` +
            `${indent(4)}${key}: ${value(d)}` +
            `${indent(4)}path: ${relative(ROOT, d.path)}` +
            `${indent(4)}from: ${d.ancestors.map(f => f.join(' > ')).join(indent(4 + 'from: '.length))}`,
        )
        .join(indent())
    )
  }
  return undefined
}

const main = async () => {
  const deps = await getAllProdDeps()
  const allowedEngines = readPkgJson(ROOT).engines?.node
  assert(allowedEngines, 'No engines defined in package.json')

  const checkEngines = check(
    'engines',
    deps,
    d => d.pkg.engines?.node,
    v => v === undefined || subset(allowedEngines, v),
  )
  const allowedLicenes = new Set([
    'MIT',
    'MIT AND ISC',
    'ISC',
    'BSD-2-Clause-Patent',
    'BlueOak-1.0.0',
    'Apache-2.0',
    '0BSD',
    'BSD-3-Clause',
    '(WTFPL OR MIT)',
    '(MIT OR CC0-1.0)',
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
