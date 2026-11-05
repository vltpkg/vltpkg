import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import { install, lockfile } from '@vltpkg/graph'
import type { Graph, LockfileData } from '@vltpkg/graph'
import { unload } from '@vltpkg/vlt-json'
import { Monorepo } from '@vltpkg/workspaces'
import { minimatch } from 'minimatch'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { pipeline } from 'node:stream/promises'
import { create as tarCreate, extract as tarExtract } from 'tar'
import type { LoadedConfig } from '../config/index.ts'
import { commandUsage } from '../config/usage.ts'
import {
  deployLockfile,
  deployWorkspacesDir,
} from '../deploy-lockfile.ts'
import type { DeployWorkspace } from '../deploy-lockfile.ts'
import type { CommandFn, CommandUsage } from '../index.ts'
import { buildPackFilter } from '../pack-tarball.ts'
import { reloadConfig } from '../reload-config.ts'
import type { Views } from '../view.ts'

export const needsRegistry = true
export const needsNpmRegistry = true

export const usage: CommandUsage = () =>
  commandUsage({
    command: 'deploy',
    usage: '<target-dir>',
    description: `Copy a workspace and its production dependencies into a
                  standalone folder, ready to ship (for example in a
                  Docker image).

                  The workspace's files are copied the same way
                  'vlt pack' selects them. Workspaces it depends on are
                  copied too, as real folders inside the target, so
                  nothing links back to the project. Dependencies are
                  installed from the project's vlt-lock.json, so the
                  target gets the exact versions the project uses.

                  devDependencies are left out. Like install, it runs
                  no lifecycle scripts unless they are allowed with
                  the --allow-scripts option.`,
    examples: {
      '-w src/app ./dist/app': {
        description: 'Deploy the src/app workspace to ./dist/app',
      },
      '../app-deploy': {
        description:
          'From inside a workspace folder, deploy that workspace',
      },
    },
    options: {
      workspace: {
        value: '<path|glob>',
        description: 'The workspace to deploy.',
      },
      'allow-scripts': {
        value: '<query>',
        description:
          'Filter which packages are allowed to run lifecycle scripts using DSS query syntax.',
      },
      force: {
        description:
          'Remove the contents of the target folder if it is not empty.',
      },
    },
  })

export type DeployResult = {
  /** the deploy target folder */
  path: string
  /** the deployed package */
  name?: string
  version?: string
  /** names of the workspaces copied into the target */
  workspaces: string[]
  /** the installed graph of the target */
  graph: Graph
  /** dependencies that still need `vlt build` */
  buildQueue?: DepID[]
}

const packageCount = (graph: Graph) =>
  graph.nodes.size - graph.importers.size

export const views = {
  human: r => {
    const id = [r.name, r.version].filter(Boolean).join('@')
    const lines = [
      `📦 Deployed ${id || 'package'} to ${r.path}`,
      `📚 ${packageCount(r.graph)} dependencies installed`,
    ]
    if (r.workspaces.length) {
      lines.push(
        `🔗 ${r.workspaces.length} workspace${r.workspaces.length === 1 ? '' : 's'} copied: ${r.workspaces.join(', ')}`,
      )
    }
    if (r.buildQueue?.length) {
      lines.push(
        `🔨 ${r.buildQueue.length} packages need to be built, run "vlt build" in ${r.path} to complete the deploy.`,
      )
    }
    return lines.join('\n')
  },
  json: ({ graph, ...r }) => ({
    ...r,
    packages: packageCount(graph),
  }),
} as const satisfies Views<DeployResult>

/** The package to deploy: a workspace, or the project itself */
type Source = {
  dir: string
  id: DepID
}

const pickSource = (conf: LoadedConfig): Source => {
  const { monorepo } = conf.options
  const { projectRoot } = conf
  const paths = conf.get('workspace')
  const groups = conf.get('workspace-group')
  const all = [...(monorepo?.values() ?? [])]

  if (!all.length) {
    return { dir: projectRoot, id: joinDepIDTuple(['file', '.']) }
  }

  // options.monorepo is not filtered when the workspace was inferred
  // from the current folder, so filter it here
  const matches = all.filter(
    ws =>
      (!paths?.length ||
        paths.some(
          p =>
            ws.path === p ||
            ws.name === p ||
            ws.fullpath === p ||
            resolve(projectRoot, p) === ws.fullpath ||
            minimatch(ws.path, p),
        )) &&
      (!groups?.length || ws.groups.some(g => groups.includes(g))),
  )

  const [ws] = matches
  if (!(paths?.length || groups?.length) || !ws) {
    throw error('Choose the workspace to deploy with --workspace', {
      code: 'EUSAGE',
      validOptions: all.map(ws => ws.path),
    })
  }
  if (matches.length > 1) {
    throw error(
      'vlt deploy can only deploy one workspace at a time',
      {
        code: 'EUSAGE',
        found: matches.map(ws => ws.path),
      },
    )
  }
  return { dir: ws.fullpath, id: ws.id }
}

/** true when `dir` is `parent` or a folder inside it */
const within = (dir: string, parent: string) => {
  const rel = relative(parent, dir)
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel))
}

/**
 * Make sure the target can be written. Returns true when the folder
 * was created by this command.
 */
const prepareTarget = async (
  target: string,
  conf: LoadedConfig,
): Promise<boolean> => {
  // --force empties the target, so it must hold no source files
  const sources = [
    conf.projectRoot,
    ...[...(conf.options.monorepo?.values() ?? [])].map(
      ws => ws.fullpath,
    ),
  ]
  const found = sources.find(dir => within(dir, target))
  if (found) {
    throw error('The deploy target cannot contain project files', {
      code: 'EUSAGE',
      path: target,
      found,
    })
  }
  const st = await stat(target).catch(() => undefined)
  if (!st) {
    await mkdir(target, { recursive: true })
    return true
  }
  if (!st.isDirectory()) {
    throw error('The deploy target is not a folder', {
      code: 'EUSAGE',
      path: target,
    })
  }
  const entries = await readdir(target)
  if (entries.length) {
    if (!conf.options.force) {
      throw error(
        'The deploy target is not empty. Use --force to replace its contents',
        { code: 'EUSAGE', path: target },
      )
    }
    await emptyDir(target)
  }
  return false
}

const emptyDir = async (dir: string) => {
  for (const entry of await readdir(dir)) {
    await rm(join(dir, entry), { recursive: true, force: true })
  }
}

const depFields = [
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

/**
 * package.json as written on disk, without devDependencies, and with
 * the dependency specs in `specs` replaced.
 */
const readDeployManifest = (
  dir: string,
  specs: Record<string, string>,
) => {
  const raw = JSON.parse(
    readFileSync(join(dir, 'package.json'), 'utf8'),
  ) as Record<string, unknown>
  delete raw.devDependencies
  for (const field of depFields) {
    const deps = raw[field] as Record<string, string> | undefined
    if (!deps) continue
    for (const [name, spec] of Object.entries(specs)) {
      if (name in deps) deps[name] = spec
    }
  }
  return raw
}

/**
 * Copy the files `vlt pack` would pack from `src` into `dest`, with
 * the package.json from readDeployManifest. `skip` is left out of the
 * copy, so a target inside the package is not copied into itself.
 */
const copyPackage = async (
  src: string,
  dest: string,
  skip: string,
  specs: Record<string, string> = {},
) => {
  const manifest = readDeployManifest(src, specs)
  // buildPackFilter only reads the `files` field
  const packFilter = buildPackFilter(manifest, src)
  const skipRel =
    within(skip, src) ? relative(src, skip).replaceAll('\\', '/') : ''
  await mkdir(dest, { recursive: true })
  await pipeline(
    tarCreate(
      {
        cwd: src,
        portable: true,
        filter: (path, entry) => {
          const p = path.replace(/^\.\//, '')
          if (p === 'package.json') return false
          if (
            skipRel &&
            (p === skipRel || p.startsWith(skipRel + '/'))
          )
            return false
          return packFilter(path, entry)
        },
      },
      ['.'],
    ),
    tarExtract({ cwd: dest }),
  )
  await writeFile(
    join(dest, 'package.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  )
  return manifest
}

// lockfile options that are read from vlt.json at the top level, the
// rest go in its `config` section
const topLevelOptions = new Set(['catalog', 'catalogs', 'modifiers'])

const vltJsonFor = (
  data: LockfileData,
  workspaces: DeployWorkspace[],
  allowScripts?: string,
) => {
  const vltJson: Record<string, unknown> = {
    workspaces: workspaces.map(ws => ws.deployPath),
  }
  const config: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data.options)) {
    if (topLevelOptions.has(key)) vltJson[key] = value
    else config[key] = value
  }
  if (allowScripts) config['allow-scripts'] = allowScripts
  if (Object.keys(config).length) vltJson.config = config
  return vltJson
}

const readProjectLockfile = (projectRoot: string): LockfileData => {
  if (!existsSync(join(projectRoot, 'vlt-lock.json'))) {
    throw error(
      'vlt deploy installs from vlt-lock.json, run "vlt install" first',
      { code: 'ENOENT', path: projectRoot },
    )
  }
  return lockfile.loadData(projectRoot)
}

export const command: CommandFn<DeployResult> = async conf => {
  const [targetArg] = conf.positionals
  if (!targetArg) {
    throw error('Missing the deploy target folder', {
      code: 'EUSAGE',
      validOptions: ['vlt deploy <target-dir>'],
    })
  }
  const target = resolve(targetArg)
  const { projectRoot } = conf
  const source = pickSource(conf)
  const data = readProjectLockfile(projectRoot)
  // throws before anything is written when the deploy is not possible
  const { lockfile: deployData, workspaces } = deployLockfile(
    data,
    source.id,
  )

  const created = await prepareTarget(target, conf)
  try {
    const manifest = await copyPackage(source.dir, target, target)
    const names: string[] = []
    for (const ws of workspaces) {
      const copied = await copyPackage(
        resolve(projectRoot, ws.path),
        resolve(target, ws.deployPath),
        target,
        ws.rootSpecs,
      )
      names.push(
        typeof copied.name === 'string' ? copied.name : ws.path,
      )
    }

    const allowScripts = conf.get('allow-scripts')
    await writeFile(
      join(target, 'vlt.json'),
      JSON.stringify(
        vltJsonFor(data, workspaces, allowScripts),
        null,
        2,
      ) + '\n',
    )
    await writeFile(
      join(target, 'vlt-lock.json'),
      JSON.stringify(deployData, null, 2) + '\n',
    )

    const { buildQueue, graph } = await installTarget(
      target,
      allowScripts,
    )
    return {
      path: target,
      ...(typeof manifest.name === 'string' ?
        { name: manifest.name }
      : null),
      ...(typeof manifest.version === 'string' ?
        { version: manifest.version }
      : null),
      workspaces: names,
      graph,
      ...(buildQueue?.length ? { buildQueue } : null),
    }
  } catch (er) {
    if (created) await rm(target, { recursive: true, force: true })
    else await emptyDir(target)
    throw er
  }
}

/**
 * The frozen install fails when the project lockfile does not match
 * the package.json files. Point at the project instead of the target.
 */
const outOfDate = (er: unknown) => {
  if (
    !(er instanceof Error) ||
    !er.message.startsWith('Lockfile is out of sync')
  ) {
    return er
  }
  // keep the list of changes, it names what is out of date
  const details = er.message
    .slice(er.message.indexOf('\n'))
    .replaceAll(`./${deployWorkspacesDir}/`, './')
  return error(
    `vlt-lock.json is out of date, run "vlt install" in the project first.${details}`,
    { cause: er },
  )
}

/** Install the target from the lockfile written into it */
const installTarget = async (
  target: string,
  allowScripts?: string,
) => {
  // the target has its own vlt.json, load the config from there
  const { options } = await reloadConfig(target)
  // later reads of vlt.json are about the source project again
  const done = () => unload('project')
  const result = await install({
    ...options,
    // the workspace flags given to deploy refer to the source project
    monorepo: Monorepo.maybeLoad(target, {
      scurry: options.scurry,
      packageJson: options.packageJson,
    }),
    allowScripts: allowScripts ?? ':not(*)',
    frozenLockfile: true,
    expectLockfile: true,
  }).catch((er: unknown) => {
    done()
    throw outOfDate(er)
  })
  done()
  return result
}
