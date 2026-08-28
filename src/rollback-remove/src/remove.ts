import { pathToFileURL } from 'node:url'
import { rimraf } from 'rimraf'
import { readPayload } from './daemon.ts'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

// This is run as a background process, and all the paths to
// be removed written into stdin. We can't pass on argv, because
// it'll be a very long list in many cases.
export const main = async () => {
  const paths = (await readPayload()).split('\0').filter(i => !!i)

  if (paths.length) {
    await rimraf(paths)
  }
}

if (isMain(process.argv[1])) {
  await main()
}
