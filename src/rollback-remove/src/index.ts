import { spawn } from 'node:child_process'
import { rename } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { rimraf } from 'rimraf'
import { daemonSpawn, detached, endPayload } from './daemon.ts'
import { __CODE_SPLIT_SCRIPT_NAME } from './remove.ts'

export class RollbackRemove {
  #key = String(Math.random()).substring(2)
  #paths = new Map<string, string>()

  async rm(path: string) {
    if (this.#paths.has(path)) return
    const target = `${dirname(path)}/.VLT.DELETE.${this.#key}.${basename(path)}`
    // rollback() trusts this map, so only record entries after rename succeeds.
    try {
      await rename(path, target)
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        'code' in e &&
        /* c8 ignore start - very spurious weirdness on Windows */
        (e.code === 'ENOENT' || e.code === 'EPERM')
        /* c8 ignore stop */
      ) {
        return
      }
      throw e
    }
    this.#paths.set(path, target)
  }

  confirm() {
    // nothing to confirm!
    if (!this.#paths.size) return

    const {
      command,
      args,
      env: daemonEnv,
    } = daemonSpawn(__CODE_SPLIT_SCRIPT_NAME)
    const env = { ...process.env, ...daemonEnv }
    const child = spawn(command, args, {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached,
      env,
    })
    for (const path of this.#paths.values()) {
      child.stdin.write(`${path}\0`)
    }
    endPayload(child.stdin)
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
