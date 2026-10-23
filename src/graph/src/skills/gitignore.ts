import { lstatSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const GITIGNORE_BEGIN =
  '# >>> vlt agent skills (links into node_modules)'
export const GITIGNORE_END = '# <<< vlt agent skills'

const sorted = (names: string[]) =>
  [...names]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(n => `/${n}`)

// vlt's block: `end` is -1 if none
const findBlock = (lines: string[]) => {
  const begin = lines.findIndex(l => l.trim() === GITIGNORE_BEGIN)
  const end = lines.findIndex(
    (l, i) => begin !== -1 && i > begin && l.trim() === GITIGNORE_END,
  )
  return { begin, end }
}

const update = (
  file: string,
  { add, remove }: { add: string[]; remove: string[] },
): 'ok' | 'refused' => {
  const st = lstatSync(file, { throwIfNoEntry: false })
  if (st && !st.isFile()) return 'refused'
  const text = st ? readFileSync(file, 'utf8') : ''
  const eol = text.includes('\r\n') ? '\r\n' : '\n'
  const lines = text.split(eol)
  const { begin, end } = findBlock(lines)
  let out: string
  if (end === -1) {
    if (!add.length) return 'ok'
    out =
      (text && !text.endsWith(eol) ? text + eol : text) +
      [GITIGNORE_BEGIN, ...sorted(add), GITIGNORE_END].join(eol) +
      eol
  } else {
    const rm = new Set(sorted(remove))
    const block = lines
      .slice(begin + 1, end)
      .filter(l => !rm.has(l.trim()))
    const have = new Set(block.map(l => l.trim()))
    lines.splice(
      begin + 1,
      end - begin - 1,
      ...block,
      ...sorted(add).filter(l => !have.has(l)),
    )
    out = lines.join(eol)
  }
  if (out !== text) writeFileSync(file, out)
  return 'ok'
}

/**
 * Keep a `/<name>` line per vlt link in a marked block of
 * `<dir>/.gitignore`: add `add`, drop `remove`. Other lines are kept.
 * Written only when changed, created only to add a line, never
 * removed. `'refused'`: `.gitignore` is not a regular file, or an fs
 * error.
 */
export const editGitignore = (
  dir: string,
  edit: { add: string[]; remove: string[] },
): 'ok' | 'refused' => {
  try {
    return update(join(dir, '.gitignore'), edit)
  } catch {
    return 'refused'
  }
}

/**
 * Names in vlt's block of `<dir>/.gitignore`: vlt's record of its links
 * in `dir`. Empty if none or unreadable.
 */
export const gitignoreNames = (dir: string): Set<string> => {
  try {
    const file = join(dir, '.gitignore')
    if (!lstatSync(file, { throwIfNoEntry: false })?.isFile()) {
      return new Set()
    }
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const { begin, end } = findBlock(lines)
    if (end === -1) return new Set()
    return new Set(
      lines
        .slice(begin + 1, end)
        .map(l => l.trim())
        .filter(l => l.startsWith('/'))
        .map(l => l.slice(1)),
    )
  } catch {
    return new Set()
  }
}
