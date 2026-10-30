import {
  isMainThread,
  parentPort,
  workerData,
} from 'node:worker_threads'
import { emitter } from '@vltpkg/output'
import type { Events } from '@vltpkg/output'
import { Spec } from '@vltpkg/spec'
import type { SpecOptions } from '@vltpkg/spec'
import type { Manifest, NormalizedManifest } from '@vltpkg/types'
import type { PackageInfoClientOptions } from './index.ts'

/**
 * Resolving a manifest from a registry that serves full packuments is
 * mostly main-thread CPU: a cold install of a mid-sized project parses
 * 100MB of packument JSON, 3.5s of a 5.5s graph build on two cores,
 * during which no response is read and no node is placed. A
 * `ManifestPool` runs this script as worker threads, each with its own
 * `PackageInfoClient` over the same disk caches, so the fetch, the
 * inflate, the parse and the pick happen off the main thread, which gets
 * back only the manifest it asked for.
 *
 * The build emits it as its own bundled file: the exported
 * {@link __CODE_SPLIT_SCRIPT_NAME} is the path to spawn (the source
 * `.ts` in dev and test, the built `.js` in the bundle), and
 * {@link handleJob} is the per-message handler, exported so it can be
 * tested without a live worker.
 */
export const __CODE_SPLIT_SCRIPT_NAME = import.meta.filename

/** One manifest lookup. */
export type ManifestJob = {
  id: number
  /** the spec, as a string the worker's client parses with its options */
  spec: string
  from?: string
  backgroundRevalidate?: boolean
}

/**
 * A worker's reply for job `id`: the manifest and whether it came from a
 * vlt packument (which the main client has to know for the digest it
 * then requires of a `.tar.br`), or the message and code of the error
 * thrown. The main client asks again on its own thread after an error,
 * so the error it reports is the usual one.
 */
export type ManifestReply =
  | {
      id: number
      manifest: Manifest | NormalizedManifest
      vlt: boolean
    }
  | { id: number; error: string; code?: string }
  /** posted once, when the worker has booted and can take jobs */
  | { ready: true }
  /**
   * a registry request event from the worker's client, forwarded so the
   * main thread's reporter counts the requests made on its behalf
   */
  | { request: Events['request'] & { url: string } }

/**
 * Sent by the pool when it closes: finish the client's cache writes, then
 * let the thread exit on its own so its `beforeExit` hooks run.
 */
export type DrainMessage = { drain: true }

/** A port that takes a {@link ManifestReply}; the real one is `parentPort`. */
export type ReplyPort = {
  postMessage: (reply: ManifestReply) => void
}

/** What a worker is started with: the options for its own client. */
export type ManifestWorkerData = { options: PackageInfoClientOptions }

/** The slice of the client a job needs. */
export type ManifestWorkerClient = {
  options: SpecOptions
  manifest: (
    spec: Spec,
    options: { from?: string; backgroundRevalidate?: boolean },
  ) => Promise<Manifest | NormalizedManifest>
  isVltPackument: (spec: Spec) => boolean
}

/** Resolve one manifest and post it (or the error) back. */
export const handleJob = async (
  client: ManifestWorkerClient,
  port: ReplyPort,
  job: ManifestJob,
): Promise<void> => {
  try {
    const spec = Spec.parse(job.spec, client.options)
    const manifest = await client.manifest(spec, {
      from: job.from,
      backgroundRevalidate: job.backgroundRevalidate,
    })
    port.postMessage({
      id: job.id,
      manifest,
      vlt: client.isVltPackument(spec),
    })
  } catch (er) {
    // a non-Error can be thrown, so narrow before reading its fields
    const e = er instanceof Error ? er : undefined
    const cause = e?.cause as { code?: unknown } | undefined
    const own = e && 'code' in e ? e.code : undefined
    const code =
      typeof cause?.code === 'string' ? cause.code
      : typeof own === 'string' ? own
      : undefined
    port.postMessage({
      id: job.id,
      error: e?.message ?? String(er),
      ...(code === undefined ? {} : { code }),
    })
  }
}

// Runs only when spawned as a worker thread; on the main thread this
// module is imported just for the exports above. The client module is
// loaded here rather than at the top so the two modules do not need
// each other during their own evaluation.
/* c8 ignore start - covered by spawning a real worker in the tests */
if (!isMainThread && parentPort) {
  const port = parentPort
  const { options } = workerData as ManifestWorkerData
  void import('./index.ts').then(({ PackageInfoClient }) => {
    const client = new PackageInfoClient(options)
    emitter.on('request', event => {
      port.postMessage({
        request: { ...event, url: String(event.url) },
      })
    })
    port.on('message', (message: ManifestJob | DrainMessage) => {
      if ('drain' in message) {
        // closing the port empties the event loop once the client is
        // drained: the thread exits, after its beforeExit hooks
        void client.drain().then(() => port.close())
        return
      }
      void handleJob(client, port, message)
    })
    // tell the pool this worker can take jobs; until then they queue
    port.postMessage({ ready: true })
  })
}
/* c8 ignore stop */
