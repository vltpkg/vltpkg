import { error } from '@vltpkg/error-cause'
import { promiseSpawn } from '@vltpkg/promise-spawn'
import { asError } from '@vltpkg/types'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, win32 } from 'node:path'

export const userEnvKey = 'HKCU\\Environment'

/** how the user Path is named in messages */
export const userEnvLabel = 'your Windows user environment'

/** where users edit their Path by hand */
export const editPathHint =
  'Start > "Edit environment variables for your account" > Path'

export type WindowsOptions = {
  env?: NodeJS.ProcessEnv
  /** key holding Path; tests use a scratch key */
  key?: string
}

/** REG_SZ, REG_EXPAND_SZ, else the raw .reg type (dword, hex(7), …) */
export type RegValue = { type: string; data: string }

export type WindowsPathChange = {
  key: string
  /** canonical dir, written as is */
  dir: string
  action: 'create' | 'prepend' | 'unchanged'
  /** Path before; undefined when not set */
  previous?: string
  /** Path after */
  data: string
}

const refreshVar = 'VLT_PATH_REFRESH'

const system32 = (env: NodeJS.ProcessEnv) =>
  win32.join(
    [env.SystemRoot, env.windir].find(
      d => d && win32.isAbsolute(d),
    ) ?? 'C:\\Windows',
    'System32',
  )

// absolute: never a reg.exe from the cwd
const run = (env: NodeJS.ProcessEnv, exe: string, args: string[]) =>
  promiseSpawn(win32.join(system32(env), exe), args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

// reg's stderr, else the spawn error
const detail = (er: unknown): string => {
  const e = asError(er)
  const c = e.cause as
    { stderr?: unknown; cause?: unknown } | undefined
  return (
    typeof c?.stderr === 'string' && c.stderr ? c.stderr
    : c?.cause ? asError(c.cause).message
    : e.message
  )
}

const fail = (
  what: 'read' | 'update',
  key: string,
  why: string,
  hint: string,
  cause?: unknown,
) =>
  error(
    `Could not ${what} your user Path (${key}): ${why}\n  ${hint}`,
    {
      code: 'ECONFIG',
      cause,
    },
  )

const addIt = (dir: string) => `Add ${dir} yourself: ${editPathHint}`

const norm = (p: string, env: NodeJS.ProcessEnv) =>
  win32
    .normalize(expandEnv(p.trim().replace(/^"(.*)"$/, '$1'), env))
    .replace(/[\\/]+$/, '')
    .toLowerCase()

// .reg strings escape \ and "
const unesc = (s: string) => s.replace(/\\([\s\S])/g, '$1')

/** `name` in the first key of a `reg export` file */
export const parseRegExport = (
  text: string,
  name: string,
): RegValue | undefined => {
  // hex values wrap as `,\` + newline + indent
  const lines = text.replace(/,\\\r?\n */g, ',').split(/\r?\n/)
  let inKey = false
  for (const line of lines) {
    if (line.startsWith('[')) {
      // subkeys follow
      if (inKey) return undefined
      inKey = true
      continue
    }
    // [\s\S]: data may hold \r, U+2028, U+2029
    const [, n = '', v = ''] =
      /^"((?:[^"\\]|\\[\s\S])*)"=([\s\S]*)$/.exec(line) ?? []
    if (!inKey || unesc(n).toLowerCase() !== name.toLowerCase()) {
      continue
    }
    const [, sz] = /^"((?:[^"\\]|\\[\s\S])*)"$/.exec(v) ?? []
    if (sz !== undefined) return { type: 'REG_SZ', data: unesc(sz) }
    const [, hex] = /^hex\(2\):([\da-f,]*)$/i.exec(v) ?? []
    if (hex !== undefined) {
      const bytes = hex
        .split(',')
        .filter(Boolean)
        .map(h => parseInt(h, 16))
      return {
        type: 'REG_EXPAND_SZ',
        data: Buffer.from(bytes)
          .toString('utf16le')
          .replace(/\0+$/, ''),
      }
    }
    return { type: v.replace(/:[\s\S]*$/, ''), data: '' }
  }
  return undefined
}

/** `%VAR%` expanded, names case-insensitive */
export const expandEnv = (
  s: string,
  env: NodeJS.ProcessEnv = process.env,
): string =>
  s.replace(
    /%([^%]+)%/g,
    (m, n: string) =>
      Object.entries(env).find(
        ([k]) => k.toLowerCase() === n.toLowerCase(),
      )?.[1] ?? m,
  )

/** Path with `dir` first, unless already in it */
export const addPathEntry = (
  value: RegValue | undefined,
  dir: string,
  env: NodeJS.ProcessEnv = process.env,
): Pick<WindowsPathChange, 'action' | 'previous' | 'data'> => {
  if (!value) return { action: 'create', data: dir }
  const previous = value.data
  const d = norm(dir, env)
  if (previous.split(';').some(e => e.trim() && norm(e, env) === d)) {
    return { action: 'unchanged', previous, data: previous }
  }
  return {
    action: 'prepend',
    previous,
    data: previous ? `${dir};${previous}` : dir,
  }
}

/** the user Path value, undefined when not set */
export const readUserPath = async ({
  env = process.env,
  key = userEnvKey,
}: WindowsOptions = {}): Promise<RegValue | undefined> => {
  const d = await mkdtemp(join(tmpdir(), 'vlt-'))
  const file = join(d, 'env.reg')
  try {
    // utf-16 file: reg query prints in the console code page
    await run(env, 'reg.exe', ['export', key, file, '/y'])
    const v = parseRegExport(
      (await readFile(file)).toString('utf16le'),
      'Path',
    )
    // lone surrogate or NUL: would not survive the write
    if (v && /[\p{Cs}\0]/u.test(v.data)) {
      throw new Error('it has characters vlt could not read')
    }
    return v
  } finally {
    // AV may hold the new file
    await rm(d, {
      recursive: true,
      force: true,
      maxRetries: 3,
    }).catch(() => {})
  }
}

/** what adding `dir` to the user Path would change */
export const planWindowsPath = async (
  dir: string,
  { env = process.env, key = userEnvKey }: WindowsOptions = {},
): Promise<WindowsPathChange> => {
  // would split or expand in Path
  if (/[;%]/.test(dir)) {
    throw fail(
      'update',
      key,
      `the folder name has ";" or "%"`,
      'Set --global-bin-dir to a folder without them',
    )
  }
  const value = await readUserPath({ env, key }).catch(
    (er: unknown) => {
      throw fail('read', key, detail(er), addIt(dir), er)
    },
  )
  if (value && !/^REG_(EXPAND_)?SZ$/.test(value.type)) {
    throw fail(
      'update',
      key,
      `unexpected value type ${value.type}`,
      addIt(dir),
    )
  }
  return { key, dir, ...addPathEntry(value, dir, env) }
}

/** write the planned Path, then tell running programs */
export const applyWindowsPath = async (
  c: WindowsPathChange,
  { env = process.env }: { env?: NodeJS.ProcessEnv } = {},
): Promise<void> => {
  await run(env, 'reg.exe', [
    'add',
    c.key,
    '/v',
    'Path',
    '/t',
    'REG_EXPAND_SZ',
    '/d',
    c.data,
    '/f',
  ]).catch((er: unknown) => {
    throw fail('update', c.key, detail(er), addIt(c.dir), er)
  })
  if (c.key !== userEnvKey) return
  // setx broadcasts WM_SETTINGCHANGE: new terminals see the new Path
  await run(env, 'setx.exe', [refreshVar, '1'])
    .then(() =>
      run(env, 'reg.exe', ['delete', c.key, '/v', refreshVar, '/f']),
    )
    .catch(() => {})
}
