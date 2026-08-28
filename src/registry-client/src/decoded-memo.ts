import type { CacheEntry } from './cache-entry.ts'

/** default budget: total bytes of the buffers held by the memo */
export const defaultMaxSize = 64 * 1024 * 1024

/**
 * Bounded LRU memo of decoded {@link CacheEntry} objects, keyed by the raw
 * buffer they were decoded from.
 *
 * This replaced a `WeakMap`. A `WeakMap` bounds itself only if its keys are
 * collected, and they are never collected in the compiled binary, so the
 * memo would pin every decoded packument for the life of the process. Even
 * under Node the memo pins the parsed JSON hanging off each entry, which
 * measured +286MB RSS on a cold install.
 *
 * Insertion order is the recency order — a hit re-inserts the key — so
 * eviction is a plain walk from the front.
 */
export class DecodedMemo {
  #map = new Map<Uint8Array, CacheEntry>()
  #size = 0
  readonly maxSize: number

  constructor(maxSize = defaultMaxSize) {
    this.maxSize = maxSize
  }

  /** number of entries currently held */
  get count(): number {
    return this.#map.size
  }

  /** total bytes of the buffers currently held */
  get size(): number {
    return this.#size
  }

  get(buffer: Uint8Array): CacheEntry | undefined {
    const hit = this.#map.get(buffer)
    if (hit === undefined) return undefined
    // move to the back: most recently used
    this.#map.delete(buffer)
    this.#map.set(buffer, hit)
    return hit
  }

  set(buffer: Uint8Array, entry: CacheEntry): this {
    // a buffer bigger than the whole budget is never worth holding
    const cost = buffer.byteLength || 1
    if (cost > this.maxSize) return this
    if (this.#map.delete(buffer)) this.#size -= cost
    this.#map.set(buffer, entry)
    this.#size += cost
    for (const [k] of this.#map) {
      if (this.#size <= this.maxSize) break
      this.#map.delete(k)
      this.#size -= k.byteLength || 1
    }
    return this
  }

  clear(): void {
    this.#map.clear()
    this.#size = 0
  }
}
