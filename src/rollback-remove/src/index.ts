import { spawn } from 'child_process'
import { rename } from 'fs/promises'
import { basename, dirname } from 'path'
import { rimraf } from 'rimraf'
import { fileURLToPath } from 'url'

const removeScript = fileURLToPath(
  new URL('./remove.js', import.meta.url),
)

export class RollbackRemove {
  #key = String(Math.random()).substring(2)
  #paths = new Map<string, string>()

  async rm(path: string) {
    const target = `${dirname(path)}/.VLT.DELETE.${this.#key}.${basename(path)}`
    this.#paths.set(path, target)
    await rename(path, target).catch(e => {
      if (e.code === 'ENOENT') {
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

    const child = spawn(process.execPath, [removeScript], {
      stdio: ['pipe', 'ignore', 'ignore'],
      detached: true,
    })
    child.unref()
    for (const path of this.#paths.values()) {
      child.stdin.write(path + '\u0000')
    }
    child.stdin.end()
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
