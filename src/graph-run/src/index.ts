import { setMaxListeners } from 'node:events'

/**
 * Codes indicating the type of error that was encountered.
 * These are found on the `Error.cause.code` field.
 *
 * They are:
 *
 * - `'GRAPHRUN_TRAVERSAL'` The command run on a given node has failed, either
 *   by throwing an error, or by returning a rejected promise.
 * - `'GRAPHRUN_NO_NODES'` An empty list of initial nodes was provided to the
 *   graph run operation. At least one starting node must be present in the
 *   list.
 * - `'GRAPHRUN_CYCLE_WITHOUT_PATH'` - A cycle in the graph was detected, but
 *   the path *to* the node where the cycle was detected could not be
 *   determined. This is impossible, and cannot ever happen.
 */
export type ErrorCode =
  | 'GRAPHRUN_NO_NODES'
  | 'GRAPHRUN_CYCLE_WITHOUT_PATH'
  | 'GRAPHRUN_TRAVERSAL'

export type ErrorCause<Node> = {
  code: ErrorCode
} & (
  | {
      code: 'GRAPHRUN_NO_NODES'
      found: unknown
      wanted: string
    }
  | { code: 'GRAPHRUN_CYCLE_WITHOUT_PATH' }
  | {
      code: 'GRAPHRUN_TRAVERSAL'
      cause: Error
      node: Node
      path: Node[]
    }
)

export const isGraphRunError = <Node>(
  er: unknown,
): er is Error & { cause: ErrorCause<Node> } =>
  !!er &&
  typeof er === 'object' &&
  'cause' in er &&
  !!er.cause &&
  typeof er.cause === 'object' &&
  'code' in er.cause &&
  ((er.cause.code === 'GRAPHRUN_NO_NODES' &&
    'found' in er.cause &&
    'wanted' in er.cause &&
    typeof er.cause.wanted === 'string') ||
    (er.cause.code === 'GRAPHRUN_TRAVERSAL' &&
      'path' in er.cause &&
      Array.isArray(er.cause.path) &&
      'node' in er.cause &&
      'cause' in er.cause) ||
    er.cause.code === 'GRAPHRUN_CYCLE_WITHOUT_PATH')

/**
 * Options that define the graph and how to traverse it
 */
export interface RunnerOptions<Node, Result = void> {
  /** Array of one or more entry nodes. */
  graph: [node: Node, ...rest: Node[]]

  /** get the dependencies of a given node */
  getDeps: (node: Node) => Node[] | Promise<Node[]>

  /** action to take on each node */
  visit: (
    node: Node,
    signal: AbortSignal,
    path: Node[],
    depResults: DepResults<Node, Result>,
  ) => Result | Promise<Result>

  /**
   * Called when a cycle is encountered.
   * Throw in this method to enforce a DAG graph.
   * If left undefined, then cycles are silently ignored and skipped.
   *
   * `node` parameter is the dependency that is being skipped.
   *
   * `cycle` is the route from the dependent back to itself via
   * the parent.
   *
   * `path` is the path to the dependent who wanted this dep to be
   * loaded.
   */
  onCycle?: (
    node: Node,
    cycle: Node[],
    path: Node[],
  ) => void | Promise<void>

  /**
   * Set to `false` to continue operations even if errors occur.
   * If set to false, then an AggregateError will be raised on failure
   * containing all failures (even if only one). If true, then a normal
   * Error will be raised on failure.
   * @default true
   */
  failFast?: boolean

  /** a signal that will trigger the graph traversal to end prematurely */
  signal?: AbortSignal
}

export type DepResults<Node, Result> = Map<Node, Result | undefined>

/**
 * Options that can define a synchronous graph traversal.
 *
 * Note that if the visit() method is async, then the *promises themselves*
 * will be used as the `Result` type, which is likely not what you want!
 */
export interface RunnerOptionsSync<
  Node,
  Result = void,
> extends RunnerOptions<Node, Result> {
  /** Get a set of dependency nodes synchronously */
  getDeps: (node: Node) => Node[]

  /** Visit a node synchronously */
  visit: (
    node: Node,
    signal: AbortSignal,
    path: Node[],
    depResults: DepResults<Node, Result>,
  ) => Result

  /** Handle cycles synchronously */
  onCycle?: (node: Node, cycle: Node[], path: Node[]) => void
}

/**  A map of nodes to their PromiseSettledResult value */
export type SettledMap<Node, Result = void> = Map<
  Node,
  PromiseSettledResult<Result>
>

/** Any function or class. Used for Error.captureStackTrace */
export type Callable =
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  | Function
  | ((...a: unknown[]) => unknown)
  | (new (...a: unknown[]) => unknown)

/** Base class of Runner and RunnerSync */
export abstract class RunnerBase<
  /** The type of thing to be found in this graph */
  Node,
  /** Type returned by the visit() method */
  Result = void,
  Sync extends boolean = false,
  O extends Sync extends true ? RunnerOptionsSync<Node, Result>
  : RunnerOptions<Node, Result> = Sync extends true ?
    RunnerOptionsSync<Node, Result>
  : RunnerOptions<Node, Result>,
> {
  /** The map of traversal results */
  readonly results = new Map<Node, Result>()

  /** The map of PromiseSettledResult objects */
  readonly settled: SettledMap<Node, Result> = new Map()

  /** Set of dependents (direct & transitive) on each node */
  readonly dependents = new Map<Node, Set<Node>>()

  /** Set of direct dependents on each node */
  readonly directDependents = new Map<Node, Set<Node>>()

  /** Options provided to constructor */
  readonly options: O

  /**
   * AbortController used internally to abort the process.
   *
   * This is internal only, and triggering it at the wrong time may cause
   * undefined and unsupported behavior. Do not use!
   *
   * Instead, if you want to be able to abort the walk at any time, provide
   * your own AbortSignal in the opions.
   * @internal
   */
  readonly abortController: AbortController

  /** True if we are in failFast mode */
  readonly failFast: boolean

  /** Rejections and Errors encountered in the traversal */
  readonly errors: unknown[] = []

  /**
   * Function defining the callsite where the traversal was initiated,
   * used for Error.captureStackTrace.
   */
  readonly from: Callable

  constructor(options: O, from?: Callable) {
    const ac = new AbortController()
    this.from = from ?? this.constructor
    this.abortController = ac
    setMaxListeners(Infinity, ac.signal)
    this.options = options
    if (!options.graph.length) {
      const er = new Error('no nodes provided to graph traversal', {
        cause: {
          code: 'GRAPHRUN_NO_NODES',
          found: options.graph,
          wanted: '[first: Node, ...rest: Node[]]',
        },
      })
      Error.captureStackTrace(er, from)
      throw er
    }
    this.failFast = options.failFast !== false
    const { signal } = options
    if (signal !== undefined) {
      signal.addEventListener('abort', reason => ac.abort(reason), {
        once: true,
        signal: ac.signal,
      })
    }
  }

  /** Initiate the graph traversal, resolving/returning when complete */
  abstract run(): Sync extends true ? void : Promise<void>

  /** Get the dependencies of a given node */
  abstract getDeps(
    n: Node,
  ): Sync extends true ? Node[] : Promise<Node[]>

  /** Visit a node. Calls `options.visit()` */
  abstract visit(
    n: Node,
    path: Node[],
    depResults: DepResults<Node, Result>,
  ): Sync extends true ? Result : Promise<Result>

  /**
   * Calls the `options.onCycle()` method when a cycle is detected.
   */
  abstract onCycle(
    n: Node,
    cycle: Node[],
    path: Node[],
  ): Sync extends true ? void : void | Promise<void>

  /**
   * For a Node `n` that depends directly or transitively on Node `d`, find the
   * shortest known dependency path from `n` to `d`. This is done by walking
   * backwards breadth-first up the dependency relations from `d` until `n` is
   * found.
   *
   * If no known path can be found, then `undefined` is returned. Otherwise,
   * a path array is returned that starts with `n` and ends with `d`.
   *
   * Note that self-referential links are never considered, since they're
   * by definition cyclical.
   */
  route(n: Node, d: Node): undefined | [n: Node, ...path: Node[]] {
    const dependents = this.dependents.get(d)
    if (!dependents?.has(n)) return undefined
    const directDependents = this.directDependents.get(d)
    /* c8 ignore next */
    if (!directDependents) return undefined
    if (directDependents.has(n)) {
      return [n, d]
    }
    const queue: [n: Node, ...r: Node[]][] = [
      ...directDependents,
    ].map(dd => [dd, d])
    let step: undefined | [n: Node, ...r: Node[]] = undefined
    while (undefined !== (step = queue.shift())) {
      /* c8 ignore next */
      if (!dependents.has(step[0])) continue
      if (step[0] === n) {
        return step
      }
      const ddd = this.directDependents.get(step[0])
      if (ddd) {
        for (const d of ddd) {
          queue.push([d, ...step])
        }
      }
    }
  }

  /**
   * If the dependency from `n -> d` at the specified path would
   * cause a cycle, then call the onCycle method and return true.
   * Oherwise, assign the appropriate entries in the dependency
   * tracking sets, and return false.
   * @internal
   */
  cycleCheck(n: Node, path: Node[], d: Node) {
    /* c8 ignore next */
    const dependents = this.dependents.get(n) ?? new Set()
    this.dependents.set(n, dependents)
    const isCycle = dependents.has(d)
    if (isCycle) {
      const cycle = this.route(d, n)
      /* c8 ignore start - impossible */
      if (!cycle) {
        throw new Error('cycle detected, but cycle route not found', {
          cause: { code: 'GRAPHRUN_CYCLE_WITHOUT_PATH' },
        })
      }
      /* c8 ignore stop */
      cycle.unshift(n)
      void this.onCycle(d, cycle, path)
      return true
    }

    const depDD = this.directDependents.get(d) ?? new Set()
    this.directDependents.set(d, depDD)
    depDD.add(n)

    const depDependents = this.dependents.get(d) ?? new Set()
    this.dependents.set(d, depDependents)
    for (const n of dependents) {
      depDependents.add(n)
    }
    depDependents.add(n)
    return false
  }

  /**
   * Method that handles errors raised by visits.
   * @internal
   */
  handleError(er: unknown, n: Node, path: Node[]) {
    this.errors.push(er)
    this.settled.set(n, {
      status: 'rejected',
      reason: er,
    })
    if (this.failFast) {
      this.abortController.abort(er)
      const e = new Error('failed graph traversal', {
        cause: {
          code: 'GRAPHRUN_TRAVERSAL',
          node: n,
          path,
          cause: er as Error,
        },
      })
      Error.captureStackTrace(e, this.from)
      throw e
    }
  }

  /**
   * Method that handles successful visit results
   * @internal
   */
  handleValue(value: Result, n: Node) {
    this.results.set(n, value)
    this.settled.set(n, {
      status: 'fulfilled',
      value,
    })
  }
}

/** Asynchronous graph runner */
export class Runner<Node, Result> extends RunnerBase<
  Node,
  Result,
  false,
  RunnerOptions<Node, Result>
> {
  /** Map of nodes currently awaiting completion */
  readonly running = new Map<Node, Promise<void>>()

  /** Track which node's promise is waiting for which other nodes */
  readonly promiseWaiting = new Map<Node, Set<Node>>()

  async getDeps(n: Node) {
    /* c8 ignore next */
    if (this.abortController.signal.aborted) return []
    const deps = await this.options.getDeps(n)
    for (const d of deps) {
      const dependents = this.dependents.get(d) ?? new Set()
      this.dependents.set(d, dependents)
      dependents.add(n)
      const depDD = this.directDependents.get(d) ?? new Set()
      this.directDependents.set(d, depDD)
      depDD.add(n)
    }
    return deps
  }

  async visit(
    n: Node,
    path: Node[],
    depResults: DepResults<Node, Result>,
  ) {
    const { signal } = this.abortController
    return this.options.visit(n, signal, path, depResults)
  }

  async onCycle(n: Node, cycle: Node[], path: Node[]) {
    /* c8 ignore next */
    if (this.abortController.signal.aborted) return
    await this.options.onCycle?.(n, cycle, path)
  }

  /**
   * Check if node `target` is waiting (directly or transitively) for node `n`.
   * If so, making `n` wait for `target` would create a deadlock.
   */
  #isWaitingFor(
    target: Node,
    n: Node,
    visited = new Set<Node>(),
  ): boolean {
    if (visited.has(target)) return false
    visited.add(target)
    const waiting = this.promiseWaiting.get(target)
    if (!waiting) return false
    if (waiting.has(n)) return true
    for (const w of waiting) {
      if (this.#isWaitingFor(w, n, visited)) return true
    }
    return false
  }

  async #walk(n: Node, path: Node[]) {
    const r = this.running.get(n)
    /* c8 ignore next */
    if (r) return r
    /* c8 ignore start */
    if (this.settled.get(n)) return
    /* c8 ignore stop */
    const p = this.#step(n, path).then(
      () => {
        this.running.delete(n)
        this.promiseWaiting.delete(n)
      },
      /* c8 ignore start - handled deeper in the chain */
      (er: unknown) => {
        this.running.delete(n)
        this.promiseWaiting.delete(n)
        throw er
      },
      /* c8 ignore stop */
    )
    this.running.set(n, p)
    return p
  }

  async #step(n: Node, path: Node[]) {
    const dependents = this.dependents.get(n) ?? new Set()
    this.dependents.set(n, dependents)

    const deps = await this.getDeps(n)
    const awaiting: Promise<void>[] = []
    const depPath = [...path, n]

    // Initialize waiting set for this node
    const waitingOn = new Set<Node>()
    this.promiseWaiting.set(n, waitingOn)

    for (const d of deps) {
      /* c8 ignore next */
      if (this.abortController.signal.aborted) return
      // self-link, skip
      if (d === n) continue
      if (this.cycleCheck(n, depPath, d)) continue
      /* c8 ignore next */
      if (this.settled.get(d)) continue

      const runningPromise = this.running.get(d)
      if (runningPromise) {
        // Check if d is already waiting for n (promise-level cycle)
        if (this.#isWaitingFor(d, n)) {
          // Treat as cycle to prevent deadlock
          void this.onCycle(d, [n, d], depPath)
          continue
        }
      }

      // Record that n is waiting for d
      waitingOn.add(d)
      awaiting.push(runningPromise ?? this.#walk(d, depPath))
    }

    /* c8 ignore next */
    if (this.abortController.signal.aborted) return
    await Promise.all(awaiting)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this.abortController.signal.aborted) return
    const depRes = new Map<Node, Result | undefined>(
      deps.map(d => [d, this.results.get(d)]),
    )
    try {
      this.handleValue(await this.visit(n, path, depRes), n)
    } catch (er) {
      this.handleError(er, n, path)
    }
  }

  async run(): Promise<void> {
    const promises: Promise<void>[] = []
    for (const n of this.options.graph) {
      promises.push(this.#walk(n, []))
    }
    await Promise.all(promises)
  }
}

/** Synchronous graph runner */
export class RunnerSync<Node, Result> extends RunnerBase<
  Node,
  Result,
  true,
  RunnerOptionsSync<Node, Result>
> {
  getDeps(n: Node) {
    if (this.abortController.signal.aborted) return []
    return this.options.getDeps(n)
  }

  visit(n: Node, path: Node[], depResults: DepResults<Node, Result>) {
    const { signal } = this.abortController
    return this.options.visit(n, signal, path, depResults)
  }

  onCycle(n: Node, cycle: Node[], path: Node[]) {
    /* c8 ignore next */
    if (this.abortController.signal.aborted) return
    this.options.onCycle?.(n, cycle, path)
  }

  #walk(n: Node, path: Node[]) {
    /* c8 ignore start */
    if (this.settled.get(n)) return
    /* c8 ignore stop */
    this.#step(n, path)
  }

  #step(n: Node, path: Node[]) {
    const dependents = this.dependents.get(n) ?? new Set()
    this.dependents.set(n, dependents)

    const deps = this.getDeps(n)
    const depPath = [...path, n]
    for (const d of deps) {
      if (this.abortController.signal.aborted) return
      /* c8 ignore next */
      if (d === n) continue
      if (this.cycleCheck(n, depPath, d)) continue
      if (!this.settled.get(d)) this.#walk(d, depPath)
    }

    if (this.abortController.signal.aborted) return
    const depRes = new Map<Node, Result | undefined>(
      deps.map(d => [d, this.results.get(d)]),
    )
    try {
      this.handleValue(this.visit(n, path, depRes), n)
    } catch (er) {
      this.handleError(er, n, path)
    }
  }

  run(): Map<Node, Result> {
    for (const n of this.options.graph) {
      this.#walk(n, [])
    }
    return this.results
  }
}

/**
 * Asynchronous graph traversal method
 *
 * If `failFast:false` is set in the options, then an AggregateError
 * will be raised if there were any failures. Otherwise, a normal Error
 * is raised on failure.
 */
export const graphRun = async <Node, Result>(
  options: RunnerOptions<Node, Result>,
): Promise<Map<Node, Result>> => {
  const runner = new Runner(options, graphRun)
  await runner.run()
  if (runner.errors.length) {
    const e = new AggregateError(
      runner.errors,
      'failed graph traversal',
    )
    Error.captureStackTrace(e, graphRun)
    throw e
  }
  return runner.results
}

/**
 * Synchronous graph traversal method
 *
 * If `failFast:false` is set in the options, then an AggregateError
 * will be thrown if there were any failures. Otherwise, a normal Error
 * is thrown on failure.
 */
export const graphRunSync = <Node, Result>(
  options: RunnerOptionsSync<Node, Result>,
): Map<Node, Result> => {
  const runner = new RunnerSync(options, graphRunSync)
  runner.run()
  if (runner.errors.length) {
    const e = new AggregateError(
      runner.errors,
      'failed graph traversal',
    )
    Error.captureStackTrace(e, graphRunSync)
    throw e
  }
  return runner.results
}

/**
 * Asynchronous graph traversal, capturing all error/result
 * statuses.
 */
export const allSettled = async <Node, Result>(
  options: RunnerOptions<Node, Result>,
): Promise<SettledMap<Node, Result>> => {
  const runner = new Runner(
    { ...options, failFast: false },
    allSettled,
  )
  await runner.run()
  return runner.settled
}

/**
 * Synchronous graph traversal, capturing all error/result
 * statuses.
 */
export const allSettledSync = <Node, Result>(
  options: RunnerOptionsSync<Node, Result>,
): SettledMap<Node, Result> => {
  const runner = new RunnerSync(
    { ...options, failFast: false },
    allSettledSync,
  )
  runner.run()
  return runner.settled
}

/**
 * Asynchronous graph traversal, returning the first successful visit.
 * If all visits fail, then an AggregateError is raised with all errors
 * encountered.
 */
export const any = async <Node, Result>(
  options: RunnerOptions<Node, Result>,
): Promise<Result> => {
  const ac = new AbortController()
  let result!: Result
  let found = false
  const runner = new Runner<Node, Result>(
    {
      ...options,
      failFast: false,
      signal: ac.signal,
      visit: async (node, signal, path, depResults) => {
        try {
          result = await options.visit(node, signal, path, depResults)
          found = true
          ac.abort('found')
        } catch {}
        return result
      },
    },
    any,
  )
  await runner.run()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!found) {
    const e = new AggregateError(
      runner.errors,
      'failed graph traversal',
    )
    Error.captureStackTrace(e, any)
    throw e
  }
  return result
}

/**
 * Synchronous graph traversal, returning the first successful visit.
 * If all visits fail, then an AggregateError is thrown with all errors
 * encountered.
 */
export const anySync = <Node, Result>(
  options: RunnerOptionsSync<Node, Result>,
): Result => {
  const ac = new AbortController()
  let result!: Result
  let found = false
  const runner = new RunnerSync<Node, Result>(
    {
      ...options,
      failFast: false,
      signal: ac.signal,
      visit: (node, signal, path, depResults) => {
        try {
          result = options.visit(node, signal, path, depResults)
          found = true
          ac.abort('found')
        } catch {}
        return result
      },
    },
    anySync,
  )
  runner.run()
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!found) {
    const e = new AggregateError(
      runner.errors,
      'failed graph traversal',
    )
    Error.captureStackTrace(e, anySync)
    throw e
  }
  return result
}

/**
 * Asynchronous graph traversal, resolving or rejecting when the first visit
 * resolves or rejects.
 */
export const race = async <Node, Result>(
  options: RunnerOptions<Node, Result>,
): Promise<Result> => {
  const ac = new AbortController()
  let result!: Result
  const runner = new Runner<Node, Result>(
    {
      ...options,
      failFast: true,
      signal: ac.signal,
      visit: async (node, signal, path, depResults) => {
        try {
          result = await options.visit(node, signal, path, depResults)
          ac.abort('found')
          /* c8 ignore next */
        } catch {}
        return result
      },
    },
    race,
  )
  await runner.run()
  return result
}

/**
 * Synchronous graph traversal, returning or throwing when the first visit
 * is completed.
 */
export const raceSync = <Node, Result>(
  options: RunnerOptionsSync<Node, Result>,
): Result => {
  const ac = new AbortController()
  let result!: Result
  const runner = new RunnerSync<Node, Result>(
    {
      ...options,
      failFast: true,
      signal: ac.signal,
      visit: (node, signal, path, depResults) => {
        try {
          result = options.visit(node, signal, path, depResults)
          ac.abort('found')
          /* c8 ignore next */
        } catch {}
        return result
      },
    },
    race,
  )
  runner.run()
  return result
}
