import { pathToFileURL } from 'node:url'
import { rimraf } from 'rimraf'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

// This is run as a background process, and all the paths to
// be removed written into stdin. We can't pass on argv, because
// it'll be a very long list in many cases.
const main = () => {
  const input: Buffer[] = []
  process.stdin.on('data', c => input.push(c))
  process.stdin.on('end', () => {
    const paths = Buffer.concat(input)
      .toString()
      .replace(/^\u0000+|\u0000+$/, '')
      .split('\u0000')
    if (paths.length) void rimraf(paths)
  })
}

const g = globalThis as typeof globalThis & {
  __VLT_INTERNAL_MAIN?: string
}

if (isMain(g.__VLT_INTERNAL_MAIN ?? process.argv[1])) {
  main()
}
