import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import subset from 'semver/ranges/subset.js'

const ROOT = resolve(import.meta.dirname, '..')

const getPkg = dir =>
  JSON.parse(readFileSync(join(dir, 'package.json')))

const getAllProdDeps = async () => {
  const deps = []
  const walk = (dep, from = []) => {
    deps.push({ path: dep.path, from })
    for (const child of Object.values(dep.dependencies ?? {})) {
      walk(child, [...from, dep.from ?? dep.name])
    }
  }
  walk(
    await new Promise((res, rej) => {
      // TODO: make this a `vlt query`
      const proc = spawn(
        'pnpm',
        ['list', '--depth=Infinity', '--json', '--prod'],
        {
          cwd: ROOT,
        },
      )
      let output = ''
      proc.stdout.on('data', data => (output += data.toString()))
      proc
        .on('close', () => res(JSON.parse(output)[0]))
        .on('error', rej)
    }),
  )
  return Array.from(
    deps
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
  )
}

const checkEngines = (engines, deps) => {
  const problems = deps
    .map(d => ({ ...d, path: relative(ROOT, d.path) }))
    .map(d => ({ ...d, pkg: getPkg(d.path) }))
    .filter(d => d.pkg.engines?.node)
    .filter(d => !subset(engines, d.pkg.engines.node))
  return problems.length ? problems : undefined
}

const indent = (n = 0) => `\n${' '.repeat(n)}`

const main = async () => {
  const pkg = getPkg(ROOT)
  const engines = pkg.engines.node
  const deps = await getAllProdDeps()
  const checkEngineLight = checkEngines(engines, deps)
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
  return `Successfully checked engines for ${deps.length} production dependencies`
}

main()
  .then(console.log)
  .catch(e => {
    process.exitCode = 1
    console.error(e.message)
  })
