import { existsSync } from 'node:fs'
import { lstat, readFile, realpath, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, resolve } from 'node:path'
import { fishPath, posixPath } from '../shell.ts'
import type { ShellOptions } from '../shell.ts'
import { envFile, envFishFile } from './env.ts'

export type PosixShell = 'bash' | 'zsh' | 'fish' | 'sh'

export const blockStart = '# vlt'
export const blockEnd = '# vlt end'

export type FileAction = 'create' | 'append' | 'replace' | 'unchanged'

export type Owner = { uid: number; gid: number }

export type FileChange = {
  /** file to write: the rc file, or its symlink target */
  file: string
  kind: 'env' | 'rc'
  action: FileAction
  /** bytes: rc files may not be UTF-8 */
  content: Buffer
  /** rc content before an append/replace, backed up */
  previous?: Buffer
  mode?: number
  /** of the rc file, or of the dir a new one goes in */
  owner?: Owner
}

const abs = (v: string | undefined) =>
  v && isAbsolute(v) ? v : undefined

const isENOENT = (er: unknown) =>
  (er as NodeJS.ErrnoException).code === 'ENOENT'

const ownerOf = (st: Owner): Owner => ({ uid: st.uid, gid: st.gid })

// owner of the nearest existing dir
const dirOwner = async (dir: string): Promise<Owner | undefined> => {
  let st = await stat(dir).catch(() => undefined)
  while (!st && dirname(dir) !== dir) {
    dir = dirname(dir)
    st = await stat(dir).catch(() => undefined)
  }
  return st && ownerOf(st)
}

// strings with one char per byte, so offsets are byte offsets
const latin1 = (s: string) => Buffer.from(s).toString('latin1')
const bytes = (s: string) => Buffer.from(s, 'latin1')

/** rc files that load the env file in new `shell` sessions */
export const rcFiles = (
  shell: PosixShell,
  {
    env = process.env,
    platform = process.platform,
    home = homedir(),
  }: ShellOptions = {},
): string[] => {
  const h = (f: string) => resolve(home, f)
  switch (shell) {
    case 'zsh':
      // after path_helper, in every interactive zsh
      return [resolve(abs(env.ZDOTDIR) ?? home, '.zshrc')]
    case 'fish':
      return [
        resolve(
          abs(env.XDG_CONFIG_HOME) ?? h('.config'),
          'fish/conf.d/vlt.fish',
        ),
      ]
    case 'sh':
      return [resolve(abs(env.ENV) ?? h('.profile'))]
    case 'bash': {
      const login = ['.bash_profile', '.bash_login'].map(h)
      const list = [...login, h('.bashrc')].filter(f => existsSync(f))
      // never create .bash_profile: it would shadow .profile.
      // macOS terminals run login bash, which skips .bashrc
      if (
        !list.length ||
        (platform === 'darwin' && !login.some(f => list.includes(f)))
      ) {
        list.push(h('.profile'))
      }
      return list
    }
  }
}

/** the marked section loading the env file */
export const renderBlock = (
  shell: PosixShell,
  globalDir: string,
  o: ShellOptions = {},
): string => {
  let line: string
  if (shell === 'fish') {
    const f = fishPath(envFishFile(globalDir), o)
    line = `test -f ${f}; and source ${f}`
  } else {
    // status 0 when missing: `set -e` callers source rc files
    const f = posixPath(envFile(globalDir), o)
    line = `if [ -f ${f} ]; then . ${f}; fi`
  }
  return `${blockStart}\n${line}\n${blockEnd}`
}

const trimEnd = (line: string) => line.replace(/[\r \t]+$/, '')

/** the last complete vlt section in `content` */
export const findBlock = (
  content: string,
): { start: number; end: number; text: string } | undefined => {
  let start: number | undefined
  let found: { start: number; end: number } | undefined
  let offset = 0
  for (const raw of content.split('\n')) {
    const line = trimEnd(raw)
    if (line === blockStart) start = offset
    else if (line === blockEnd && start !== undefined) {
      found = { start, end: offset + line.length }
      start = undefined
    }
    offset += raw.length + 1
  }
  if (!found) return
  const text = content
    .slice(found.start, found.end)
    .split('\n')
    .map(trimEnd)
    .join('\n')
  return { ...found, text }
}

/** env files are vlt's own: rewritten when different */
export const planEnvFile = async (
  file: string,
  text: string,
): Promise<FileChange> => {
  const content = Buffer.from(text)
  const previous = await readFile(file).catch((er: unknown) => {
    if (isENOENT(er)) return undefined
    throw er
  })
  return {
    file,
    kind: 'env',
    content,
    action:
      previous === undefined ? 'create'
      : previous.equals(content) ? 'unchanged'
      : 'replace',
  }
}

/** add or update the vlt section of an rc file */
export const planRcFile = async (
  file: string,
  block: string,
): Promise<FileChange> => {
  const lst = await lstat(file).catch((er: unknown) => {
    if (isENOENT(er)) return undefined
    throw er
  })
  if (!lst) {
    return {
      file,
      kind: 'rc',
      action: 'create',
      content: Buffer.from(block + '\n'),
      owner: await dirOwner(dirname(file)),
    }
  }
  if (lst.isSymbolicLink()) {
    // dotfile managers: edit the target, keep the link
    file = await realpath(file)
  }
  const st = await stat(file)
  const previous = await readFile(file)
  const text = previous.toString('latin1')
  const blk = latin1(block)
  const base = {
    file,
    kind: 'rc',
    mode: st.mode & 0o7777,
    owner: ownerOf(st),
  } as const
  const b = findBlock(text)
  if (!b) {
    const sep =
      text === '' ? ''
      : text.endsWith('\n') ? '\n'
      : '\n\n'
    return {
      ...base,
      action: 'append',
      content: bytes(text + sep + blk + '\n'),
      previous,
    }
  }
  if (b.text === blk) {
    return { ...base, action: 'unchanged', content: previous }
  }
  // the section is vlt's own: an old or edited one is replaced
  return {
    ...base,
    action: 'replace',
    content: bytes(text.slice(0, b.start) + blk + text.slice(b.end)),
    previous,
  }
}
