import { spawn } from 'node:child_process'
import { relative } from 'node:path'
import subset from 'semver/ranges/subset.js'
import { ROOT, readPkgJson as getPkg } from './utils.js'

const walk = (dep, ancestors = []) => [
  { path: dep.path, ancestors },
  ...Object.values(dep.dependencies ?? {}).flatMap(d =>
    walk(d, [...ancestors, dep.from ?? dep.name]),
  ),
]

const getAllProdDeps = async () => {
  const workspaces = await new Promise((res, rej) => {
    const proc = spawn(
      'pnpm',
      [
        '--filter',
        '"./src/**"',
        'list',
        '--depth=Infinity',
        '--json',
        '--prod',
        // Optional deps might not be present on the current
        // platform so we ignore them because we cant read their
        // package.json. This could mean we miss a license or engine
        // check but the risk is low.
        '--no-optional',
      ],
      {
        cwd: ROOT,
        shell: true,
      },
    )
    let output = ''
    proc.stdout.on('data', data => (output += data.toString()))
    proc.on('close', () => res(JSON.parse(output))).on('error', rej)
  })
  return Array.from(
    workspaces
      .flatMap(workspace => walk(workspace))
      .reduce((acc, d) => {
        const c = acc.get(d.path) ?? {}
        acc.set(d.path, {
          ...c,
          path: d.path,
          pkg: getPkg(d.path),
          ancestors: [
            ...new Set([...(c.ancestors ?? []), d.ancestors]),
          ],
        })
        return acc
      }, new Map())
      .values(),
  )
}

const check = (key, packages, value, ok) => {
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
}

const main = async () => {
  const deps = await getAllProdDeps()
  const allowedEngines = getPkg(ROOT).engines.node
  const checkEngines = check(
    'engines',
    deps,
    d => d.pkg.engines?.node,
    v => v === undefined || subset(allowedEngines, v),
  )
  const allowedLicenes = new Set([
    'MIT',
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
    v => allowedLicenes.has(v),
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

main()
  .then(console.log)
  .catch(e => {
    process.exitCode = 1
    console.error(e.message)
  })
