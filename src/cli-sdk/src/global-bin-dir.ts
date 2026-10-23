import { findCmdShimIfExists } from '@vltpkg/cmd-shim'
import { error } from '@vltpkg/error-cause'
import { which } from '@vltpkg/which'
import { constants } from 'node:fs'
import { access, mkdir, realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import {
  basename,
  delimiter,
  dirname,
  isAbsolute,
  resolve,
} from 'node:path'
import type { LoadedConfig } from './config/index.ts'
import { isInPath } from './global.ts'
import { globalBinDir, samePath } from './global-project.ts'
import { readInstallReceipt } from './install-receipt.ts'
import type { InstallReceipt } from './install-receipt.ts'

export type GlobalBinDirSource =
  'config' | 'self' | 'local-bin' | 'global-dir'

export type ResolvedGlobalBinDir = {
  /** canonical (native realpath) */
  dir: string
  source: GlobalBinDirSource
  inPath: boolean
  /** self dir passed over because it is not writable */
  notWritable?: string
}

/** the `vlt` on PATH, when it is the running program */
export type Self = {
  /** what `which` found: `<dir>/vlt`, `vlt.cmd`, `vlt.exe` */
  found: string
  /** canonical dirname of `found` */
  dir: string
  /** realpath of what `found` runs */
  target: string
  /** `found` is `process.execPath`: a single executable */
  standalone: boolean
  receipt?: InstallReceipt
}

export type ResolveOptions = {
  /** skip the self dir, eg after a write there failed */
  selfUnwritable?: boolean
}

// native realpath: also fixes case on case-insensitive fs
const real = (p: string) => realpath(p).catch(() => undefined)

const writable = (dir: string) =>
  access(dir, constants.W_OK).then(
    () => true,
    () => false,
  )

/** `isInPath`, also matching symlinked entries */
export const isInPathRealpath = async (
  dir: string,
  PATH = process.env.PATH ?? '',
): Promise<boolean> => {
  if (isInPath(dir, PATH)) return true
  const r = await real(dir)
  if (!r) return false
  for (const p of PATH.split(delimiter)) {
    const rp = p && (await real(p))
    if (rp && samePath(rp, r)) return true
  }
  return false
}

// npx, vlx, run scripts put a project's `.bin` first
const isDotBin = (d: string) => {
  const name = (p: string) =>
    process.platform === 'win32' ?
      basename(p).toLowerCase()
    : basename(p)
  return name(d) === '.bin' && name(dirname(d)) === 'node_modules'
}

/** the `vlt` found in the `PATH`, if it runs this process */
export const findSelf = async (): Promise<Self | undefined> => {
  const found = await which('vlt', { nothrow: true }).catch(
    () => null,
  )
  if (!found || !isAbsolute(found)) return
  // win32 looks in the cwd first
  const foundDir = dirname(found)
  if (!isInPath(foundDir) || isDotBin(foundDir)) return
  const dir = await real(foundDir)
  if (!dir || isDotBin(dir)) return
  const shim =
    /\.(cmd|ps1)$/i.test(found) ?
      (await findCmdShimIfExists(found))?.[1]
    : found
  const target = shim && (await real(shim))
  if (!target) return
  const exec = await real(process.execPath)
  const standalone = !!exec && samePath(target, exec)
  if (!standalone) {
    const script = process.argv[1] && (await real(process.argv[1]))
    if (!script || !samePath(target, script)) return
  }
  const receipt = await readInstallReceipt(found)
  return {
    found,
    dir,
    target,
    standalone,
    ...(receipt ? { receipt } : {}),
  }
}

const resolveDir = async (
  conf: Pick<LoadedConfig, 'projectRoot' | 'globalBinDir'>,
  selfUnwritable: boolean,
): Promise<ResolvedGlobalBinDir> => {
  const configured = conf.globalBinDir
  if (configured) {
    try {
      await mkdir(configured, { recursive: true })
    } catch (cause) {
      throw error('Could not create global-bin-dir', {
        code: 'ECONFIG',
        found: configured,
        cause,
      })
    }
    try {
      await access(configured, constants.W_OK)
    } catch (cause) {
      throw error('global-bin-dir is not writable', {
        code: 'ECONFIG',
        found: configured,
        cause,
      })
    }
    const dir = await realpath(configured)
    return {
      dir,
      source: 'config',
      inPath: await isInPathRealpath(dir),
    }
  }
  const self = await findSelf()
  if (self && !selfUnwritable && (await writable(self.dir))) {
    return { dir: self.dir, source: 'self', inPath: true }
  }
  const notWritable = self?.dir
  if (notWritable && process.platform !== 'win32') {
    // never created: only in the PATH if it existed at login
    const local = resolve(homedir(), '.local/bin')
    const st = await stat(local).catch(() => undefined)
    if (
      st?.isDirectory() &&
      (await isInPathRealpath(local)) &&
      (await writable(local))
    ) {
      const dir = await realpath(local)
      // it may be the self dir that refused a write
      if (!samePath(dir, notWritable)) {
        return { dir, source: 'local-bin', inPath: true, notWritable }
      }
    }
  }
  const g = globalBinDir(conf.projectRoot)
  await mkdir(g, { recursive: true })
  const dir = await realpath(g)
  return {
    dir,
    source: 'global-dir',
    inPath: await isInPathRealpath(dir),
    ...(notWritable ? { notWritable } : {}),
  }
}

/**
 * Where to link global bins: `--global-bin-dir`, else the dir of the
 * running `vlt` when writable, else `~/.local/bin` when in the `PATH`
 * (not win32), else `<global-dir>/bin`.
 */
export const resolveGlobalBinDir = async (
  conf: Pick<LoadedConfig, 'projectRoot' | 'globalBinDir'>,
  { selfUnwritable = false }: ResolveOptions = {},
): Promise<ResolvedGlobalBinDir> => {
  const r = await resolveDir(conf, selfUnwritable)
  // nested vlt agrees
  process.env.VLT_GLOBAL_BIN_DIR = r.dir
  return r
}
