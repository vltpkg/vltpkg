import { error } from '@vltpkg/error-cause'
import { asError } from '@vltpkg/types'
import { existsSync } from 'node:fs'
import { chown, mkdir, realpath, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { createInterface } from 'node:readline/promises'
import type { GlobalBins } from '../global.ts'
import {
  readGlobalState,
  updateGlobalState,
  writeFileAtomic,
} from '../global-state.ts'
import {
  detectShell,
  fishPath,
  posixPath,
  prettyPath,
  shellPathCommand,
} from '../shell.ts'
import type { Shell, ShellOptions } from '../shell.ts'
import {
  envFile,
  envFishFile,
  renderEnv,
  renderEnvFish,
} from './env.ts'
import {
  planEnvFile,
  planRcFile,
  rcFiles,
  renderBlock,
} from './posix.ts'
import type { FileAction, FileChange, PosixShell } from './posix.ts'

export type { FileAction } from './posix.ts'

const posixShells: ReadonlySet<Shell> = new Set([
  'bash',
  'zsh',
  'fish',
  'sh',
])

/** whether `vlt setup --path` can edit config for `shell` */
export const canSetupPath = (
  shell: Shell,
  platform: NodeJS.Platform = process.platform,
): boolean => platform !== 'win32' && posixShells.has(shell)

export type PathSetupOptions = ShellOptions & {
  /** holds the env files and backups */
  globalDir: string
  /** dir to add to the `PATH` */
  dir: string
  shell: Shell
}

export type PathSetupPlan = {
  globalDir: string
  dir: string
  shell: Shell
  changes: FileChange[]
}

export type PathSetupFile = {
  file: string
  kind: 'env' | 'rc'
  action: FileAction
}

export type PathSetupResult = {
  dir: string
  shell: Shell
  files: PathSetupFile[]
  backups: string[]
}

/** what adding `dir` to the `PATH` of new shells would change */
export const planPathSetup = async (
  o: PathSetupOptions,
): Promise<PathSetupPlan> => {
  const { globalDir, dir, shell } = o
  const command = shellPathCommand(shell, dir, o)
  if (!canSetupPath(shell, o.platform)) {
    const what =
      (o.platform ?? process.platform) === 'win32' ? 'Windows'
      : shell === 'unknown' ? 'your shell'
      : shell
    throw error(
      `vlt setup --path doesn't support ${what} yet. Add it to your PATH yourself:\n  ${command}`,
      { code: 'ECONFIG', found: shell },
    )
  }
  // env first: rc files point at it
  const changes = [
    await planEnvFile(envFile(globalDir), renderEnv(dir, o)),
    await planEnvFile(envFishFile(globalDir), renderEnvFish(dir, o)),
  ]
  const posix = shell as PosixShell
  const block = renderBlock(posix, globalDir, o)
  // links to one target: edit it once
  const seen = new Set<string>()
  for (const f of rcFiles(posix, o)) {
    const c = await planRcFile(f, block)
    const real = await realpath(c.file).catch(() => c.file)
    if (seen.has(real)) continue
    seen.add(real)
    changes.push(c)
  }
  return { globalDir, dir, shell, changes }
}

export const pathSetupChanged = (plan: PathSetupPlan): boolean =>
  plan.changes.some(c => c.action !== 'unchanged')

export const pathSetupFiles = (
  plan: PathSetupPlan,
): PathSetupFile[] =>
  plan.changes.map(({ file, kind, action }) => ({
    file,
    kind,
    action,
  }))

/** rc files, for display */
export const rcList = (
  files: PathSetupFile[],
  home?: string,
): string =>
  files
    .filter(f => f.kind === 'rc')
    .map(f => prettyPath(f.file, home))
    .join(', ')

/** write the plan: env files, then rc files, backed up */
export const applyPathSetup = async (
  plan: PathSetupPlan,
): Promise<PathSetupResult> => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = resolve(plan.globalDir, 'backups')
  const backups: string[] = []
  for (const c of plan.changes) {
    if (c.action === 'unchanged') continue
    if (c.previous !== undefined) {
      await mkdir(backupDir, { recursive: true })
      const name = basename(c.file).replace(/^\./, '')
      const b = resolve(backupDir, `${name}.${stamp}.bak`)
      await writeFile(b, c.previous, { mode: c.mode })
      backups.push(b)
    }
    // sudo must not leave root-owned files in the home dir
    const owner = process.getuid?.() === 0 ? c.owner : undefined
    // and the dirs mkdir makes
    const own = [c.file]
    let d = dirname(c.file)
    while (owner && !existsSync(d)) {
      own.push(d)
      d = dirname(d)
    }
    await mkdir(dirname(c.file), { recursive: true })
    await writeFileAtomic(c.file, c.content, c.mode)
    if (owner) {
      for (const f of own) await chown(f, owner.uid, owner.gid)
    }
  }
  return {
    dir: plan.dir,
    shell: plan.shell,
    files: pathSetupFiles(plan),
    backups,
  }
}

/** loads the env file into the current shell */
export const sourceCommand = (
  shell: Shell,
  globalDir: string,
  o: ShellOptions = {},
): string =>
  shell === 'fish' ? `source ${fishPath(envFishFile(globalDir), o)}`
  : shell === 'sh' ? `. ${posixPath(envFile(globalDir), o)}`
  : `source ${posixPath(envFile(globalDir), o)}`

export const pathSetupLines = (
  r: PathSetupResult,
  source: string,
  home?: string,
): string[] => {
  const lines = [
    `✅ Added ${prettyPath(r.dir, home)} to your PATH in ${rcList(r.files, home)}`,
    `   Open a new terminal, or run: ${source}`,
  ]
  const [b] = r.backups
  if (b) lines.push(`   Backups in ${prettyPath(dirname(b), home)}`)
  return lines
}

/** one trimmed answer */
export const ask = async (
  question: string,
  {
    input = process.stdin,
    output = process.stdout,
  }: {
    input?: NodeJS.ReadableStream
    output?: NodeJS.WritableStream
  } = {},
): Promise<string> => {
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(question)).trim()
  } finally {
    rl.close()
    input.pause()
  }
}

export type OfferOptions = ShellOptions & {
  globalDir: string
  yes?: boolean
  noModifyPath?: boolean
  input?: NodeJS.ReadableStream & { isTTY?: boolean }
  output?: NodeJS.WritableStream & { isTTY?: boolean }
  /** once, before the first prompt or line */
  beforeOutput?: () => void
}

/**
 * After `install -g` linked into a dir not in the `PATH`: offer, once,
 * in a terminal, to add it to the shell config. Never throws.
 */
export const offerPathSetup = async (
  g: GlobalBins,
  o: OfferOptions,
): Promise<void> => {
  const {
    globalDir,
    input = process.stdin,
    output = process.stdout,
    env = process.env,
    platform,
    home,
  } = o
  if (o.noModifyPath || g.inPath) return
  if (!g.bins.length && !g.conflicts.length) return
  if (!input.isTTY || !output.isTTY || env.CI) return
  if ((await readGlobalState(globalDir)).pathSetup === 'declined')
    return
  const sh = { env, platform, home }
  const shell = detectShell(env, platform)
  const po = { ...sh, globalDir, dir: g.binDir, shell }
  let plan: PathSetupPlan
  try {
    plan = await planPathSetup(po)
  } catch {
    // the PATH warning has the manual line
    return
  }
  const rcs = rcList(pathSetupFiles(plan), home)
  const source = sourceCommand(shell, globalDir, sh)
  const write = (line: string) => output.write(line + '\n')
  o.beforeOutput?.()
  // blank line after the PATH warning
  write('')
  if (!pathSetupChanged(plan)) {
    write(
      `ℹ️  It's already added in ${rcs}: open a new terminal, or run: ${source}`,
    )
    return
  }
  if (!o.yes) {
    let answer: string
    try {
      answer = await ask(`Add it to ${rcs} now? (Y/n) `, {
        input,
        output,
      })
    } catch {
      return
    }
    if (/^n/i.test(answer)) {
      await updateGlobalState(globalDir, s => ({
        ...s,
        pathSetup: 'declined',
      })).catch(() => {})
      return
    }
  }
  try {
    // rc files may have changed while asking
    if (!o.yes) plan = await planPathSetup(po)
    const r = await applyPathSetup(plan)
    for (const line of pathSetupLines(r, source, home)) write(line)
  } catch (er) {
    write(`⚠️  Could not add it to your PATH: ${asError(er).message}`)
  }
}
