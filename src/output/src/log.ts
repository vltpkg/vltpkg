import EventEmitter from 'node:events'

export type Events = {
  log: {
    level: 'debug'
    args: unknown[]
  }
}

export class OutputEmitter {
  private emitter = new EventEmitter()

  emit<T extends keyof Events>(eventName: T, payload: Events[T]) {
    this.emitter.emit(eventName, payload)
  }

  on<T extends keyof Events>(
    eventName: T,
    handler: (payload: Events[T]) => void,
  ) {
    this.emitter.on(eventName, handler)
  }

  off<T extends keyof Events>(
    eventName: T,
    handler: (payload: Events[T]) => void,
  ) {
    this.emitter.off(eventName, handler)
  }
}

export const emitter = new OutputEmitter()

export const debug = (...args: unknown[]) =>
  emitter.emit('log', { level: 'debug', args })
