import { spawn } from 'node:child_process'
import { rename } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { rimraf } from 'rimraf'
import { __CODE_SPLIT_SCRIPT_NAME } from './remove.ts'

const isDeno =
  (globalThis as typeof globalThis & { Deno?: any }).Deno != undefined

export class RollbackRemove {
  #key = String(Math.random()).substring(2)
  #paths = new Map<string, string>()

  async rm(path: string) {
    if (this.#paths.has(path)) return
    const target = `${dirname(path)}/.VLT.DELETE.${this.#key}.${basename(path)}`
    this.#paths.set(path, target)
    await rename(path, target).catch((e: unknown) => {
      if (
        e instanceof Error &&
        'code' in e &&
        /* c8 ignore start - very spurious weirdness on Windows */
        (e.code === 'ENOENT' || e.code === 'EPERM')
        /* c8 ignore stop */
      ) {
        this.#paths.delete(path)
        return
      }
      /* c8 ignore next */
      throw e
    })
  }

  confirm() {
    // nothing to confirm!
    if (!this.#paths.size) return

    const env = { ...process.env }
    const args = []
    // Deno on Windows does not support detached processes
    // https://github.com/denoland/deno/issues/25867
    // TODO: figure out something better to do here?
    const detached = !(isDeno && process.platform === 'win32')
    // When compiled the script to be run is passed as an
    // environment variable and then routed by the main entry point
    if (process.env.__VLT_INTERNAL_COMPILED) {
      env.__VLT_INTERNAL_MAIN = pathToFileURL(
        __CODE_SPLIT_SCRIPT_NAME,
      ).toString()
    } else {
      // If we are running deno from source we need to add the
      // unstable flags we need. The '-A' flag does not need
      // to be passed in as Deno supplies that automatically.
      if (isDeno) {
        args.push(
          '--unstable-node-globals',
          '--unstable-bare-node-builtins',
        )
      }
      args.push(__CODE_SPLIT_SCRIPT_NAME)
    }
    const child = spawn(process.execPath, args, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached,
      env,
    })
    for (const path of this.#paths.values()) {
      child.stdin.write(path + '\u0000')
    }
    child.stdin.end()
    if (detached) {
      child.unref()
    }
    this.#paths.clear()
  }

  async rollback() {
    const promises: Promise<unknown>[] = []
    for (const [original, moved] of this.#paths) {
      promises.push(
        rimraf(original)
          /* c8 ignore next */
          .catch(() => {})
          .then(() => rename(moved, original)),
      )
    }
    await Promise.all(promises)
    this.#paths.clear()
  }
}
