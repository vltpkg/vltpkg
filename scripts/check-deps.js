import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import {
  satisfies,
  parseRange,
} from '../src/semver/dist/esm/index.js'

const ROOT = resolve(import.meta.dirname, '..')

const getPkg = dir =>
  JSON.parse(readFileSync(join(dir, 'package.json')))

const getAllProdDeps = () => {
  const deps = []
  const walk = (dep, from = []) => {
    deps.push({ path: dep.path, from })
    for (const child of Object.values(dep.dependencies ?? {})) {
      walk(child, [...from, dep.from ?? dep.name])
    }
  }
  // TODO: make this a `vlt query`
  const proc = spawnSync(
    'pnpm',
    ['list', '--depth=Infinity', '--json', '--prod'],
    {
      cwd: ROOT,
    },
  )
  walk(JSON.parse(proc.stdout.toString())[0])
  return [
    ...deps
      .reduce((acc, d) => {
        const c = acc.get(d.path) ?? {}
        acc.set(d.path, {
          ...c,
          path: d.path,
          from: [...(c.from ?? []), d.from],
        })
        return acc
      }, new Map())
      .values(),
  ]
}

const checkEngines = (engines, deps) => {
  // Hacky way to get the base version from a range
  // Only works with simple ranges that we use in our engines
  // TODO: implement intersects/subset in @vltpkg/semver
  const ourVersions = parseRange(engines).set.map(s => s.tuples[0][1])
  const problems = deps
    .map(d => ({ ...d, path: relative(ROOT, d.path) }))
    .map(d => ({ ...d, pkg: getPkg(d.path) }))
    .filter(d => d.pkg.engines?.node)
    .filter(
      d => !ourVersions.every(v => satisfies(v, d.pkg.engines.node)),
    )
  return problems.length ? problems : undefined
}

const indent = (n = 0) => `\n${' '.repeat(n)}`

const main = () => {
  const pkg = getPkg(ROOT)
  const engines = pkg.engines.node
  const checkEngineLight = checkEngines(engines, getAllProdDeps())
  if (checkEngineLight) {
    throw new Error(
      `The following dependencies engines conflict ${pkg.name} \`${engines}\`:` +
        checkEngineLight
          .map(
            d =>
              `${indent(2)}${d.pkg.name}@${d.pkg.version}` +
              `${indent(4)}engines: ${d.pkg.engines.node}` +
              `${indent(4)}path: ${d.path}` +
              `${indent(4)}from: ${d.from.map(f => f.join(' > ')).join(indent(4 + 'from: '.length))}`,
          )
          .join(indent()),
    )
  }
}

main()
