import { setTimeout } from 'node:timers/promises'
import t from 'tap'
import type {
  RunnerOptions,
  RunnerOptionsSync,
} from '../src/index.ts'
import {
  allSettled,
  allSettledSync,
  any,
  anySync,
  graphRun,
  graphRunSync,
  isGraphRunError,
  race,
  raceSync,
  Runner,
  RunnerSync,
} from '../src/index.ts'

RunnerSync

// WARNING: this is the most dangerous problem in mathematics!
// Note that it defines an infinitely large graph, as it contains all
// integers. Thankfully, we'll only traverse a small part of it, because as
// far as anyone has seen, it always results in a loop at some point, though
// as of 2024 this has never been proven rigorously. It is said that trying
// to solve this problem will result in one's entire life being consumed.
const danger = (x: number) => (x % 2 === 0 ? x / 2 : 3 * x + 1)

t.test('async graph traversal', async t => {
  const visited: number[] = []
  const paths = new Map<number, number[]>()
  const cycles: [number, number[], number[]][] = []
  const results = await graphRun({
    graph: [7, 23, 22, 64],
    getDeps: async n => [danger(n)],
    visit: async (n, signal, path) => {
      visited.push(n)
      t.type(signal, AbortSignal)
      paths.set(n, path)
      // stress it by making it actually async
      await setTimeout(Math.floor(Math.random() * 10))
      return path
    },
    onCycle: async (n, cycle, path) => {
      cycles.push([n, cycle, path])
    },
  })
  const uniqueVisits = new Set(visited)
  t.equal(
    visited.length,
    uniqueVisits.size,
    'visited each node 1 time',
  )
  t.matchSnapshot(
    visited.sort((a, b) => a - b),
    'visited',
  )
  t.matchSnapshot(Object.fromEntries([...results]), 'results')
  t.matchSnapshot(Object.fromEntries([...paths]), 'paths')
  t.matchSnapshot(cycles, 'cycles')
})

t.test('sync graph traversal', t => {
  // note that the paths will be fewer and longer in this case,
  // because there is no parallel preemption of repeated nodes
  const visited: number[] = []
  const paths = new Map<number, number[]>()
  const cycles: [number, number[], number[]][] = []
  const results = graphRunSync({
    graph: [7, 23, 22, 64],
    getDeps: n => [danger(n)],
    visit: (n, signal, path) => {
      visited.push(n)
      t.type(signal, AbortSignal)
      paths.set(n, path)
      return path
    },
    onCycle: (n, cycle, path) => {
      cycles.push([n, cycle, path])
    },
  })
  const uniqueVisits = new Set(visited)
  t.equal(
    visited.length,
    uniqueVisits.size,
    'visited each node 1 time',
  )
  t.matchSnapshot(
    visited.sort((a, b) => a - b),
    'visited',
  )
  t.matchSnapshot(Object.fromEntries([...results]), 'results')
  t.matchSnapshot(Object.fromEntries([...paths]), 'paths')
  t.matchSnapshot(cycles, 'cycles')
  t.end()
})

// return all the factors of a number >= its square root
// eg 12 -> [4, 6]
// for primes (or non-integers), returns []
const bigFactors = (n: number): number[] => {
  const s = Math.sqrt(n)
  const f: number[] = []
  for (let i = 2; i <= s; i++) {
    const d = n / i
    if (d === Math.floor(d)) f.unshift(d)
  }
  return f
}

t.test('any', async t => {
  const largestPrimeFactor = async (num: number): Promise<number> => {
    const opts: RunnerOptions<number, number> = {
      graph: [num],
      getDeps: bigFactors,
      visit: (n, _, path, dependencyResults) => {
        for (const p of path) {
          const d = num / p
          t.equal(
            d,
            Math.floor(d),
            'should only find integer factors',
          )
        }
        t.equal(dependencyResults.size, 0, 'stops at leaf node')
        return n
      },
    }
    return await any(opts)
  }
  const three = await largestPrimeFactor(24)
  t.equal(three, 3)

  const big = await largestPrimeFactor(12345678)
  t.equal(big, 14593)
})

t.test('anySync', t => {
  const largestPrimeFactor = (num: number): number => {
    const opts: RunnerOptionsSync<number, number> = {
      graph: [num],
      getDeps: bigFactors,
      visit: (n, _, path, dependencyResults) => {
        for (const p of path) {
          const d = num / p
          t.equal(
            d,
            Math.floor(d),
            'should only find integer factors',
          )
        }
        t.equal(dependencyResults.size, 0, 'stops at leaf node')
        return n
      },
    }
    return anySync(opts)
  }
  const three = largestPrimeFactor(24)
  t.equal(three, 3)

  const big = largestPrimeFactor(12345678)
  t.equal(big, 14593)

  t.end()
})

t.test('exploring various shapes', async t => {
  const getDeps = (n: any): any[] => {
    const { name, ...props } = n
    return Object.values(props)
  }

  // base/links
  type O = { name: string } & {
    [k in 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h']?: O
  }
  const shapes: [O, (o: O) => void][] = [
    [{ name: 'selfLink' }, o => Object.assign(o, { selfLink: o })],
    [
      {
        name: 'couple',
        a: { name: 'a' },
        b: { name: 'b' },
      },
      o => {
        Object.assign(o.a!, { b: o.b })
        Object.assign(o.b!, { a: o.a })
      },
    ],
    [
      {
        name: 'triangle',
        a: { name: 'a', b: { name: 'b', c: { name: 'c' } } },
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
      o => Object.assign(o.a?.b?.c!, { a: o.a }),
    ],
    [
      {
        name: 'tripod',
        a: { name: 'a' },
        b: { name: 'b' },
        c: { name: 'c' },
      },
      o => {
        Object.assign(o.a!, { b: o.b })
        Object.assign(o.b!, { c: o.c })
        Object.assign(o.c!, { a: o.a })
      },
    ],
    [
      {
        name: 'pyramid',
        a: { name: 'a' },
        b: { name: 'b' },
        c: { name: 'c' },
      },
      o => {
        Object.assign(o.a!, { b: o.b })
        Object.assign(o.b!, { c: o.c })
        Object.assign(o.c!, { a: o.a })
        Object.assign(o.a!, { c: o.c })
        Object.assign(o.b!, { a: o.a })
        Object.assign(o.c!, { b: o.b })
      },
    ],
    [
      // o->a<->b<->c
      //    ^-------^
      {
        name: 'throuple',
        a: { name: 'a', b: { name: 'b', c: { name: 'c' } } },
      },
      o => {
        Object.assign(o.a!, { c: o.a?.b?.c })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.b!, { a: o.a })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.b?.c!, {
          a: o.a,
          b: o.a?.b,
        })
      },
    ],
    [
      {
        name: 'diamond',
        a: { name: 'a', c: { name: 'c' } },
        b: { name: 'b' },
      },
      o => Object.assign(o.b!, { c: o.a?.c }),
    ],
    [
      {
        name: 'square',
        a: { name: 'a', c: { name: 'c' }, d: { name: 'd' } },
        b: { name: 'b' },
      },
      o => {
        Object.assign(o.b!, { c: o.a?.c, d: o.a?.d })
      },
    ],
    [
      {
        name: 'bush',
        a: {
          name: 'a',
          b: { name: 'b', g: { name: 'g' } },
          c: { name: 'c' },
          d: { name: 'd' },
          e: { name: 'e' },
          f: { name: 'f' },
        },
      },
      o => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.b!, { ...o.a, name: 'b' })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.c!, {
          ...o.a,
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          g: o.a?.b?.g!,
          name: 'c',
        })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.d!, {
          ...o.a,
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          g: o.a?.b?.g!,
          name: 'd',
        })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.e!, {
          ...o.a,
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          g: o.a?.b?.g!,
          name: 'e',
        })
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        Object.assign(o.a?.f!, {
          ...o.a,
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          g: o.a?.b?.g!,
          name: 'f',
        })
      },
    ],
    [
      {
        name: 'ring',
        a: {
          name: 'a',
          b: {
            name: 'b',
            c: {
              name: 'c',
              d: {
                name: 'd',
                e: {
                  name: 'e',
                  f: {
                    name: 'f',
                    g: { name: 'g', h: { name: 'h' } },
                  },
                },
              },
            },
          },
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain,@typescript-eslint/no-unnecessary-condition
      o => Object.assign(o?.a?.b?.c?.d?.e?.f?.g?.h!, { a: o.a }),
    ],
  ]

  for (const [o, link] of shapes) {
    link(o)
    type V = [string, string[], { [k: string]: string | undefined }]
    const visits: V[] = []
    type C = [string, string, string]
    const cycles: C[] = []
    t.test(o.name, async t => {
      const r = new Runner<O, string>({
        graph: [o],
        visit: (node, _, path, depResults) => {
          const v: V = [
            node.name,
            path.map(({ name }) => name),
            Object.fromEntries(
              [...depResults].map(([d, r]) => [d.name, r]),
            ),
          ]
          visits.push(v)
          return node.name
        },
        getDeps,
        onCycle: (node, cycle, path) => {
          cycles.push([
            node.name,
            path.map(c => c.name).join('->'),
            cycle.map(c => c.name).join('->'),
          ])
        },
      })
      await r.run()
      t.matchSnapshot(visits, 'visits')
      t.matchSnapshot(cycles, 'cycles')
    })
  }
})

t.test('race, any, allSettled', async t => {
  const options: RunnerOptionsSync<string, string> = {
    graph: ['a', 'd'],
    getDeps(s: string) {
      if (s === 'z') return ['a']
      if (s === 'y') return ['z', 'a']
      const cc = s.charCodeAt(0)
      return [
        String.fromCharCode(cc + 1),
        String.fromCharCode(cc + 2),
      ]
    },
    visit(node: string) {
      return node.toUpperCase()
    },
  }
  t.equal(await race<string, string>(options), 'Z')
  t.equal(raceSync(options), 'Z')
  t.equal(await any(options), 'Z')
  t.equal(anySync(options), 'Z')

  const throwOptions: typeof options = {
    ...options,
    visit: (s: string) => {
      if (s === 'w') return s.toUpperCase()
      throw new Error('glorp')
    },
  }
  t.equal(await any(throwOptions), 'W')
  t.equal(anySync(throwOptions), 'W')
  const allThrow: typeof options = {
    ...options,
    visit: () => {
      throw new Error('glorp')
    },
  }
  await t.rejects(any(allThrow), AggregateError)
  t.throws(() => anySync(allThrow), AggregateError)
  const settled = await allSettled(throwOptions)
  const settledSync = allSettledSync(throwOptions)
  t.strictSame(settled, settledSync)
  for (let i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); i++) {
    const c = String.fromCharCode(i)
    const res = settled.get(c)
    if (c === 'w')
      t.strictSame(res, { status: 'fulfilled', value: 'W' })
    else
      t.matchOnly(res, {
        status: 'rejected',
        reason: new Error('glorp'),
      })
  }

  await t.rejects(graphRun(throwOptions), {
    cause: { cause: new Error('glorp') },
  })
  t.throws(() => graphRunSync(throwOptions), {
    cause: { cause: new Error('glorp') },
  })

  const noFF = { ...throwOptions, failFast: false }
  await t.rejects(graphRun(noFF), AggregateError)
  t.throws(() => graphRunSync(noFF), AggregateError)
})

t.test('Runner.route()', async t => {
  const options: RunnerOptionsSync<string, string> = {
    graph: ['a', 'n', '?'],
    getDeps(s: string) {
      if (s === 'z' || s === 'm') return []
      if (s === 'l') return ['m']
      if (s === 'y') return ['z']
      if (s === '?') return ['?']
      const cc = s.charCodeAt(0)
      return [
        String.fromCharCode(cc + 1),
        String.fromCharCode(cc + 2),
      ]
    },
    visit(node: string) {
      return node.toUpperCase()
    },
  }
  const r = new Runner(options)
  await r.run()
  t.strictSame(r.route('n', 'w'), ['n', 'o', 'q', 's', 'u', 'w'])
  t.equal(r.route('x', '.'), undefined)
  t.equal(r.route('.', 'x'), undefined)
  t.equal(r.route('x', 'w'), undefined)
  t.equal(r.route('a', 'z'), undefined)
  t.equal(r.route('b', 'a'), undefined)
  t.strictSame(r.route('?', '?'), ['?', '?'])
})

t.test('entry points required', t => {
  const options: RunnerOptionsSync<string, string> = {
    // @ts-expect-error
    graph: [],
    getDeps(s: string) {
      if (s === 'z') return []
      if (s === 'y') return ['z']
      const cc = s.charCodeAt(0)
      return [
        String.fromCharCode(cc + 1),
        String.fromCharCode(cc + 2),
      ]
    },
    visit(node: string) {
      return node.toUpperCase()
    },
  }

  t.throws(() => new Runner(options), {
    message: 'no nodes provided to graph traversal',
  })
  t.end()
})

t.test('extreme async deadlock scenario', async t => {
  // based on the actual dep graph of node-tap
  const graph: Record<string, string[]> = {
    tap: [
      '@tapjs/after',
      '@tapjs/after-each',
      '@tapjs/asserts',
      '@tapjs/before',
      '@tapjs/before-each',
      '@tapjs/chdir',
      '@tapjs/core',
      '@tapjs/filter',
      '@tapjs/fixture',
      '@tapjs/intercept',
      '@tapjs/mock',
      '@tapjs/node-serialize',
      '@tapjs/run',
      '@tapjs/snapshot',
      '@tapjs/spawn',
      '@tapjs/stdin',
      '@tapjs/test',
      '@tapjs/typescript',
      '@tapjs/worker',
    ],
    '@tapjs/after': ['@tapjs/core'],
    '@tapjs/after-each': ['@tapjs/core'],
    '@tapjs/asserts': ['@tapjs/core'],
    '@tapjs/before': ['@tapjs/core'],
    '@tapjs/before-each': ['@tapjs/core'],
    '@tapjs/chdir': ['@tapjs/core'],
    '@tapjs/core': ['@tapjs/stack', '@tapjs/test'],
    '@tapjs/config': [],
    '@tapjs/filter': ['@tapjs/core'],
    '@tapjs/fixture': ['@tapjs/core'],
    '@tapjs/intercept': ['@tapjs/core'],
    '@tapjs/mock': ['@tapjs/core'],
    '@tapjs/node-serialize': ['@tapjs/core'],
    '@tapjs/run': [
      '@tapjs/core',
      '@tapjs/config',
      '@tapjs/after',
      '@tapjs/before',
      '@tapjs/config',
      '@tapjs/spawn',
      '@tapjs/stdin',
      '@tapjs/test',
    ],
    '@tapjs/snapshot': ['@tapjs/core'],
    '@tapjs/spawn': ['@tapjs/core'],
    '@tapjs/stdin': ['@tapjs/core'],
    '@tapjs/stack': [],
    '@tapjs/test': [
      '@tapjs/core',
      '@tapjs/config',
      '@tapjs/after',
      '@tapjs/after-each',
      '@tapjs/asserts',
      '@tapjs/before',
      '@tapjs/before-each',
      '@tapjs/chdir',
      '@tapjs/filter',
      '@tapjs/fixture',
      '@tapjs/intercept',
      '@tapjs/mock',
      '@tapjs/node-serialize',
      '@tapjs/snapshot',
      '@tapjs/spawn',
      '@tapjs/stdin',
      '@tapjs/typescript',
      '@tapjs/worker',
    ],
    '@tapjs/typescript': ['@tapjs/core'],
    '@tapjs/worker': ['@tapjs/core'],
  }

  const getDeps = (node: string) => graph[node] ?? []

  const visits: string[] = []

  const visit = async (node: string) => {
    await setTimeout()
    visits.push(node)
  }

  await graphRun({
    graph: ['tap'],
    getDeps,
    visit,
  })

  t.strictSame(
    new Set(visits.sort((a, b) => a.localeCompare(b, 'en'))),
    new Set(
      Object.keys(graph).sort((a, b) => a.localeCompare(b, 'en')),
    ),
    'visited all nodes',
  )
  t.equal(visits[visits.length - 1], 'tap', 'visited tap last')
})

/**
 * Helper to wait for a condition, with timeout protection.
 * Loops with `await setTimeout(0)` until predicate returns true.
 */
const waitFor = async (
  predicate: () => boolean,
  opts: { timeoutMs?: number; stepMs?: number } = {},
): Promise<void> => {
  const { timeoutMs = 5000, stepMs = 0 } = opts
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timeout exceeded')
    }
    await setTimeout(stepMs)
  }
}

t.test(
  'deterministic promise-level cycle detection (L480-484)',
  async t => {
    // Graph: A->X, B->X, X->C, C->A
    // Entry points: ['A', 'B']
    //
    // Goal: Force a promise-level waiting cycle that triggers #isWaitingFor().
    // - B starts X quickly
    // - X waits on C
    // - Gate A until X is waiting on C
    // - Gate C until A is waiting on X
    // - When C processes dep A, A is running and waiting on X (which waits on C)
    //   => #isWaitingFor(A, C) returns true => L480-484 execute
    const graph: Record<string, string[]> = {
      A: ['X'],
      B: ['X'],
      X: ['C'],
      C: ['A'],
    }

    const visits: string[] = []
    const cycles: [string, string[], string[]][] = []

    const runner = new Runner({
      graph: ['A', 'B'],
      getDeps: async n => {
        if (n === 'A') {
          // Wait until X is waiting on C
          await waitFor(
            () => runner.promiseWaiting.get('X')?.has('C') === true,
          )
        }
        if (n === 'C') {
          // Wait until A is waiting on X
          await waitFor(
            () => runner.promiseWaiting.get('A')?.has('X') === true,
          )
        }
        return graph[n] ?? []
      },
      visit: async n => {
        visits.push(n)
      },
      onCycle: async (n, cycle, path) => {
        cycles.push([n, cycle, path])
      },
    })

    await runner.run()

    // All 4 nodes visited
    t.equal(new Set(visits).size, 4, 'all nodes visited exactly once')
    t.ok(visits.includes('A'), 'visited A')
    t.ok(visits.includes('B'), 'visited B')
    t.ok(visits.includes('X'), 'visited X')
    t.ok(visits.includes('C'), 'visited C')

    // The promise-level cycle detection produces a 2-element cycle: [n, d]
    // where n is the node being skipped and d is the dependent.
    // We expect ['C', 'A'] (C was skipped because A is waiting for X which waits for C)
    const promiseCycle = cycles.find(
      ([, cycle]) => cycle.length === 2 && cycle[0] === 'C',
    )
    t.ok(
      promiseCycle,
      'promise-level cycle detected with 2-element cycle',
    )
    t.strictSame(
      promiseCycle?.[1],
      ['C', 'A'],
      'cycle is [C, A] from #isWaitingFor branch',
    )
  },
)

t.test('transitive promise-level cycle detection', async t => {
  // Graph: A->B->C->A (cycle via transitive waiting)
  // Entry points A and C start concurrently
  const graph: Record<string, string[]> = {
    A: ['B'],
    B: ['C'],
    C: ['A'],
  }

  const visits: string[] = []
  const cycles: [string, string[], string[]][] = []

  const runner = new Runner({
    graph: ['A', 'C'],
    getDeps: async n => {
      // Gate C until A starts walking (has promiseWaiting entry)
      if (n === 'C') {
        await waitFor(() => runner.promiseWaiting.has('A'))
      }
      return graph[n] ?? []
    },
    visit: async n => {
      visits.push(n)
    },
    onCycle: async (n, cycle, path) => {
      cycles.push([n, cycle, path])
    },
  })

  await runner.run()

  t.equal(visits.length, 3, 'all nodes visited')
  t.ok(cycles.length >= 1, 'detected cycle')
})

t.test('promise waiting is cleaned up after completion', async t => {
  const graph: Record<string, string[]> = {
    A: ['B'],
    B: [],
  }

  const runner = new Runner({
    graph: ['A'],
    getDeps: async n => graph[n] ?? [],
    visit: async () => {},
  })

  await runner.run()

  // After run completes, promiseWaiting should be empty
  t.equal(runner.promiseWaiting.size, 0, 'promiseWaiting cleaned up')
})

t.test('error identifier checking', t => {
  t.equal(
    isGraphRunError<unknown>(
      new Error('x', {
        cause: {
          code: 'GRAPHRUN_NO_NODES',
          found: [],
          wanted: '[first: Node, ...rest: Node[]]',
        },
      }),
    ),
    true,
  )
  t.equal(
    isGraphRunError<unknown>(
      new Error('x', {
        cause: {
          code: 'GRAPHRUN_TRAVERSAL',
          node: null,
          path: [],
          cause: {},
        },
      }),
    ),
    true,
  )
  t.equal(
    isGraphRunError<unknown>(
      new Error('x', {
        cause: {
          code: 'GRAPHRUN_CYCLE_WITHOUT_PATH',
        },
      }),
    ),
    true,
  )
  t.equal(isGraphRunError<unknown>(new Error('x')), false)
  t.equal(isGraphRunError<unknown>(null), false)
  t.end()
})
