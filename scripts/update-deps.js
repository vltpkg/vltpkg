import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { spawnSync } from 'node:child_process'
import { packument } from '../src/package-info/dist/esm/index.js'
import { pickManifest } from '../src/pick-manifest/dist/esm/index.js'
import * as semver from '../src/semver/dist/esm/index.js'
import {
  getWorkspaces as getWorkspaces_,
  configPath,
  getConfig,
  writeYaml,
  ROOT,
  readPkgJson,
  writeJson,
} from './utils.js'

const getWorkspaces = () =>
  new Map(
    getWorkspaces_().map(path => [
      resolve(path, 'package.json'),
      readPkgJson,
    ]),
  )

const spawn = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: 'inherit',
    ...opts,
  })

const spawnRes = (cmd, args) =>
  spawn(cmd, args, {
    stdio: 'pipe',
    encoding: 'utf8',
  })
    .stdout.trim()
    .split('\n')
    .map(l => l.trim())

const shouldReset = (oldSpec, newSpec) => {
  try {
    // Hacky way to get the base version from a range
    // Only works with simple ranges that we use in our engines
    // TODO: implement intersects/subset in @vltpkg/semver
    const v = semver.parseRange(newSpec).set[0].tuples[0][1]
    return semver.satisfies(v, oldSpec)
  } catch {
    return false
  }
}

const getModified = () => {
  return spawnRes('git', ['status', '--porcelain'])
    .filter(l => l.startsWith('M '))
    .map(l => l.replace('M ', ''))
    .filter(
      l =>
        l === 'package.json' ||
        l === 'pnpm-lock.yaml' ||
        l === 'pnpm-workspace.yaml' ||
        /\/package.json$/.test(l),
    )
}

const updateCatalog = async (config, { latest }) => {
  for (const [name, spec] of Object.entries(config.catalog)) {
    const { version } = pickManifest(
      await packument(name),
      latest ? 'latest' : spec,
    )
    if (latest && semver.satisfies(version, spec)) {
      continue
    }
    console.log(`Updating catalog ${name} to ^${version}`)
    config.catalog[name] = `^${version}`
  }

  return config
}

const resetDependencies = (oldPackages, newPackages, { latest }) => {
  if (!latest) {
    // If we are not updating across semver ranges than undo any updates to
    // package.json or catalog specs since we only want the lockfile updated
    spawn('git', [
      'checkout',
      'package.json',
      'pnpm-workspace.yaml',
      'src/*/package.json',
    ])
    return
  }
  // Otherwise only reset dep changes that are compatible with the previous spec
  const reset = (p, pj, type) => {
    for (const [name, spec] of Object.entries(pj[type] ?? {})) {
      const oldSpec = oldPackages.get(p)[type][name]
      if (oldSpec !== spec && shouldReset(oldSpec, spec)) {
        pj[type][name] = oldSpec
      }
    }
  }
  for (const [p, pj] of newPackages.entries()) {
    reset(p, pj, 'dependencies')
    reset(p, pj, 'devDependencies')
    writeJson(p, pj)
  }
}

/**
 * This script will update all dependencies to either the latest in the current
 * semver range or to the `latest` tag if `--latest` is provided. This relies
 * on pnpm's `update` command and makes assumptions about our own use such as
 * enforcing use of the `^` range operator.
 * TODO: Move this code into our own update command and make it do other things
 * like only optionally update package.json specs and support for widening semver
 * ranges for specific deps or dep types.
 */
const main = async ({ latest, force }) => {
  const previousModified = getModified()
  if (previousModified.length) {
    if (!force) {
      throw new Error(
        `The following files can't have local changes prior to running this script.\n` +
          `Run with \`--force\` to have this script reset the changes in those files.\n  ` +
          previousModified.join('\n  '),
      )
    }
    for (const f of previousModified) {
      spawn('git', ['checkout', f])
    }
  }

  const config = getConfig()
  const previousPackages = getWorkspaces()

  // pnpm does not provide a way to update catalogs so we do it manually
  const newConfig = await updateCatalog(config, { latest })
  await writeYaml(configPath, newConfig)

  spawn('pnpm', [
    '--recursive',
    ...(latest ? ['--latest'] : []),
    // ignore scripts during update because compiling TS can error depending on
    // the order packages are built if all deps arent updated yet
    '--ignore-scripts',
    'update',
  ])

  resetDependencies(previousPackages, getWorkspaces(), {
    latest,
  })

  // Run install again after the package.json specs were potentially reset
  // since those are saved into the lockfile
  spawn('pnpm', ['install'])

  for (const f of getModified()) {
    if (f === 'pnpm-lock.yaml') {
      continue
    }
    console.log(
      [
        f,
        ...spawnRes('git', [
          '--no-pager',
          'diff',
          '--no-color',
          f,
        ]).slice(5),
        '',
      ].join('\n'),
    )
  }
}

// If you want to update everything (including with potential breaking changes)
// the best way to run this script is as follows:
// - node scripts/update-deps.js
// - git add -A && git commit -m "refresh lockfile"
// - node scripts/update-deps.js --latest
// - git add -A && git commit -m "update major versions"
main(
  parseArgs({
    options: {
      latest: { type: 'boolean' },
      force: { type: 'boolean' },
    },
  }).values,
)
