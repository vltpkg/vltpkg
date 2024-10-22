import { UnpackRequest } from './unpack-request.js'
import { unpack } from './unpack.js'

export type ResponseError = { id: number; error: unknown }
export type ResponseOK = { id: number; ok: true }

export const isResponseOK = (o: any): o is ResponseOK =>
  !!o &&
  typeof o === 'object' &&
  typeof o.id === 'number' &&
  o.ok === true

/**
 * Basically just a queue of unpack requests,
 * to keep them throttled to a reasonable amount of parallelism
 */
export class Worker {
  onMessage: (m: ResponseError | ResponseOK) => void

  constructor(onMessage: (m: ResponseError | ResponseOK) => void) {
    this.onMessage = onMessage
  }

  async process(req: UnpackRequest) {
    const { target, tarData, id } = req
    try {
      await unpack(tarData, target)
      const m: ResponseOK = { id, ok: true }
      this.onMessage(m)
    } catch (error) {
      const m: ResponseError = { id, error }
      this.onMessage(m)
    }
  }
}
