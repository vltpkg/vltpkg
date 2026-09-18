import type EventEmitter from 'node:events'
import { setPriority } from 'node:os'
import { pathToFileURL } from 'node:url'
import { RegistryClient } from './index.ts'
import { revalidateEntry } from './revalidate-entry.ts'

export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

const isMain = (path?: string) =>
  path === __CODE_SPLIT_SCRIPT_NAME ||
  path === pathToFileURL(__CODE_SPLIT_SCRIPT_NAME).toString()

const defaultConcurrency = 6

const revalidateConcurrency = (raw: string | undefined): number => {
  const n = Number(raw)
  return Number.isFinite(n) && n >= 1 ?
      Math.min(32, Math.floor(n))
    : defaultConcurrency
}

type Req = [
  method: 'GET' | 'HEAD',
  url: URL,
  accept: string | undefined,
]

const parseReq = (line: string): Req | undefined => {
  const method =
    line.startsWith('GET ') ? 'GET'
    : line.startsWith('HEAD ') ? 'HEAD'
    : undefined
  if (!method) return undefined
  const rest = line.substring(method.length + 1)
  const sp = rest.indexOf(' ')
  return sp === -1 ?
      [method, new URL(rest), undefined]
    : [method, new URL(rest.substring(0, sp)), rest.substring(sp + 1)]
}

const runPool = async (
  reqs: Req[],
  concurrency: number,
  fn: (...req: Req) => Promise<void>,
) => {
  let next = 0
  const n = Math.min(concurrency, reqs.length)
  await Promise.all(
    Array.from({ length: n }, async () => {
      for (;;) {
        const i = next++
        if (i >= reqs.length) return
        const req = reqs[i]
        /* c8 ignore next */
        if (req === undefined) return
        await fn(...req)
      }
    }),
  )
}

export const main = async (
  cache?: string,
  input: EventEmitter = process.stdin,
) => {
  if (!cache) {
    return false
  }
  const reqs = await new Promise<Req[]>(res => {
    const chunks: Buffer[] = []
    let chunkLen = 0
    input.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
      chunkLen += chunk.length
    })
    input.on('end', () => {
      const reqs = Buffer.concat(chunks, chunkLen)
        .toString()
        .split('\0')
        .map(parseReq)
        .filter(req => req !== undefined)

      res(reqs)
    })
  })

  if (!reqs.length) {
    return false
  }

  const rc = new RegistryClient({ cache })
  await runPool(
    reqs,
    revalidateConcurrency(process.env.VLT_REVALIDATE_CONCURRENCY),
    (method, url, accept) => revalidateEntry(rc, method, url, accept),
  )

  return true
}

if (isMain(process.argv[1])) {
  process.title = 'vlt-cache-revalidate'
  try {
    setPriority(19)
    /* c8 ignore next */
  } catch {}
  const cacheFolder =
    process.argv.length === 2 ? undefined : process.argv.at(-1)
  const res = await main(cacheFolder, process.stdin)
  if (!res) {
    process.exit(1)
  }
}
