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
import { existsSync, readdirSync, realpathSync } from 'node:fs'
import {
  lstat,
  mkdir,
  readdir,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { homedir } from 'node:os'
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
import type {
  GlobalBinDirSource,
  ResolvedGlobalBinDir,
} from './global-bin-dir.ts'
import {
  globalBinDir,
  globalWorkspaceName,
  globalWorkspacePath,
  globalWorkspacesDir,
  samePath,
} from './global-project.ts'
import { readGlobalState, updateGlobalState } from './global-state.ts'
import type { GlobalState } from './global-state.ts'
import { parseSpecArg } from './require-registry.ts'
import {
  detectShell,
  prettyPath,
  shellPathCommand,
  shellRcFile,
} from './shell.ts'
import type { Shell, ShellOptions } from './shell.ts'

/**
 * Bins linked by a global install. `conflicts` are names skipped because
 * another global package or a foreign file owns them (`--force`
 * overwrites).
 */
export type GlobalBins = {
  binDir: string
  source: GlobalBinDirSource
  bins: string[]
  conflicts: string[]
  inPath: boolean
  /** other bin dirs that had links removed */
  otherDirs: string[]
  /** self dir passed over as unwritable, when worth saying */
  notWritable?: string
}

export type LinkGlobalBinsOptions = {
  projectRoot: string
  scurry: PathScurry
  force?: boolean
  binDir: ResolvedGlobalBinDir
  /** tried once when the self dir refuses writes */
  fallback?: () => Promise<ResolvedGlobalBinDir>
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
  // a bare name gets the default tag, like npm
  if (spec.type === 'registry' && !spec.bareSpec) {
    return Spec.parse(spec.name, options.tag, options)
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

// `@s+p-ws` -> `@s/p`
const wsPackageName = (dir: string) =>
  dir.replace(/-ws$/, '').replace('+', '/')

/**
 * The workspace of `name`. Matched by exact case, since the fs may
 * ignore it but workspace ids don't. `variant` is an installed name
 * that differs only in case.
 */
const findWorkspace = (projectRoot: string, name: string) => {
  const path = globalWorkspacePath(name)
  const dir = resolve(projectRoot, path)
  const base = basename(path)
  const entries = readdirSync(
    resolve(projectRoot, globalWorkspacesDir),
  )
  const variant = entries.find(
    e => e !== base && e.toLowerCase() === base.toLowerCase(),
  )
  return {
    path,
    dir,
    exists:
      entries.includes(base) &&
      existsSync(resolve(dir, 'package.json')),
    variant: variant && wsPackageName(variant),
  }
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
      const { path, dir, exists, variant } = findWorkspace(
        projectRoot,
        spec.name,
      )
      if (!exists) {
        if (variant) {
          throw error(
            `${spec.name} differs only in case from global package ${variant}`,
            { code: 'EUSAGE', found: spec.name },
          )
        }
        await mkdir(dir, { recursive: true })
        created.push(dir)
        const ws = {
          name: globalWorkspaceName(spec.name),
          private: true,
        }
        await writeFile(
          resolve(dir, 'package.json'),
          JSON.stringify(ws, null, 2) + '\n',
        )
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
    const { path, dir, exists, variant } = findWorkspace(
      projectRoot,
      name,
    )
    const id = workspaceId(path)
    if (remove.has(id)) continue
    if (!exists) {
      throw error(`${name} is not installed globally`, {
        code: 'EUSAGE',
        found: name,
        ...(variant ? { validOptions: [variant] } : null),
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

const realOr = (p: string) => realpath(p).catch(() => p)

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
  const entries = await readdir(binDir, {
    withFileTypes: true,
  }).catch(() => [])
  const names = new Set<string>()
  for (const e of entries) {
    const name = e.name.replace(/\.(cmd|ps1|pwsh)$/i, '')
    // never read plain files, they may be big binaries
    if (name !== e.name || e.isSymbolicLink()) names.add(name)
  }
  // links may use either spelling of a symlinked dir
  const roots = [...dirs, ...(await Promise.all(dirs.map(realOr)))]
  const removed: string[] = []
  for (const name of names) {
    const link = resolve(binDir, name)
    const found = await findCmdShimIfExists(link)
    if (!found || !roots.some(dir => isInside(dir, found[1])))
      continue
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

const dedupe = (dirs: string[]) =>
  dirs.filter((d, i) => dirs.findIndex(x => samePath(x, d)) === i)

// recorded dirs and `<root>/bin`, but not `current`
const otherBinDirs = async (
  root: string,
  current: string,
  state: GlobalState,
) => {
  const g = await realpath(globalBinDir(root)).catch(() => undefined)
  return dedupe([...(state.binDirs ?? []), ...(g ? [g] : [])]).filter(
    d => !samePath(d, current),
  )
}

const isDir = (d: string) =>
  stat(d).then(
    s => s.isDirectory(),
    () => false,
  )

const isPermError = (er: unknown) =>
  er instanceof Error &&
  /^(EACCES|EPERM)$/.test(String((er as NodeJS.ErrnoException).code))

// --force in a shared dir: only links and shims, never plain files
// (other tools' binaries) or the running vlt or node
const replaceable = async (link: string, keep: string[]) => {
  if (
    process.platform !== 'win32' &&
    !(await lstat(link)).isSymbolicLink()
  ) {
    return false
  }
  const found = await findCmdShimIfExists(link)
  if (!found) return false
  const to = await realOr(found[1])
  return !keep.some(k => samePath(k, to))
}

type Linked = {
  binDir: ResolvedGlobalBinDir
  state: GlobalState
  bins: string[]
  conflicts: string[]
  otherDirs: string[]
}

const linkBins = async (
  graph: Graph,
  opts: LinkGlobalBinsOptions,
  importers?: Set<DepID>,
): Promise<Linked> => {
  const { projectRoot, scurry, force } = opts
  const { dir: binDir, source } = opts.binDir
  const state = await readGlobalState(projectRoot)
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
  const keep =
    force && source !== 'global-dir' ?
      await Promise.all(
        [process.execPath, ...process.argv.slice(1, 2)].map(realOr),
      )
    : undefined
  const remover = new RollbackRemove()
  const bins = new Set<string>()
  const conflicts = new Set<string>()
  const otherDirs: string[] = []
  const created: string[] = []
  try {
    await unlinkGlobalBins(binDir, owned, remover)
    for (const d of await otherBinDirs(projectRoot, binDir, state)) {
      // best effort, an old dir may be gone or read-only
      const removed = await unlinkGlobalBins(d, owned, remover).catch(
        () => [],
      )
      if (removed.length) otherDirs.push(d)
    }
    await mkdir(binDir, { recursive: true })
    for (const importer of targets) {
      // canonical, like binDir: short relative links
      const nm = await realOr(importer.nodeModules(scurry))
      for (const edge of importer.edgesOut.values()) {
        for (const [bin, path] of Object.entries(
          edge.to?.bins ?? {},
        )) {
          if (!safeBin(bin)) continue
          const target = resolve(nm, edge.spec.name, path)
          // win32 shims need the target, posix links may dangle
          const win32 = process.platform === 'win32'
          if (win32 && !(await stat(target).catch(() => false))) {
            continue
          }
          const link = resolve(binDir, bin)
          if (
            (await exists(link)) &&
            (!force || (keep && !(await replaceable(link, keep))))
          ) {
            conflicts.add(bin)
            continue
          }
          if (win32) {
            created.push(link)
            await cmdShimIfExists(target, link, remover)
          } else {
            await remover.rm(link)
            // already moved aside, so ours from this run (--force)
            await rm(link, { force: true })
            created.push(link)
            await symlink(relative(binDir, target), link)
          }
          bins.add(bin)
        }
      }
    }
  } catch (er) {
    // the remover only restores what it moved aside
    await Promise.all(
      created.flatMap(linkFiles).map(f => rm(f, { force: true })),
    )
    await remover.rollback()
    throw er
  }
  remover.confirm()
  return {
    binDir: opts.binDir,
    state,
    bins: sorted(bins),
    conflicts: sorted(conflicts),
    otherDirs,
  }
}

// after linking, so a failed write never triggers the fallback
const recordBinDir = async (
  projectRoot: string,
  { binDir, state, bins, conflicts, otherDirs }: Linked,
): Promise<GlobalBins> => {
  const { dir, source, inPath, notWritable } = binDir
  // local-bin notice once, global-dir reason with every PATH warning
  const shown =
    (bins.length > 0 || conflicts.length > 0) &&
    (source === 'global-dir' || !state.localBinNoticed)
  const why = shown ? notWritable : undefined
  const notice = !!why && source === 'local-bin'
  const recorded: string[] = []
  for (const d of state.binDirs ?? []) {
    if (await isDir(d)) recorded.push(d)
  }
  await updateGlobalState(projectRoot, s => ({
    ...s,
    binDirs: dedupe([...recorded, dir]),
    ...(notice ? { localBinNoticed: true } : {}),
  }))
  return {
    binDir: dir,
    source,
    bins,
    conflicts,
    inPath,
    otherDirs,
    ...(why ? { notWritable: why } : {}),
  }
}

/**
 * Link the bins of the deps of global workspaces into `opts.binDir`,
 * after removing the ones they owned there and in other bin dirs used
 * before. All workspaces when no `importers` given.
 */
export const linkGlobalBins = async (
  graph: Graph,
  opts: LinkGlobalBinsOptions,
  importers?: Set<DepID>,
): Promise<GlobalBins> => {
  let linked: Linked
  try {
    linked = await linkBins(graph, opts, importers)
  } catch (er) {
    const { binDir, fallback } = opts
    // access(W_OK) can pass where writes fail: win32, macOS TCC
    if (binDir.source !== 'self' || !fallback || !isPermError(er)) {
      throw er
    }
    linked = await linkBins(
      graph,
      { ...opts, binDir: await fallback() },
      importers,
    )
  }
  return recordBinDir(opts.projectRoot, linked)
}

/**
 * Unlink the bins of the given workspace dirs from `binDir` (default
 * `<root>/bin`) and other bin dirs used before, and remove them.
 */
export const removeGlobalPackages = async (
  projectRoot: string,
  dirs: string[],
  binDir?: string,
): Promise<void> => {
  const current = binDir ?? globalBinDir(projectRoot)
  await unlinkGlobalBins(current, dirs)
  const state = await readGlobalState(projectRoot)
  for (const d of await otherBinDirs(projectRoot, current, state)) {
    await unlinkGlobalBins(d, dirs).catch(() => [])
  }
  await removeGlobalWorkspaces(dirs)
}

/** whether `dir` is in the `PATH` */
export const isInPath = (
  dir: string,
  PATH = process.env.PATH ?? '',
): boolean => PATH.split(delimiter).some(p => !!p && samePath(p, dir))

// bin dirs are canonical, home may not be
const homeOf = (dir: string, home: string, win32: boolean) => {
  if (prettyPath(dir, home, win32) !== dir) return home
  try {
    return realpathSync.native(home)
  } catch {
    return home
  }
}

/** human lines about linked bins, with the `PATH` fix when needed */
export const globalBinsLines = (
  g: GlobalBins,
  opts: ShellOptions & { shell?: Shell } = {},
): string[] => {
  const {
    shell = detectShell(opts.env, opts.platform),
    platform = process.platform,
  } = opts
  const win32 = platform === 'win32'
  const home = homeOf(g.binDir, opts.home ?? homedir(), win32)
  const pretty = (p: string) => prettyPath(p, home, win32)
  const dir = pretty(g.binDir)
  const lines: string[] = []
  if (g.notWritable) {
    lines.push(
      `ℹ️  Using ${dir} because ${pretty(g.notWritable)} is not writable.`,
    )
  }
  if (g.bins.length) {
    lines.push(`🔗 Linked ${g.bins.join(', ')} in ${dir}`)
  }
  if (g.conflicts.length) {
    lines.push(
      `⚠️  Skipped ${g.conflicts.join(', ')}: already in ${dir} (use --force to overwrite)`,
    )
  }
  if (!g.inPath && (g.bins.length || g.conflicts.length)) {
    const rc = shellRcFile(shell, opts)
    const what = g.bins.length ? g.bins.join(', ') : 'global bins'
    lines.push(
      `⚠️  ${dir} is not on your PATH, so ${what} can't be run yet.`,
      `   Set --global-bin-dir to a folder on your PATH, or ${rc ? `add this line to ${rc}` : 'run'}:`,
      `     ${shellPathCommand(shell, g.binDir, { ...opts, home })}`,
    )
  }
  return lines
}
