import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { getConfig, getWorkspaces, writeJson } from './utils.js'
import resetCatalogVersions from './consistent-package-json.js'

const nonNCUOptions = {
  noRoot: {
    type: 'boolean',
  },
  workspace: {
    type: 'string',
    multiple: true,
  },
  omitWorkspace: {
    type: 'string',
    multiple: true,
  },
}

const replaceDepsWithCatalogVersion = () => {
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

const main = async ({ values }) => {
  const current = replaceDepsWithCatalogVersion()

  const workspaceFlags = []

  if ('omitWorkspace' in values) {
    workspaceFlags.push(
      ...execSync('pnpm -r exec npm pkg get name', {
        encoding: 'utf-8',
      })
        .trim()
        .split('\n')
        .map(p => JSON.parse(p))
        .filter(p => !values.omitWorkspace.includes(p))
        .map(w => `--workspace=${w}`),
    )
  } else if ('workspace' in values) {
    workspaceFlags.push(
      ...values.workspace.map(w => `--workspace=${w}`),
    )
  } else {
    workspaceFlags.push('--workspaces')
  }

  if ('noRoot' in values) {
    workspaceFlags.push('--no-root')
  }

  for (const v in nonNCUOptions) {
    delete values[v]
  }

  const res = execSync(
    [
      'node',
      fileURLToPath(
        import.meta.resolve('npm-check-updates/build/cli.js'),
      ),
      ...workspaceFlags,
      '--jsonUpgraded',
      ...Object.entries(values).map(([k, v]) => `--${k}=${v}`),
    ].join(' '),
    { encoding: 'utf-8' },
  )

  let jsonOutput = null
  try {
    jsonOutput = JSON.parse(res)
  } catch {
    console.log(res)
  }

  if (jsonOutput) {
    const noQuotes = v => ({
      [Symbol.for('nodejs.util.inspect.custom')]: () => v,
    })

    for (const [pjPath, deps] of Object.entries(jsonOutput)) {
      const depEntries = Object.entries(deps)
      if (!depEntries.length) continue
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

  await resetCatalogVersions()
}

main(
  parseArgs({
    strict: false,
    options: nonNCUOptions,
  }),
)
