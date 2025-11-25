/**
 * A simple Least Recently Used (LRU) cache implementation
 * Uses a Map to maintain insertion order and provide O(1) operations
 * @template T The type of values stored in the cache
 */
export class LRUCache<T> {
  private cache: Map<string, T>
  private maxSize: number

  constructor(maxSize = 50) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value from the cache
   * Moves the accessed entry to the end (most recently used)
   */
  get(key: string): T | undefined {
    const value = this.cache.get(key)
    if (value !== undefined) {
      // Move to end (LRU behavior)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  /**
   * Set a value in the cache
   * Removes the oldest entry if at capacity
   */
  set(key: string, value: T): void {
    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    // Delete and re-add to move to end if key exists
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }

    this.cache.set(key, value)
  }

  /**
   * Check if a key exists in the cache
   */
  has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current size of the cache
   */
  get size(): number {
    return this.cache.size
  }
}
