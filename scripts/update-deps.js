import { spawn, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { getConfig, getWorkspaces, writeJson } from './utils.js'
import resetCatalogVersions from './consistent-package-json.js'
import { run as ncu } from 'npm-check-updates'
import { fileURLToPath } from 'node:url'

const removeCatalogVersions = () => {
  const { catalog } = getConfig()

  const res = new Map()

  for (const path of getWorkspaces()) {
    const pjPath = resolve(path, 'package.json')
    const relPath = relative(process.cwd(), pjPath)
    const pj = JSON.parse(readFileSync(pjPath))

    for (const type of ['dependencies', 'devDependencies']) {
      const deps = pj[type]
      if (!deps) {
        continue
      }
      for (const [name, version] of Object.entries(deps)) {
        if (name in catalog && version === 'catalog:') {
          deps[name] = catalog[name]
        }
      }
    }

    res.set(relPath, {
      dependencies: pj.dependencies,
      devDependencies: pj.devDependencies,
    })

    writeJson(pjPath, pj)
  }

  return res
}

const npmCheckUpdates = async (
  current,
  { workspace, omitWorkspace, noRoot, ...cliOpts },
) => {
  // make help output work by calling CLI directly
  if (cliOpts.help) {
    return new Promise((res, rej) => {
      const proc = spawn(
        process.execPath,
        [
          fileURLToPath(
            import.meta.resolve('npm-check-updates/build/cli.js'),
          ),
          ...process.argv.slice(2),
        ],
        {
          stdio: 'inherit',
        },
      )
      proc
        .on('close', code => {
          process.exitCode = code
          res()
        })
        .on('error', rej)
    })
  }

  /**
   * @type {import('npm-check-updates').RunOptions}
   */
  const defaultOptions = {
    jsonUpgraded: true,
    root: noRoot ? false : true,
    workspaces: omitWorkspace || workspace ? false : true,
    workspace:
      omitWorkspace ?
        execSync('pnpm -r exec npm pkg get name', {
          encoding: 'utf-8',
        })
          .trim()
          .split('\n')
          .map(p => JSON.parse(p))
          .filter(p => !omitWorkspace.includes(p))
      : workspace ? workspace
      : undefined,
  }

  const upgraded = await ncu({ ...defaultOptions, ...cliOpts })

  const noQuotes = v => ({
    [Symbol.for('nodejs.util.inspect.custom')]: () => v,
  })

  for (const [pjPath, deps] of Object.entries(upgraded)) {
    const depEntries = Object.entries(deps)
    if (!depEntries.length) {
      continue
    }

    console.log(`${pjPath}`)

    const currentDeps = current.get(pjPath)
    const depsOutput = []
    for (const [name, version] of Object.entries(deps)) {
      const isDev = name in currentDeps.devDependencies
      depsOutput.push({
        name: noQuotes(name),
        type: noQuotes(isDev ? 'dev' : 'prod'),
        current: noQuotes(
          (isDev ?
            currentDeps.devDependencies
          : currentDeps.dependencies)[name],
        ),
        upgrade: noQuotes(version),
      })
    }
    console.table(depsOutput)
    console.log('')
  }
}

const main = async opts => {
  const current = removeCatalogVersions()
  await npmCheckUpdates(current, opts)
  await resetCatalogVersions()
}

main(
  parseArgs({
    strict: false,
    options: {
      noRoot: {
        type: 'boolean',
      },
      workspace: {
        short: 'w',
        type: 'string',
        multiple: true,
      },
      omitWorkspace: {
        short: 'o',
        type: 'string',
        multiple: true,
      },
    },
  }).values,
)
