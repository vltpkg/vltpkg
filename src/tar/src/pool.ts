import {
  FixedQueue,
  Piscina,
  transferableSymbol,
  valueSymbol,
} from 'piscina'
import { __CODE_SPLIT_SCRIPT_NAME } from './piscina-worker.ts'
import type { UnpackTask } from './piscina-worker.ts'

/**
 * Transferable wrapper for unpack input that implements the Transferable interface
 * to ensure zero-copy buffer transfer to worker threads using Piscina.move()
 */
class TransferableUnpackInput implements UnpackTask {
  public tarData: Uint8Array
  public target: string

  constructor(tarData: Uint8Array, target: string) {
    this.tarData = tarData
    this.target = target
  }

  /**
   * Transferable interface implementation using Piscina's symbols
   * Returns the list of transferable objects (ArrayBuffers) to be transferred
   */
  get [transferableSymbol](): ArrayBuffer[] {
    return [this.tarData.buffer]
  }

  /**
   * Value symbol implementation for Piscina's Transferable interface
   * Returns the actual value to be transferred
   */
  get [valueSymbol](): UnpackTask {
    return {
      tarData: this.tarData,
      target: this.target,
    }
  }
}

/**
 * Pool of workers using Piscina to maximize parallelism
 * of unpack operations with SharedArrayBuffer for zero-copy memory transfer.
 */
export class Pool {
  private piscina: Piscina<UnpackTask>

  constructor() {
    this.piscina = new Piscina<UnpackTask>({
      filename: __CODE_SPLIT_SCRIPT_NAME,
      taskQueue: new FixedQueue(),
      idleTimeout: 60000,
      atomics: 'async',
    })
  }

  /**
   * Provide the tardata to be unpacked, and the location where it's to be
   * placed. Uses Transferable objects for zero-copy transfer to workers.
   */
  async unpack(tarData: Uint8Array, target: string): Promise<void> {
    const task = new TransferableUnpackInput(tarData, target)
    await this.piscina.run(
      Piscina.move(task) as unknown as UnpackTask,
    )
  }

  /**
   * Terminate all workers in the pool
   */
  async destroy(): Promise<void> {
    await this.piscina.destroy()
  }
}
