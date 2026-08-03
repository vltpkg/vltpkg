import EventEmitter from 'node:events'

export type Events = {
  request: {
    url: URL | string
    state: 'start' | 'complete' | '304' | 'cache' | 'stale'
    /** HTTP method for the request, when known. */
    method?: string
    /** HTTP status code, set on `complete`/`304` completion events. */
    statusCode?: number
    /** Wall-clock duration of the request in ms, set on completion. */
    durationMs?: number
  }
  graphStep: {
    step: 'build' | 'actual' | 'reify'
    state: 'start' | 'stop'
  }
}

/** Optional diagnostic details attached to a `request` event. */
export type RequestDetails = Omit<Events['request'], 'url' | 'state'>

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

// Exported event emitter to coordinate events.
// There must be one version of output across the entire CLI.
export const emitter = new OutputEmitter()

export const logRequest = (
  url: URL | string,
  state: Events['request']['state'],
  details: RequestDetails = {},
) => {
  emitter.emit('request', { url, state, ...details })
}

export const graphStep = (step: Events['graphStep']['step']) => {
  emitter.emit('graphStep', { step, state: 'start' })
  return () => emitter.emit('graphStep', { step, state: 'stop' })
}
