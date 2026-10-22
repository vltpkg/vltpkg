import { randomBytes } from 'node:crypto'
import { constants, lstatSync, readdirSync, rmSync } from 'node:fs'
import { copyFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { callLimit } from 'promise-call-limit'

const TMP = '.vlt-unshare-'

const own = async (p: string, tmp: string) => {
  try {
    // keeps the store file's mode
    await copyFile(p, tmp, constants.COPYFILE_EXCL)
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
        if (lstatSync(p).nlink > 1) {
          const tmp = join(d, `${tag}${n++}`)
          shared.push(() => own(p, tmp))
        } else if (ent.name.startsWith(TMP)) {
          // a killed run's tmp copy
          rmSync(p)
        }
      }
    }
  }
  walk(dir)
  await callLimit(shared, { limit: 16, rejectLate: true })
  await own(pjPath, join(dir, `${tag}${n}`))
}
