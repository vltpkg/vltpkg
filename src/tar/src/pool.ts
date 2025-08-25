import { error } from '@vltpkg/error-cause'
import os from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Piscina from 'piscina'
import type { WorkerInput } from './worker-thread.ts'

/**
 * Automatically expanding/contracting set of workers to maximize parallelism
 * of unpack operations up to 1 less than the number of CPUs (or 1).
 *
 * `pool.unpack(tarData, target)` will perform the unpack operation
 * in one of these workers, and returns a promise when the
 * worker has confirmed completion of the task.
 */
export class Pool {
  /**
   * Piscina instance for managing worker threads
   */
  private piscina: Piscina

  constructor() {
    /* c8 ignore next */
    const jobs = 8 * (Math.max(os.availableParallelism(), 2) - 1)
    
    // Get the current module directory
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = resolve(__filename, '..')
    
    this.piscina = new Piscina({
      filename: resolve(__dirname, 'worker-thread.js'),
      maxThreads: jobs,
      minThreads: 1,
      idleTimeout: 60000, // 60 seconds
    })
  }

  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Will use Piscina to manage worker threads and transfer the buffer
   * efficiently.
   *
   * Returned promise resolves when the provided tarball has been extracted.
   */
  async unpack(tarData: Buffer, target: string): Promise<void> {
    try {
      // Create a transferable buffer from the input
      // First, we need to ensure the buffer is backed by an ArrayBuffer we can transfer
      const arrayBuffer = tarData.buffer.slice(
        tarData.byteOffset,
        tarData.byteOffset + tarData.byteLength
      )
      
      // Create a new Buffer from the ArrayBuffer that we'll pass to the worker
      const transferableBuffer = Buffer.from(arrayBuffer)
      
      const input: WorkerInput = {
        tarData: transferableBuffer,
        target,
      }
      
      // Run the task in a worker thread with buffer transfer
      await this.piscina.run(input, {
        transferList: [arrayBuffer],
      })
    } catch (err) {
      throw error(
        'Failed to unpack tarball',
        {
          cause: err,
          target,
        },
      )
    }
  }

  /**
   * Destroy the pool and terminate all workers
   */
  async destroy(): Promise<void> {
    await this.piscina.destroy()
  }
}
