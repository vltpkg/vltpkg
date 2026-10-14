import { error } from '@vltpkg/error-cause'
import { isObject } from '@vltpkg/types'
import { XDG } from '@vltpkg/xdg'
import { readFile, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { samePath } from './global-project.ts'
import { writeJsonAtomic } from './global-state.ts'

const xdg = new XDG('vlt')

export const receiptName = 'install-receipt.json'

/**
 * Written by the official installer, in vlt's config dir or next to
 * (or one dir above) the `vlt` it installed. vlt only updates
 * `version` and `installedAt`.
 */
export type ReceiptData = {
  receiptVersion: 1
  /** 'npm' | 'standalone', anything else is a newer installer */
  method: string
  /** absolute dir holding the entry points */
  binDir: string
  installer?: { name?: string; version?: string }
  version?: string
  /** dist-tag or version asked for */
  channel?: string
  /** `<os>-<arch>[-<libc>]` of a standalone build */
  target?: string
  binaries?: string[]
  /** rc files the installer edited */
  modifiedPath?: string[]
  installedAt?: string
}

export type InstallReceipt = { file: string; data: ReceiptData }

const isStr = (v: unknown): v is string => typeof v === 'string'
const optStr = (v: unknown) => v === undefined || isStr(v)
const optStrs = (v: unknown) =>
  v === undefined || (Array.isArray(v) && v.every(isStr))

const isReceipt = (d: unknown): d is ReceiptData =>
  isObject(d) &&
  d.receiptVersion === 1 &&
  isStr(d.method) &&
  !!d.method &&
  isStr(d.binDir) &&
  isAbsolute(d.binDir) &&
  (d.installer === undefined ||
    (isObject(d.installer) &&
      optStr(d.installer.name) &&
      optStr(d.installer.version))) &&
  optStr(d.version) &&
  optStr(d.channel) &&
  optStr(d.target) &&
  optStrs(d.binaries) &&
  optStrs(d.modifiedPath) &&
  optStr(d.installedAt)

/**
 * The receipt covering the `vlt` found at `found`: valid, and its
 * `binDir` is the dir of `found`.
 */
export const readInstallReceipt = async (
  found: string,
  configDir: string = xdg.config(),
): Promise<InstallReceipt | undefined> => {
  const dir = dirname(found)
  const real = await realpath(dir).catch(() => undefined)
  if (!real) return
  for (const file of [
    resolve(configDir, receiptName),
    resolve(dir, receiptName),
    resolve(dir, '..', receiptName),
  ]) {
    try {
      const data: unknown = JSON.parse(await readFile(file, 'utf8'))
      if (
        isReceipt(data) &&
        samePath(await realpath(data.binDir), real)
      )
        return { file, data }
    } catch {}
  }
}

/** set `version` and `installedAt`, keeping all other fields */
export const writeInstallReceipt = async (
  file: string,
  update: { version: string; installedAt?: string },
): Promise<void> => {
  let raw: unknown
  try {
    raw = JSON.parse(await readFile(file, 'utf8'))
  } catch (cause) {
    throw error('Invalid install receipt', { path: file, cause })
  }
  if (!isReceipt(raw)) {
    throw error('Invalid install receipt', { path: file })
  }
  await writeJsonAtomic(file, {
    ...raw,
    version: update.version,
    installedAt: update.installedAt ?? new Date().toISOString(),
  })
}
