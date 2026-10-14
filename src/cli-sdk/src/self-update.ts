import { findCmdShimIfExists } from '@vltpkg/cmd-shim'
import { isDepID } from '@vltpkg/dep-id'
import type { DepID } from '@vltpkg/dep-id'
import { error } from '@vltpkg/error-cause'
import type { Graph } from '@vltpkg/graph'
import { lt, valid } from '@vltpkg/semver'
import { Spec } from '@vltpkg/spec'
import { which } from '@vltpkg/which'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { constants, existsSync } from 'node:fs'
import {
  access,
  chmod,
  lstat,
  readFile,
  realpath,
  rename,
  rm,
  stat,
} from 'node:fs/promises'
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from 'node:path'
import { loadPackageJson } from 'package-json-from-dist'
import type { LoadedConfig } from './config/index.ts'
import { findSelf } from './global-bin-dir.ts'
import type { Self } from './global-bin-dir.ts'
import { globalSpec } from './global.ts'
import type { GlobalBins } from './global.ts'
import {
  globalWorkspacePath,
  isInside,
  samePath,
} from './global-project.ts'
import { readGlobalState, updateGlobalState } from './global-state.ts'
import { writeInstallReceipt } from './install-receipt.ts'
import type { InstallReceipt } from './install-receipt.ts'
import { parseSpecArg } from './require-registry.ts'
import { prettyPath } from './shell.ts'

const { version: running } = loadPackageJson(
  import.meta.filename,
  process.env.__VLT_INTERNAL_CLI_PACKAGE_JSON,
) as { version: string }

export type SelfUpdateCase =
  'standalone' | 'npm' | 'global-project' | 'bootstrap'

/** `vlt install -g vlt` that ran, or had nothing to do */
export type SelfUpdated = {
  case: SelfUpdateCase
  status: 'updated' | 'up-to-date' | 'newer-running' | 'failed'
  /** running version */
  from: string
  /** resolved version */
  to: string
  /** dir of the updated vlt */
  dir: string
  /** newer-running: dist-tag of the implicit spec */
  tag?: string
  /** bootstrap: the dir that is not writable */
  notWritable?: string
  /** bootstrap: PATH dir whose vlt still runs first */
  shadowedBy?: string
}

/** vlt can't update this vlt, `message` says how to */
export type SelfRefused = {
  status: 'refused'
  /** running version */
  from: string
  /** dir of the running vlt */
  dir: string
  message: string
}

/** result of `vlt install -g vlt` */
export type SelfUpdate = SelfUpdated | SelfRefused

export type SelfUpdatePlan =
  | { done: SelfUpdate }
  /** caller runs the -g install, then `finish` */
  | {
      selfUnwritable: boolean
      finish: (global?: GlobalBins) => Promise<SelfUpdated>
    }

/** `checksum` of the file written to `dest`, `sha512-<base64>` */
export type Release = { checksum: string }

/** download one standalone entry point to `dest` */
export type FetchRelease = (o: {
  version: string
  target: string
  channel?: string
  bin: string
  dest: string
}) => Promise<Release>

type Owner =
  | { kind: 'standalone-receipt'; receipt: InstallReceipt }
  | {
      kind: 'npm'
      npmCli: string
      prefix: string
      receipt?: InstallReceipt
    }
  | {
      kind:
        | 'installer'
        | 'homebrew'
        | 'standalone'
        | 'global-project'
        | 'unknown'
    }

const installerLine =
  'Re-run the installer to update vlt:\n  curl -fsSL https://install.vlt.sh | bash'

const writable = (dir: string) =>
  access(dir, constants.W_OK).then(
    () => true,
    () => false,
  )

// exit 1 without usage: the usage was fine
const refuse = (self: Self, message: string): SelfRefused => {
  process.exitCode = 1
  return { status: 'refused', from: running, dir: self.dir, message }
}

const isFile = (f: string) =>
  stat(f).then(
    s => s.isFile(),
    () => false,
  )

const cellars = () =>
  [
    process.env.HOMEBREW_CELLAR,
    '/opt/homebrew/Cellar',
    '/usr/local/Cellar',
    '/home/linuxbrew/.linuxbrew/Cellar',
  ].filter((c): c is string => !!c)

const whichNpm = async () => {
  try {
    const found = await which('npm', { nothrow: true })
    if (!found) return
    const real = await realpath(
      (await findCmdShimIfExists(found))?.[1] ?? found,
    )
    return basename(real) === 'npm-cli.js' ? real : undefined
  } catch {}
}

// npm's -g layout: <prefix>/lib/node_modules, win32 <prefix>/node_modules
const findNpm = async (self: Self) => {
  const i = self.target.lastIndexOf(
    `${sep}node_modules${sep}vlt${sep}`,
  )
  if (i === -1) return
  const nm = self.target.slice(0, i) + sep + 'node_modules'
  const win32 = process.platform === 'win32'
  const up = dirname(nm)
  const prefix =
    win32 ?
      // vlt.cmd is in the prefix
      samePath(up, self.dir) && up
    : basename(up) === 'lib' && dirname(up)
  if (!prefix) return
  const node = dirname(process.execPath)
  const candidates = [
    join(nm, 'npm/bin/npm-cli.js'),
    win32 ?
      join(node, 'node_modules/npm/bin/npm-cli.js')
    : join(dirname(node), 'lib/node_modules/npm/bin/npm-cli.js'),
  ]
  for (const c of candidates) {
    if (await isFile(c)) return { npmCli: c, prefix }
  }
  const npmCli = await whichNpm()
  return npmCli && { npmCli, prefix }
}

const classify = async (self: Self, root: string): Promise<Owner> => {
  // before the receipt: it can outlive the vlt it was written for
  const g = await realpath(root).catch(() => resolve(root))
  if (isInside(g, self.target)) return { kind: 'global-project' }
  const { receipt } = self
  if (receipt?.data.method === 'standalone') {
    if (self.standalone)
      return { kind: 'standalone-receipt', receipt }
  } else if (receipt) {
    const npm = receipt.data.method === 'npm' && (await findNpm(self))
    return npm ?
        { kind: 'npm', ...npm, receipt }
      : { kind: 'installer' }
  }
  // before npm: a node formula has npm's layout
  if (cellars().some(c => isInside(c, self.target))) {
    return { kind: 'homebrew' }
  }
  if (self.standalone) return { kind: 'standalone' }
  const npm = await findNpm(self)
  return npm ? { kind: 'npm', ...npm } : { kind: 'unknown' }
}

const sha512 = async (file: string) =>
  `sha512-${createHash('sha512')
    .update(await readFile(file))
    .digest('base64')}`

const safeBin = (b: string) => /^[a-z0-9][\w.-]*$/i.test(b)

/** a refusal message, or undefined once replaced */
const updateStandalone = async (
  self: Self,
  receipt: InstallReceipt,
  to: string,
  fetchRelease?: FetchRelease,
): Promise<string | undefined> => {
  const { target, channel, binaries = [] } = receipt.data
  if (!fetchRelease || !target) return installerLine
  const win32 = process.platform === 'win32'
  const at = prettyPath(self.dir)
  // stat().uid is 0 on win32
  if (
    !win32 &&
    (await stat(self.found)).uid === 0 &&
    process.getuid?.() !== 0
  ) {
    return `vlt at ${at} is owned by root. Update it the way you installed it, or run this as root.`
  }
  if (!(await writable(self.dir))) {
    return `vlt at ${at} is not writable. Update it the way you installed it.`
  }
  const ext =
    extname(self.found).toLowerCase() === '.exe' ? '.exe' : ''
  const entries: { bin: string; file: string }[] = []
  for (const bin of new Set(binaries)) {
    if (bin === 'vlt' || !safeBin(bin)) continue
    const file = join(self.dir, bin + ext)
    const st = await lstat(file).catch(() => undefined)
    // links follow vlt
    if (st && !st.isSymbolicLink()) entries.push({ bin, file })
  }
  // last, so a failure part-way leaves a working vlt
  entries.push({
    bin: 'vlt',
    file: join(self.dir, basename(self.found)),
  })

  const tmps: string[] = []
  const cleanup = () =>
    Promise.all(tmps.map(f => rm(f, { force: true })))
  const ready: { file: string; dest: string }[] = []
  try {
    for (const { bin, file } of entries) {
      // a running vlt.exe.old: the rename below says so
      if (win32)
        await rm(`${file}.old`, { force: true }).catch(() => {})
      // same dir: rename is atomic
      const dest = join(self.dir, `.${bin}-${to}.tmp`)
      tmps.push(dest)
      const { checksum } = await fetchRelease({
        version: to,
        target,
        channel,
        bin,
        dest,
      })
      const found = await sha512(dest)
      if (found !== checksum) {
        throw error(`Checksum mismatch for ${bin} ${to}`, {
          code: 'EINTEGRITY',
          wanted: checksum,
          found,
        })
      }
      await chmod(dest, (await stat(file)).mode & 0o777)
      ready.push({ file, dest })
    }
  } catch (er) {
    await cleanup()
    throw er
  }
  // never write into a running file: rename only
  for (const { file, dest } of ready) {
    try {
      if (win32) {
        // a running .exe can be renamed, not replaced
        await rename(file, `${file}.old`)
        await rename(dest, file).catch(async (er: unknown) => {
          await rename(`${file}.old`, file).catch(() => {})
          throw er
        })
      } else {
        await rename(dest, file)
      }
    } catch (cause) {
      await cleanup()
      throw error(
        `Could not replace ${file}. Close other vlt processes and editors, and check permissions.`,
        { path: file, cause },
      )
    }
  }
}

const runNpm = (npmCli: string, prefix: string, arg: string) =>
  new Promise<number>((res, rej) => {
    // stdout to stderr: keeps --view=json parseable
    const child = spawn(
      process.execPath,
      [npmCli, 'install', '--global', '--prefix', prefix, arg],
      { stdio: ['inherit', 2, 2] },
    )
    child.on('error', rej)
    child.on('close', (code: number | null) => res(code ?? 1))
  })

const rewriteReceipt = (
  receipt: InstallReceipt | undefined,
  to: string,
) =>
  receipt &&
  writeInstallReceipt(receipt.file, { version: to }).catch(() => {})

// vlt, vlt@..., a vlt tarball
const vltArg = /^vlt(@|$)|(^|[/\\:])vlt-\d[^/\\]*\.tgz$/

/** `vlt install -g vlt...`, for the human view */
export const isSelfUpdateArgs = (
  conf: Pick<LoadedConfig, 'command' | 'globalRoot' | 'positionals'>,
): boolean =>
  conf.command === 'install' &&
  !!conf.globalRoot &&
  conf.positionals.some(p => vltArg.test(p))

/**
 * `vlt install -g vlt`: update the vlt on the PATH the way it was
 * installed. Undefined when vlt is not a positional.
 */
export const selfUpdate = async (
  conf: LoadedConfig,
  { fetchRelease }: { fetchRelease?: FetchRelease } = {},
): Promise<SelfUpdatePlan | undefined> => {
  const { globalRoot, positionals } = conf
  if (!globalRoot || !positionals.length) return
  const specs = await Promise.all(
    positionals.map(p => globalSpec(p, conf)),
  )
  const [spec] = specs
  if (!spec || !specs.some(s => s.name === 'vlt')) return
  if (specs.length > 1) {
    throw error('Update vlt on its own, without other packages', {
      code: 'EUSAGE',
      found: positionals.join(' '),
    })
  }
  const self = await findSelf()
  if (!self) {
    throw error(
      `Can't tell which vlt to update: run the vlt on your PATH, not ${process.argv[1] ?? process.execPath}`,
      { code: 'EUSAGE' },
    )
  }
  const owner = await classify(self, globalRoot)
  const at = prettyPath(self.dir)
  const foreign = `vlt at ${at} is not managed by vlt or npm. Update it the way you installed it.`
  if (owner.kind === 'installer') {
    return { done: refuse(self, installerLine) }
  }
  if (owner.kind === 'homebrew') {
    return {
      done: refuse(
        self,
        `vlt at ${at} was installed by Homebrew. Run \`brew upgrade vlt\`.`,
      ),
    }
  }
  if (owner.kind === 'standalone') {
    return { done: refuse(self, foreign) }
  }
  // npm's node_modules not writable: npm's EACCES says so
  const bootstrap =
    (owner.kind === 'npm' || owner.kind === 'unknown') &&
    !(await writable(self.dir))
  if (owner.kind === 'unknown' && !bootstrap) {
    return { done: refuse(self, foreign) }
  }

  const raw = String(positionals[0])
  const implicit = !parseSpecArg(raw, conf.options).bareSpec
  const receipt = 'receipt' in owner ? owner.receipt : undefined
  const channel = receipt?.data.channel
  const tag = channel ?? conf.options.tag
  const { name, version: to } =
    await conf.options.packageInfo.manifest(
      implicit && channel ?
        Spec.parse('vlt', tag, conf.options)
      : spec,
    )
  if (name !== 'vlt' || !to) {
    throw error(`${raw} is not a version of vlt`, {
      code: 'EUSAGE',
      found: name,
    })
  }
  const kind: SelfUpdateCase =
    bootstrap ? 'bootstrap'
    : owner.kind === 'standalone-receipt' ? 'standalone'
    : owner.kind === 'npm' ? 'npm'
    : 'global-project'
  const base = { case: kind, from: running, to, dir: self.dir }
  if (to === running)
    return { done: { ...base, status: 'up-to-date' } }
  // `latest` may lag a new major
  if (implicit && lt(to, running)) {
    return { done: { ...base, status: 'newer-running', tag } }
  }

  const registry = spec.final.type === 'registry'
  if (owner.kind === 'standalone-receipt') {
    // releases are registry versions
    if (!registry || !valid(to)) {
      throw error(`${raw} is not a vlt release`, {
        code: 'EUSAGE',
        found: raw,
      })
    }
    const refused = await updateStandalone(
      self,
      owner.receipt,
      to,
      fetchRelease,
    )
    if (refused) return { done: refuse(self, refused) }
    await rewriteReceipt(owner.receipt, to)
    return { done: { ...base, status: 'updated' } }
  }
  if (owner.kind === 'npm' && !bootstrap) {
    const code = await runNpm(
      owner.npmCli,
      owner.prefix,
      registry ? `vlt@${to}` : `vlt@${spec.bareSpec}`,
    )
    // npm already said why
    if (code !== 0) {
      process.exitCode = code
      return { done: { ...base, status: 'failed' } }
    }
    await rewriteReceipt(receipt, to)
    return { done: { ...base, status: 'updated' } }
  }

  // the ws pins what was resolved
  if (registry) conf.positionals = [`vlt@${to}`]
  return {
    selfUnwritable: bootstrap,
    finish: async global => {
      const u: SelfUpdated = {
        ...base,
        status: 'updated',
        dir: global?.binDir ?? self.dir,
        ...(bootstrap ? { notWritable: self.dir } : {}),
      }
      if (
        bootstrap &&
        global?.inPath &&
        global.bins.includes('vlt')
      ) {
        const now = await which('vlt', { nothrow: true }).catch(
          () => null,
        )
        const first = now && dirname(now)
        if (
          first &&
          !samePath(
            await realpath(first).catch(() => first),
            global.binDir,
          )
        ) {
          u.shadowedBy = first
        }
      }
      return u
    },
  }
}

/** `vlt uninstall -g vlt` of a vlt that is not a global package */
export const refuseSelfUninstall = async (
  conf: LoadedConfig,
): Promise<SelfRefused | undefined> => {
  const { globalRoot, positionals } = conf
  if (!globalRoot || !positionals.includes('vlt')) return
  const ws = resolve(globalRoot, globalWorkspacePath('vlt'))
  if (existsSync(resolve(ws, 'package.json'))) return
  const self = await findSelf()
  if (!self) return
  const { kind } = await classify(self, globalRoot)
  return refuse(
    self,
    kind === 'npm' ?
      'vlt was installed by npm. Run `npm uninstall -g vlt` to remove it.'
    : kind === 'homebrew' ?
      'vlt was installed by Homebrew. Run `brew uninstall vlt` to remove it.'
    : `vlt at ${prettyPath(self.dir)} is not managed by vlt. Remove it the way you installed it.`,
  )
}

/** store id of the running vlt, when it runs from the global project */
export const runningStoreDep = async (
  root: string,
): Promise<DepID | undefined> => {
  const script = process.argv[1]
  if (!script) return
  try {
    const [real, store] = await Promise.all([
      realpath(script),
      realpath(resolve(root, 'node_modules/.vlt')),
    ])
    const [id] = relative(store, real).split(sep)
    return isDepID(id) ? id : undefined
  } catch {}
}

/**
 * Record the running vlt's store dir for removal by a later -g
 * command when the graph no longer has it, and forget listed dirs
 * the graph has again.
 */
export const deferSelfRemove = async (
  root: string,
  graph: Pick<Graph, 'nodes'>,
  keep?: DepID,
): Promise<void> => {
  const store = resolve(await realpath(root), 'node_modules/.vlt')
  const add =
    keep && !graph.nodes.has(keep) ? [resolve(store, keep)] : []
  const { pendingRemove = [] } = await readGlobalState(root)
  const kept = pendingRemove.filter(p => {
    const id = basename(p)
    return !(isDepID(id) && graph.nodes.has(id))
  })
  if (!add.length && kept.length === pendingRemove.length) return
  await updateGlobalState(root, s => ({
    ...s,
    pendingRemove: [...new Set([...kept, ...add])],
  }))
}

/** human lines for a self-update */
export const selfUpdateLines = (s: SelfUpdate): string[] => {
  if (s.status === 'refused') return [s.message]
  if (s.status === 'up-to-date') {
    return [`✅ vlt ${s.to} is already up to date`]
  }
  if (s.status === 'newer-running') {
    return [
      `ℹ️  vlt ${s.from} is running but "${s.tag}" is ${s.to}; run \`vlt i -g vlt@${s.tag}\` to downgrade`,
    ]
  }
  if (s.status === 'failed') return []
  if (s.case === 'bootstrap') {
    return [
      `ℹ️  ${prettyPath(s.notWritable ?? s.dir)} is not writable, so vlt ${s.to} was installed as a global package.`,
      ...(s.shadowedBy ?
        [
          `⚠️  ${prettyPath(s.shadowedBy)} is earlier in your PATH, so \`vlt\` still runs vlt ${s.from}.`,
        ]
      : []),
    ]
  }
  return [
    `⬆️  Updated vlt ${s.from} → ${s.to} in ${prettyPath(s.dir)}${s.case === 'npm' ? ' (via npm)' : ''}`,
  ]
}
