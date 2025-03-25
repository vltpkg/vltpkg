#!/usr/bin/env -S node --experimental-strip-types --no-warnings

import { spawn, execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { getConfig, getWorkspaces, writeJson } from './utils.ts'
import resetCatalogVersions from './consistent-package-json.js'
import { run as ncu } from 'npm-check-updates'
import { fileURLToPath } from 'node:url'

/**
 * This script wraps npm-check-updates with support for pnpm catalogs
 * and filtering using pnpm syntax.
 */

const parseOptions = () => {
  const {
    'include-workspace-root': includeWorkspaceRoot,
    filter,
    ...npmCheckUpdatesOptions
  } = parseArgs({
    // Not strict because extra args are passed to npm-check-updates
    strict: false,
    options: {
      // Mimic pnpm options for consistency with other scripts
      'include-workspace-root': {
        type: 'boolean',
      },
      filter: {
        short: 'F',
        type: 'string',
        multiple: true,
      },
    },
  }).values

  const options = {
    ...npmCheckUpdatesOptions,
    root: includeWorkspaceRoot,
    workspaces: true,
  }

  if (filter) {
    const output = execSync(
      `pnpm ${filter.map(f => `--filter="${f}"`).join(' ')} exec pwd`,
      {
        encoding: 'utf-8',
      },
    ).trim()
    options.workspaces = false
    options.workspace = output.split('\n').map(path => {
      try {
        return JSON.parse(
          readFileSync(resolve(path, 'package.json'), 'utf-8'),
        ).name
      } catch (e) {
        throw new Error(`Error parsing filter`, {
          cause: {
            output,
            error: e,
          },
        })
      }
    })
  }

  return options
}

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

const npmCheckUpdates = async (current, options) => {
  // make help output work by calling CLI directly
  if (options.help) {
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

  const upgraded = await ncu({ jsonUpgraded: true, ...options })

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

const main = async () => {
  const current = removeCatalogVersions()
  await npmCheckUpdates(current, parseOptions())
  await resetCatalogVersions()
}

main()
