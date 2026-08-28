import type EventEmitter from 'node:events'
import { setPriority } from 'node:os'
import { pathToFileURL } from 'node:url'
import { readPayload } from './daemon.ts'
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

const runPool = async (
  reqs: ['GET' | 'HEAD', URL][],
  concurrency: number,
  fn: (method: 'GET' | 'HEAD', url: URL) => Promise<void>,
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
        await fn(req[0], req[1])
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
  const reqs: ['GET' | 'HEAD', URL][] = (await readPayload(input))
    .split('\0')
    .filter(
      i => !!i && (i.startsWith('GET ') || i.startsWith('HEAD ')),
    )
    .map(i =>
      i.startsWith('GET ') ?
        ['GET', new URL(i.substring('GET '.length))]
      : ['HEAD', new URL(i.substring('HEAD '.length))],
    )

  if (!reqs.length) {
    return false
  }

  const rc = new RegistryClient({ cache })
  await runPool(
    reqs,
    revalidateConcurrency(process.env.VLT_REVALIDATE_CONCURRENCY),
    (method, url) => revalidateEntry(rc, method, url),
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
