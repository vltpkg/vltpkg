import { isexe, sync as isexeSync } from 'isexe'
import { delimiter, join, sep } from 'node:path'

const isWindows = process.platform === 'win32'

// used to check for slashed in commands passed in. always checks for the posix
// separator on all platforms, and checks for the current separator when not on
// a posix platform. don't use the isWindows check for this since that is
// mocked in tests but we still need the code to actually work when called.
// that is also why it is ignored from coverage.
/* c8 ignore next */
const rSlash = sep === '/' ? /\// : /[\\/]/
const rRel = new RegExp(`^\\.${rSlash.source}`)

// Simulate a NodeJS.ErrnoException
const getNotFoundError = (cmd: string) =>
  Object.assign(new Error(`not found: ${cmd}`), { code: 'ENOENT' })

const getPathInfo = (
  cmd: string,
  {
    path: optPath = process.env.PATH,
    pathExt: optPathExt = process.env.PATHEXT,
    delimiter: optDelimiter = delimiter,
  }: WhichOptions,
) => {
  // If it has a slash, then we don't bother searching the pathenv.
  // just check the file itself, and that's it.
  const pathEnv =
    cmd.match(rSlash) ?
      ['']
    : [
        // windows always checks the cwd first
        /* c8 ignore next - platform-specific */
        ...(isWindows ? [process.cwd()] : []),
        ...(optPath ?? /* c8 ignore next - very unusual */ '').split(
          optDelimiter,
        ),
      ]

  if (isWindows) {
    const pathExtExe =
      optPathExt ||
      ['.EXE', '.CMD', '.BAT', '.COM'].join(optDelimiter)
    const pathExt = pathExtExe
      .split(optDelimiter)
      .flatMap(item => [item, item.toLowerCase()])
    if (cmd.includes('.') && pathExt[0] !== '') {
      pathExt.unshift('')
    }
    return { pathEnv, pathExt, pathExtExe }
    /* c8 ignore start - not reachable on windows */
  }

  return { pathEnv, pathExt: [''] }
}
/* c8 ignore stop */

const getPathPart = (raw: string, cmd: string) => {
  const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw
  const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : ''
  return prefix + join(pathPart, cmd)
}

export type WhichOptions = {
  all?: boolean
  path?: string
  pathExt?: string
  nothrow?: boolean
  delimiter?: string
}

export type WhichOptionsFindAll = WhichOptions & { all: true }
export type WhichOptionsFindOne = WhichOptions & { all?: false }

export type WhichOptionsNoThrow = WhichOptions & { nothrow: true }
export type WhichOptionsThrow = WhichOptions & { nothrow?: false }

export type WhichOptionsFindOneThrow = WhichOptionsFindOne &
  WhichOptionsThrow
export type WhichOptionsFindOneNoThrow = WhichOptionsFindOne &
  WhichOptionsNoThrow

export type WhichOptionsFindAllNoThrow = WhichOptionsFindAll &
  WhichOptionsNoThrow
export type WhichOptionsFindAllThrow = WhichOptionsFindAll &
  WhichOptionsThrow

export async function which(cmd: string): Promise<string>
export async function which(
  cmd: string,
  opt: WhichOptionsFindAllNoThrow,
): Promise<string[] | null>
export async function which(
  cmd: string,
  opt: WhichOptionsFindOneNoThrow,
): Promise<string | null>
export async function which(
  cmd: string,
  opt: WhichOptionsFindAllThrow,
): Promise<string[]>
export async function which(
  cmd: string,
  opt: WhichOptionsFindOneThrow,
): Promise<string>
export async function which(
  cmd: string,
  opt: WhichOptionsFindOne,
): Promise<string | null>
export async function which(
  cmd: string,
  opt: WhichOptionsNoThrow,
): Promise<string[] | string | null>
export async function which(
  cmd: string,
  opt: WhichOptionsFindAll,
): Promise<string[] | null>
export async function which(
  cmd: string,
  opt: WhichOptions,
): Promise<string[] | string | null>
export async function which(cmd: string, opt: WhichOptions = {}) {
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt)
  const found = []

  for (const envPart of pathEnv) {
    const p = getPathPart(envPart, cmd)

    for (const ext of pathExt) {
      const withExt = p + ext
      const is = await isexe(withExt, {
        pathExt: pathExtExe,
        ignoreErrors: true,
      })
      if (is) {
        if (!opt.all) {
          return withExt
        }
        found.push(withExt)
      }
    }
  }

  if (opt.all && found.length) {
    return found
  }

  if (opt.nothrow) {
    return null
  }

  throw getNotFoundError(cmd)
}

export function whichSync(cmd: string): string
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindAllNoThrow,
): string[] | null
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindOneNoThrow,
): string | null
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindAllThrow,
): string[]
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindOneThrow,
): string
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindOne,
): string | null
export function whichSync(
  cmd: string,
  opt: WhichOptionsNoThrow,
): string[] | string | null
export function whichSync(
  cmd: string,
  opt: WhichOptionsFindAll,
): string[] | null
export function whichSync(
  cmd: string,
  opt?: WhichOptions,
): string[] | string | null
export function whichSync(cmd: string, opt: WhichOptions = {}) {
  const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt)
  const found = []

  for (const pathEnvPart of pathEnv) {
    const p = getPathPart(pathEnvPart, cmd)

    for (const ext of pathExt) {
      const withExt = p + ext
      const is = isexeSync(withExt, {
        pathExt: pathExtExe,
        ignoreErrors: true,
      })
      if (is) {
        if (!opt.all) {
          return withExt
        }
        found.push(withExt)
      }
    }
  }

  if (opt.all && found.length) {
    return found
  }

  if (opt.nothrow) {
    return null
  }

  throw getNotFoundError(cmd)
}
