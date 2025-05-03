// This needs to live in the same workspace as the RegistryClient, because
// otherwise we have a cyclical dependency cycle of dependencies in a cycle,
// which is even more cyclical than this description describing it.
import { pathToFileURL } from 'node:url'
import { RegistryClient } from './index.ts'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

export const main = async (cache?: string, input = process.stdin) => {
  if (!cache) {
    return false
  }
  const reqs = await new Promise<['GET' | 'HEAD', URL][]>(res => {
    const chunks: Buffer[] = []
    let chunkLen = 0
    input.on('data', chunk => {
      chunks.push(chunk)
      chunkLen += chunk.length
    })
    input.on('end', () => {
      const reqs: ['GET' | 'HEAD', URL][] = Buffer.concat(
        chunks,
        chunkLen,
      )
        .toString()
        .split('\0')
        .filter(
          i => !!i && (i.startsWith('GET ') || i.startsWith('HEAD ')),
        )
        .map(i =>
          i.startsWith('GET ') ?
            ['GET', new URL(i.substring('GET '.length))]
          : ['HEAD', new URL(i.substring('HEAD '.length))],
        )

      res(reqs)
    })
  })

  if (!reqs.length) {
    return false
  }

  const rc = new RegistryClient({ cache })
  await Promise.all(
    reqs.map(async ([method, url]) => {
      await rc.request(url, {
        method,
        staleWhileRevalidate: false,
      })
    }),
  )

  return true
}

const g = globalThis as typeof globalThis & {
  __VLT_INTERNAL_MAIN?: string
}

if (isMain(g.__VLT_INTERNAL_MAIN ?? process.argv[1])) {
  process.title = 'vlt-cache-revalidate'
  // When compiled there can be other leading args supplied by Deno
  // so always use the last arg unless there are only two which means
  // no path was supplied.
  const cacheFolder =
    process.argv.length === 2 ? undefined : process.argv.at(-1)
  const res = await main(cacheFolder, process.stdin)
  if (!res) {
    process.exit(1)
  }
}
