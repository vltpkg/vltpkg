import { error } from '@vltpkg/error-cause'
import { lstat, readFile, readlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { paths } from './paths.ts'

const extractPath = (path: string, cmdshimContents: string) => {
  if (/\.cmd$/i.test(path)) {
    return extractPathFromCmd(cmdshimContents)
  } else if (/\.(ps1|pwsh)$/i.test(path)) {
    return extractPathFromPowershell(cmdshimContents)
  } else {
    return extractPathFromCygwin(cmdshimContents)
  }
}

const extractPathFromPowershell = (cmdshimContents: string) => {
  const matches = /"[$]basedir\/([^"]+?)"\s+[$]args/.exec(
    cmdshimContents,
  )
  return matches?.[1]?.replace(/\\/g, '/')
}

const extractPathFromCmd = (cmdshimContents: string) => {
  const matches = /"%(?:~dp0|dp0%)\\([^"]+?)"\s+%[*]/.exec(
    cmdshimContents,
  )
  return matches?.[1]?.replace(/\\/g, '/')
}

const extractPathFromCygwin = (cmdshimContents: string) => {
  const matches = /"[$]basedir\/([^"]+?)"\s+"[$]@"/.exec(
    cmdshimContents,
  )
  return matches?.[1]?.replace(/\\/g, '/')
}

/**
 * Find a matching cmd, cygwin, powershell, or symlink executable,
 * and return the matching file and the target it references in a
 * `[string,string]` tuple if found, or undefined if not.
 */
export const findCmdShimIfExists = async (
  path: string,
): Promise<undefined | [string, string]> => {
  path = path.replace(/\.(cmd|pwsh|ps1)$/i, '')
  for (const p of paths(path)) {
    const result = await readCmdShimIfExists(p)
    if (result) return [p, result]
  }
}

/**
 * Find a matching cmd, cygwin, powershell, or symlink executable,
 * and return the matching file and the target it references in a
 * `[string,string]` tuple if found, or throw if not found.
 */
export const findCmdShim = async (path: string) => {
  const result = await findCmdShimIfExists(path)
  if (result) return result
  throw error(
    'Could not find matching cmd shim',
    { path },
    findCmdShim,
  )
}

/**
 * Read the specified executable shim if it exists, returning the
 * target it references. Return undefined if it does not exist
 * or cannot be dereferenced.
 */
export const readCmdShimIfExists = async (path: string) => {
  try {
    const st = await lstat(path)
    if (st.isSymbolicLink()) {
      return resolve(dirname(path), await readlink(path))
    }
    const contents = await readFile(path)
    const destination = extractPath(path, contents.toString())
    if (destination) return resolve(dirname(path), destination)
  } catch {}
}

/**
 * Read the specified executable shim, returning the target
 * it references. Raise an error if it does not exist or cannot be read.
 */
export const readCmdShim = async (path: string) => {
  try {
    const st = await lstat(path)
    if (st.isSymbolicLink()) {
      return resolve(dirname(path), await readlink(path))
    }
    // create a new error to capture the stack trace from this point,
    // instead of getting some opaque stack into node's internals
    const contents = await readFile(path)
    const destination = extractPath(path, contents.toString())
    if (destination) return resolve(dirname(path), destination)
  } catch (er) {
    throw error(
      'Could not read shim',
      { path, cause: er },
      readCmdShim,
    )
  }
  throw error('Not a valid cmd shim', { path }, readCmdShim)
}
