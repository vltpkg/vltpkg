import { error } from '@vltpkg/error-cause'
import { Stats } from 'node:fs'
import { lstat, readFile, readlink } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const extractPath = (path: string, cmdshimContents: string) => {
  if (/\.cmd$/.test(path)) {
    return extractPathFromCmd(cmdshimContents)
  } else if (/\.(ps1|pwsh)$/.test(path)) {
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

const couldNotRead =
  (path: string, from: (...a: any[]) => any) => (er: unknown) => {
    throw error('Could not read shim', { path, cause: er }, from)
  }

// find any cmd or pwsh or cygwin shim, and read it
export const findCmdShim = async (path: string) => {
  path = path.replace(/\.(cmd|pwsh|ps1)$/i, '')
  for (const p of [
    path,
    path + '.cmd',
    path + '.ps1',
    path + '.pwsh',
  ]) {
    const result = await readCmdShimIfExists_(p, findCmdShim)
    if (result) return result
  }
  throw error(
    'Could not find matching cmd shim',
    { path },
    findCmdShim,
  )
}

export const readCmdShimIfExists = async (path: string) =>
  readCmdShimIfExists_(path, readCmdShimIfExists)

const readCmdShimIfExists_ = async (
  path: string,
  from: (...a: any[]) => any,
) => {
  try {
    return readCmdShim_(path, from, await lstat(path))
  } catch {}
}

export const readCmdShim = async (path: string) =>
  readCmdShim_(path, readCmdShim)

const readCmdShim_ = async (
  path: string,
  from: (...a: any[]) => any,
  st?: Stats,
) => {
  const cnr = couldNotRead(path, from)
  st ??= await lstat(path).catch(cnr)
  if (st.isSymbolicLink()) {
    return resolve(dirname(path), await readlink(path))
  }
  // create a new error to capture the stack trace from this point,
  // instead of getting some opaque stack into node's internals
  const contents = await readFile(path).catch(cnr)
  const destination = extractPath(path, contents.toString())
  if (destination) return resolve(dirname(path), destination)
  throw error('Not a valid cmd shim', { path }, from)
}
