import { pathToFileURL } from 'node:url'
import { rimraf } from 'rimraf'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

// This is run as a background process, and all the paths to
// be removed written into stdin. We can't pass on argv, because
// it'll be a very long list in many cases.
const main = async () => {
  const paths = await new Promise<string[]>(res => {
    const chunks: Buffer[] = []
    let chunkLen = 0
    process.stdin.on('data', chunk => {
      chunks.push(chunk)
      chunkLen += chunk.length
    })
    process.stdin.on('end', () => {
      res(
        Buffer.concat(chunks, chunkLen)
          .toString()
          .split('\0')
          .filter(i => !!i),
      )
    })
  })

  if (paths.length) {
    await rimraf(paths)
  }
}

const g = globalThis as typeof globalThis & {
  __VLT_INTERNAL_MAIN?: string
}

if (isMain(g.__VLT_INTERNAL_MAIN ?? process.argv[1])) {
  await main()
}
