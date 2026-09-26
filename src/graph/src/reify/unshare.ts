import { randomBytes } from 'node:crypto'
import { lstatSync, readdirSync, rmSync } from 'node:fs'
import {
  chmod,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import { join } from 'node:path'
import { callLimit } from 'promise-call-limit'

const TMP = '.vlt-unshare-'

const own = async (p: string, mode: number, tmp: string) => {
  const body = await readFile(p)
  try {
    await writeFile(tmp, body, { mode: mode & 0o777, flag: 'wx' })
    // same modes as a copy from the store
    if (mode & 0o111) await chmod(tmp, mode & 0o777)
    // atomic: p is never missing
    await rename(tmp, p)
  } catch (er) {
    await rm(tmp, { force: true })
    throw er
  }
}

/**
 * Replace every file of `dir` that is hardlinked (e.g. from the global
 * store) by a private copy, so a script run in it cannot write into
 * the store. package.json goes last: a private package.json means
 * nothing is shared, which the global store link keeps true.
 */
export const unshare = async (dir: string): Promise<void> => {
  const pjPath = join(dir, 'package.json')
  const pj = lstatSync(pjPath, { throwIfNoEntry: false })
  if (!pj || pj.nlink < 2) return
  // random per call: never clashes with another run's tmp
  const tag = `${TMP}${randomBytes(4).toString('hex')}-`
  let n = 0
  const shared: (() => Promise<void>)[] = []
  // by hand: a recursive readdir follows dir symlinks
  const walk = (d: string) => {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, ent.name)
      if (ent.isDirectory()) walk(p)
      else if (ent.isFile() && p !== pjPath) {
        const { mode, nlink } = lstatSync(p)
        if (nlink > 1) {
          const tmp = join(d, `${tag}${n++}`)
          shared.push(() => own(p, mode, tmp))
        } else if (ent.name.startsWith(TMP)) {
          // a killed run's tmp copy
          rmSync(p)
        }
      }
    }
  }
  walk(dir)
  await callLimit(shared, { limit: 16, rejectLate: true })
  await own(pjPath, pj.mode, join(dir, `${tag}${n}`))
}
