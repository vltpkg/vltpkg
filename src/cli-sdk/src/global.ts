import {
  cmdShimIfExists,
  findCmdShimIfExists,
} from '@vltpkg/cmd-shim'
import { joinDepIDTuple } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type {
  AddImportersDependenciesMap,
  Dependency,
  Graph,
  RemoveImportersDependenciesMap,
} from '@vltpkg/graph'
import { RollbackRemove } from '@vltpkg/rollback-remove'
import { Spec } from '@vltpkg/spec'
import { existsSync } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import {
  basename,
  delimiter,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path'
import type { PathScurry } from 'path-scurry'
import type { LoadedConfig } from './config/index.ts'
import {
  globalBinDir,
  globalWorkspaceName,
  globalWorkspacePath,
  globalWorkspacesDir,
} from './global-project.ts'
import { parseSpecArg } from './require-registry.ts'

/**
 * Bins linked by a global install. `conflicts` are names skipped because
 * another global package or a foreign file owns them (`--force`
 * overwrites).
 */
export type GlobalBins = {
  binDir: string
  bins: string[]
  conflicts: string[]
  inPath: boolean
}

export type GlobalAddArgs = {
  add: AddImportersDependenciesMap
  /** ws dirs created by this run, removed if the install fails */
  created: string[]
  /** importers to link bins for, undefined = all */
  importers?: Set<DepID>
}

export type GlobalRemoveArgs = {
  remove: RemoveImportersDependenciesMap
  dirs: string[]
}

const unsupported = [
  'workspace',
  'workspace-group',
  'lockfile-only',
] as const

/** throws `EUSAGE` for options not supported with `--global` */
export const assertGlobalOptions = (conf: LoadedConfig): void => {
  for (const name of unsupported) {
    const found = conf.values[name]
    if (found !== undefined && found !== false) {
      throw error(`--${name} is not supported with --global`, {
        code: 'EUSAGE',
        name,
        found,
      })
    }
  }
}

const workspaceId = (path: string): DepID =>
  joinDepIDTuple(['workspace', path])

// a positional as a named spec, file: paths made absolute
const globalSpec = async (
  item: string,
  conf: LoadedConfig,
): Promise<Spec> => {
  const options = conf.options
  let spec = parseSpecArg(item, options)
  if (spec.type === 'file' && spec.file && !isAbsolute(spec.file)) {
    const file = resolve(process.cwd(), spec.file)
      .split(sep)
      .join('/')
    spec = Spec.parse(spec.name, `file:${file}`, options)
  }
  if (spec.name !== '(unknown)') return spec
  const { name } = await options.packageInfo.manifest(spec, {
    from: process.cwd(),
  })
  if (!name) {
    throw error('Could not determine package name', {
      code: 'EUSAGE',
      spec,
    })
  }
  return Spec.parse(name, spec.bareSpec, options)
}

/** one workspace per positional, created if missing */
export const parseGlobalAddArgs = async (
  conf: LoadedConfig,
): Promise<GlobalAddArgs> => {
  const { positionals, projectRoot } = conf
  const add: AddImportersDependenciesMap = Object.assign(
    new Map<DepID, Map<string, Dependency>>(),
    { modifiedDependencies: positionals.length > 0 },
  )
  const created: string[] = []
  const importers = new Set<DepID>()
  try {
    for (const item of positionals) {
      const spec = await globalSpec(item, conf)
      const path = globalWorkspacePath(spec.name)
      const dir = resolve(projectRoot, path)
      const pj = resolve(dir, 'package.json')
      if (!existsSync(pj)) {
        await mkdir(dir, { recursive: true })
        created.push(dir)
        const ws = {
          name: globalWorkspaceName(spec.name),
          private: true,
        }
        await writeFile(pj, JSON.stringify(ws, null, 2) + '\n')
      }
      const id = workspaceId(path)
      importers.add(id)
      const dep: Dependency = { spec, type: 'implicit' }
      add.set(id, new Map([[spec.name, dep]]))
    }
  } catch (er) {
    await removeGlobalWorkspaces(created)
    throw er
  }
  // reload the monorepo with the new workspaces
  if (created.length) conf.resetOptions(projectRoot)
  return {
    add,
    created,
    importers: positionals.length ? importers : undefined,
  }
}

/** the workspace of each positional, which must exist */
export const parseGlobalRemoveArgs = (
  conf: LoadedConfig,
): GlobalRemoveArgs => {
  const { positionals, projectRoot } = conf
  if (!positionals.length) {
    throw error('Missing package name(s) to uninstall', {
      code: 'EUSAGE',
    })
  }
  const remove: RemoveImportersDependenciesMap = Object.assign(
    new Map<DepID, Set<string>>(),
    { modifiedDependencies: true },
  )
  const dirs: string[] = []
  for (const name of positionals) {
    const path = globalWorkspacePath(name)
    const id = workspaceId(path)
    if (remove.has(id)) continue
    const dir = resolve(projectRoot, path)
    if (!existsSync(resolve(dir, 'package.json'))) {
      throw error(`${name} is not installed globally`, {
        code: 'EUSAGE',
        found: name,
      })
    }
    remove.set(id, new Set([name]))
    dirs.push(dir)
  }
  return { remove, dirs }
}

/** rm -rf the given workspace dirs */
export const removeGlobalWorkspaces = async (
  dirs: string[],
): Promise<void> => {
  await Promise.all(
    dirs.map(dir => rm(dir, { recursive: true, force: true })),
  )
}

const shimExts = ['', '.cmd', '.ps1', '.pwsh']

// the files a bin link is made of
const linkFiles = (link: string) =>
  process.platform === 'win32' ?
    shimExts.map(ext => link + ext)
  : [link]

const isInside = (dir: string, path: string) => {
  const rel = relative(dir, path)
  return !!rel && !isAbsolute(rel) && rel.split(sep)[0] !== '..'
}

/**
 * Remove bins in `binDir` that link into any of `dirs`.
 * Returns the removed names, sorted.
 */
export const unlinkGlobalBins = async (
  binDir: string,
  dirs: string[],
  remover?: RollbackRemove,
): Promise<string[]> => {
  const entries = await readdir(binDir).catch(() => [])
  const names = new Set(
    entries.map(e => e.replace(/\.(cmd|ps1|pwsh)$/i, '')),
  )
  const removed: string[] = []
  for (const name of names) {
    const link = resolve(binDir, name)
    const found = await findCmdShimIfExists(link)
    if (!found || !dirs.some(dir => isInside(dir, found[1]))) continue
    await Promise.all(
      linkFiles(link).map(f =>
        remover ? remover.rm(f) : rm(f, { force: true }),
      ),
    )
    removed.push(name)
  }
  return removed.sort((a, b) => a.localeCompare(b, 'en'))
}

const exists = async (link: string) =>
  (
    await Promise.all(
      linkFiles(link).map(f =>
        lstat(f).then(
          () => true,
          () => false,
        ),
      ),
    )
  ).some(Boolean)

// bin names from a lockfile are not re-validated
const safeBin = (bin: string) =>
  !!bin &&
  bin === basename(bin) &&
  !bin.includes('\\') &&
  bin !== '.' &&
  bin !== '..'

const sorted = (s: Set<string>) =>
  [...s].sort((a, b) => a.localeCompare(b, 'en'))

/**
 * Link the bins of the deps of global workspaces into `<root>/bin`,
 * after removing the ones they owned. All workspaces when no
 * `importers` given.
 */
export const linkGlobalBins = async (
  graph: Graph,
  opts: { projectRoot: string; scurry: PathScurry; force?: boolean },
  importers?: Set<DepID>,
): Promise<GlobalBins> => {
  const { projectRoot, scurry, force } = opts
  const binDir = globalBinDir(projectRoot)
  const targets = [...graph.importers]
    .filter(
      i =>
        i !== graph.mainImporter &&
        (!importers || importers.has(i.id)),
    )
    .sort((a, b) => a.location.localeCompare(b.location, 'en'))
  const owned =
    importers ?
      targets.map(i => i.resolvedLocation(scurry))
    : [resolve(projectRoot, globalWorkspacesDir)]
  const remover = new RollbackRemove()
  const bins = new Set<string>()
  const conflicts = new Set<string>()
  try {
    await unlinkGlobalBins(binDir, owned, remover)
    await mkdir(binDir, { recursive: true })
    for (const importer of targets) {
      const nm = importer.nodeModules(scurry)
      for (const edge of importer.edgesOut.values()) {
        for (const [bin, path] of Object.entries(
          edge.to?.bins ?? {},
        )) {
          if (!safeBin(bin)) continue
          const link = resolve(binDir, bin)
          if (!force && (await exists(link))) {
            conflicts.add(bin)
            continue
          }
          const target = resolve(nm, edge.spec.name, path)
          if (process.platform === 'win32') {
            await cmdShimIfExists(target, link, remover)
          } else {
            await remover.rm(link)
            // already moved aside, so ours from this run (--force)
            await rm(link, { force: true })
            await symlink(relative(binDir, target), link)
          }
          bins.add(bin)
        }
      }
    }
  } catch (er) {
    await remover.rollback()
    throw er
  }
  remover.confirm()
  return {
    binDir,
    bins: sorted(bins),
    conflicts: sorted(conflicts),
    inPath: isInPath(binDir),
  }
}

/** unlink the bins of the given workspace dirs and remove them */
export const removeGlobalPackages = async (
  projectRoot: string,
  dirs: string[],
): Promise<void> => {
  await unlinkGlobalBins(globalBinDir(projectRoot), dirs)
  await removeGlobalWorkspaces(dirs)
}

/** whether `dir` is in the `PATH` */
export const isInPath = (
  dir: string,
  PATH = process.env.PATH ?? '',
): boolean => {
  const norm = (p: string) => {
    const r = resolve(p)
    return process.platform === 'win32' ? r.toLowerCase() : r
  }
  const d = norm(dir)
  return PATH.split(delimiter).some(p => !!p && norm(p) === d)
}
