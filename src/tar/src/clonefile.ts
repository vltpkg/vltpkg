import { isBuiltin } from 'node:module'

/**
 * `clonefile(2)` through `node:ffi`: one syscall clones a whole
 * directory tree copy-on-write on APFS, where a hardlink is the
 * slowest way to place a file and unpacking is not much better. Node
 * has no API for it (`copyFile` with `COPYFILE_FICLONE` clones one
 * file at a time, through libuv, and costs more than unpacking), and
 * `node:ffi` only exists on recent Node, and is experimental, so
 * everything here is feature-detected: {@link cloneAvailable} is false
 * wherever it cannot be loaded, and {@link cloneDir} then reports
 * `ENOTSUP`, which callers treat like a filesystem without clones, as
 * it does for an ffi call that throws.
 */

// the parts of `node:ffi` used here; it ships no types
type Ffi = {
  DynamicLibrary: new (path: string) => {
    getFunction: (
      name: string,
      signature: { return: string; arguments: string[] },
    ) => (...args: (string | number)[]) => unknown
  }
  getInt32: (pointer: bigint, offset: number) => number
}

type Lib = {
  clonefile: (src: string, dst: string, flags: number) => number
  /** `__error()`: the address of this thread's errno */
  error: () => bigint
  getInt32: Ffi['getInt32']
}

// darwin errno values clonefile(2) can set
const codes: Record<number, string> = {
  1: 'EPERM',
  2: 'ENOENT',
  5: 'EIO',
  13: 'EACCES',
  17: 'EEXIST',
  18: 'EXDEV',
  20: 'ENOTDIR',
  22: 'EINVAL',
  28: 'ENOSPC',
  45: 'ENOTSUP',
  62: 'ELOOP',
  63: 'ENAMETOOLONG',
}

// null: tried and unavailable
let lib: Lib | null | undefined

const load = (): Lib | null => {
  if (lib !== undefined) return lib
  lib = null
  if (process.platform !== 'darwin' || !isBuiltin('node:ffi')) {
    return lib
  }
  // `node:ffi` warns once when loaded, being experimental. The CLI runs
  // with --no-warnings; anyone else would see it on their first
  // install, so that one warning is swallowed here and nothing else.
  const emitWarning = process.emitWarning as (
    ...args: unknown[]
  ) => void
  process.emitWarning = (warning: unknown, ...rest: unknown[]) => {
    const [type] = rest
    const name =
      typeof type === 'string' ? type : (
        (type as { type?: string } | undefined)?.type
      )
    if (
      name !== 'ExperimentalWarning' ||
      !/\bFFI\b/.test(String(warning))
    ) {
      emitWarning.call(process, warning, ...rest)
    }
  }
  try {
    const ffi = process.getBuiltinModule('node:ffi') as Ffi
    const system = new ffi.DynamicLibrary('libSystem.B.dylib')
    lib = {
      clonefile: system.getFunction('clonefile', {
        return: 'int32',
        arguments: ['string', 'string', 'uint32'],
      }) as Lib['clonefile'],
      error: system.getFunction('__error', {
        return: 'pointer',
        arguments: [],
      }) as Lib['error'],
      getInt32: ffi.getInt32,
    }
  } catch {
    // the permission model without --allow-ffi, or a libSystem
    // without clonefile: as good as no ffi at all
  } finally {
    process.emitWarning = emitWarning
  }
  return lib
}

/**
 * True where {@link cloneDir} can work: macOS, on a Node whose
 * `node:ffi` loads. Being built in is not enough: the permission model
 * without `--allow-ffi` denies it. Loads it, once.
 */
export const cloneAvailable = (): boolean => !!load()

/**
 * Clone the directory `src` to `dst`, which must not exist, with
 * `clonefile(2)`. Returns true, or the errno code of the failure:
 * `ENOTSUP` where cloning is unavailable (not macOS, no `node:ffi`,
 * a filesystem without clones), `EXDEV` across volumes, `ENOENT` for a
 * missing source, and so on.
 */
export const cloneDir = (src: string, dst: string): true | string => {
  const l = load()
  if (!l) return 'ENOTSUP'
  try {
    if (l.clonefile(src, dst, 0) === 0) return true
    // read errno right away, before anything else can set it
    const errno = l.getInt32(l.error(), 0)
    return codes[errno] ?? `E${errno}`
  } catch {
    // `node:ffi` is experimental: a call that throws (a changed
    // signature or type) degrades to no clones, never fails an install
    lib = null
    return 'ENOTSUP'
  }
}
